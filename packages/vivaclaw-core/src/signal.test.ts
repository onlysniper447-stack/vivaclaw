import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CL_RANGE_CAVEAT } from "./il";
import { collectAlerts, scoreOpportunity } from "./signal";
import type { Opportunity } from "./types";

function opp(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    type: "lending",
    venue: "hyperlend",
    layer: "evm",
    assets: [{ symbol: "USDC", id: "0xb883" }],
    apyTotal: 0.05,
    apyBase: 0.05,
    apyIncentive: 0,
    apr: null,
    tvl: 8_000_000,
    utilization: 0.5,
    volume24h: null,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: false,
    depthUsd: null,
    oraclePx: null,
    ilClass: null,
    risks: [],
    source: "test",
    url: null,
    verified: true,
    fetchedAt: 1,
    stale: false,
    ...partial,
  };
}

describe("scoreOpportunity", () => {
  it("marks verified HyperLend with a usable APY as ENTER", () => {
    const signal = scoreOpportunity(opp({ id: "hl:usdc" }));
    assert.equal(signal.indication, "ENTER");
    assert.match(signal.reasons[0] ?? "", /Verified venue print/);
    assert.equal(signal.alerts.length, 0);
  });

  it("marks HyperCore supply away from the kink as ENTER", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hypercore:lend:150",
        venue: "hypercore",
        layer: "core",
        assets: [{ symbol: "USDT0", id: "core:150" }],
        apyTotal: 0.04,
        utilization: 0.4,
        verified: true,
      }),
    );
    assert.equal(signal.indication, "ENTER");
    assert.match(signal.reasons[0] ?? "", /HyperCore/);
  });

  it("marks HyperCore USDC near the kink as WATCH with a kink-proximity alert", () => {
    const row = opp({
      id: "hypercore:lend:0",
      venue: "hypercore",
      layer: "core",
      assets: [{ symbol: "USDC (HyperCore)", id: "core:0" }],
      apyTotal: 0.0341,
      utilization: 0.758,
      verified: true,
      risks: ["kink-proximity", "hypercore-usdc-is-not-circle-usdc"],
    });
    const signal = scoreOpportunity(row);
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.alerts.includes("kink-proximity"));
    assert.ok(signal.reasons.some((reason) => reason.includes("kink")));
    assert.ok(signal.reasons.some((reason) => reason.includes("not Circle USDC")));
  });

  it("marks HyperCore collateral with no interest as AVOID", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hypercore:lend:268",
        venue: "hypercore",
        layer: "core",
        assets: [{ symbol: "HYPE", id: "core:268" }],
        apyTotal: 0,
        apyBase: 0,
        utilization: 0,
        risks: ["collateral-no-interest", "zero-print"],
      }),
    );
    assert.equal(signal.indication, "AVOID");
    assert.ok(signal.reasons.some((reason) => reason.includes("no interest")));
  });

  it("marks a paused reserve as AVOID", () => {
    const signal = scoreOpportunity(opp({ id: "hl:paused", paused: true, risks: ["reserve-paused-or-frozen"] }));
    assert.equal(signal.indication, "AVOID");
    assert.ok(signal.alerts.includes("paused"));
  });

  it("marks a missing lend APY as AVOID", () => {
    const signal = scoreOpportunity(opp({ id: "hl:empty", apyTotal: null, apyBase: null }));
    assert.equal(signal.indication, "AVOID");
  });

  it("marks thin-TVL high APY as AVOID", () => {
    const signal = scoreOpportunity(
      opp({
        id: "px:thin",
        type: "lp",
        venue: "projectx",
        apyTotal: 1.2,
        apyBase: 1.2,
        tvl: 800,
        ilClass: "volatile",
        risks: ["project-x-no-protocol-docs"],
        verified: false,
      }),
    );
    assert.equal(signal.indication, "AVOID");
    assert.ok(signal.alerts.includes("apy-outlier"));
  });

  it("marks a 24h-only fee APY as WATCH", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hs:24h",
        type: "lp",
        venue: "hyperswap",
        apyTotal: 0.08,
        apyBase: 0.08,
        tvl: 200_000,
        ilClass: "stable-stable",
        verified: false,
        risks: ["fee-apr-24h-only"],
      }),
    );
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.reasons.some((reason) => reason.includes("24h")));
  });

  it("marks volatile concentrated LP as WATCH even with deep TVL", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hs:vol",
        type: "lp",
        venue: "hyperswap",
        assets: [
          { symbol: "WHYPE", id: "0x5555" },
          { symbol: "UBTC", id: "0x9fdb" },
        ],
        apyTotal: 0.42,
        apyBase: 0.42,
        tvl: 2_900_000,
        ilClass: "volatile",
        verified: false,
        risks: [CL_RANGE_CAVEAT],
      }),
    );
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.reasons.some((reason) => reason.toLowerCase().includes("volatile")));
  });

  it("marks a stable-stable LP with 7d fee APY as ENTER", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hs:stable",
        type: "lp",
        venue: "hyperswap",
        assets: [
          { symbol: "USDC", id: "0xb883" },
          { symbol: "USDT0", id: "0xb8ce" },
        ],
        apyTotal: 0.06,
        apyBase: 0.06,
        tvl: 400_000,
        ilClass: "stable-stable",
        verified: false,
        risks: [],
      }),
    );
    assert.equal(signal.indication, "ENTER");
  });

  it("marks incentive-heavy prints as WATCH", () => {
    const signal = scoreOpportunity(
      opp({
        id: "hl:inc",
        apyTotal: 0.14,
        apyBase: 0.02,
        apyIncentive: 0.12,
      }),
    );
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.reasons.some((reason) => reason.includes("Incentive")));
  });

  it("marks unverified lending as WATCH", () => {
    const signal = scoreOpportunity(opp({ id: "hl:unv", verified: false }));
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.reasons.some((reason) => reason.includes("discovery-only")));
  });

  it("marks Kittenswap with no fee APR as WATCH", () => {
    const signal = scoreOpportunity(
      opp({
        id: "kit:1",
        type: "lp",
        venue: "kittenswap",
        apyTotal: null,
        apyBase: null,
        tvl: 80_000,
        ilClass: "volatile",
        verified: false,
        risks: ["fee-apr-unavailable", CL_RANGE_CAVEAT],
      }),
    );
    assert.equal(signal.indication, "WATCH");
    assert.ok(signal.reasons.some((reason) => reason.includes("Fee APR is unavailable")));
  });
});

describe("collectAlerts", () => {
  it("surfaces kink-proximity as a scan alert", () => {
    const row = opp({
      id: "hypercore:lend:0",
      venue: "hypercore",
      risks: ["kink-proximity"],
      signal: scoreOpportunity(
        opp({
          id: "hypercore:lend:0",
          venue: "hypercore",
          risks: ["kink-proximity"],
        }),
      ),
    });
    const alerts = collectAlerts([row]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.kind, "kink-proximity");
    assert.match(alerts[0]?.message ?? "", /kink/);
  });
});
