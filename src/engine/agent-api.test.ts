import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterOpportunities, opportunityMatchesRule, simulateRate } from "./agent-api";
import type { AlertRule } from "./alert-store";
import type { Opportunity } from "hettnet-core";

function opp(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    type: "lending",
    venue: "hypercore",
    layer: "core",
    assets: [{ symbol: "USDC (HyperCore)", id: "core:0" }],
    apyTotal: 0.04,
    apyBase: 0.04,
    apyIncentive: 0,
    apr: null,
    tvl: 8_000_000,
    supplied: 10_000_000,
    borrowed: 7_500_000,
    utilization: 0.75,
    volume24h: null,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: false,
    depthUsd: null,
    oraclePx: 1,
    ilClass: null,
    risks: [],
    source: "test",
    url: null,
    verified: true,
    fetchedAt: 1,
    stale: false,
    signal: { indication: "ENTER", reasons: ["Verified HyperCore supply APY."], alerts: [] },
    ...partial,
  };
}

describe("filterOpportunities", () => {
  const rows = [
    opp({ id: "hypercore:lend:0" }),
    opp({
      id: "hyperlend:usdc",
      venue: "hyperlend",
      layer: "evm",
      assets: [{ symbol: "USDC", id: "0xb883" }],
      signal: { indication: "WATCH", reasons: ["Near kink."], alerts: ["kink-proximity"] },
    }),
  ];

  it("filters by venue and indication", () => {
    const out = filterOpportunities(rows, { venue: "hypercore", indication: "ENTER" });
    assert.equal(out.length, 1);
    assert.equal(out[0]?.id, "hypercore:lend:0");
  });

  it("filters by minApy", () => {
    const out = filterOpportunities(rows, { minApy: 0.1 });
    assert.equal(out.length, 0);
  });

  it("caps the page size", () => {
    const many = Array.from({ length: 40 }, (_, i) => opp({ id: `row:${i}` }));
    assert.equal(filterOpportunities(many, { limit: 10 }).length, 10);
  });
});

describe("simulateRate", () => {
  it("uses the documented HyperCore kink model", () => {
    const data = simulateRate({
      totalSupplied: 100,
      totalBorrowed: 75,
      additionalSupply: 10,
    });
    assert.equal("error" in data, false);
    if ("error" in data) return;
    assert.equal(data.simulation.crossedKink, false);
    assert.ok(data.simulation.nextSupplyApy < data.simulation.currentSupplyApy);
  });

  it("rejects incomplete totals", () => {
    const data = simulateRate({ additionalSupply: 1 });
    assert.equal("error" in data, true);
  });
});

describe("opportunityMatchesRule", () => {
  const rule: AlertRule = {
    id: "alert:1",
    name: "USDC ENTER",
    venue: "hypercore",
    indication: "ENTER",
    asset: "USDC",
    minApy: 0.03,
    minTvl: 1_000,
    webhookUrl: null,
    createdAt: 1,
  };

  it("matches a HyperCore USDC ENTER print", () => {
    assert.equal(opportunityMatchesRule(opp({ id: "hypercore:lend:0" }), rule), true);
  });

  it("skips a WATCH print", () => {
    assert.equal(
      opportunityMatchesRule(
        opp({
          id: "hypercore:lend:0",
          signal: { indication: "WATCH", reasons: ["kink"], alerts: [] },
        }),
        rule,
      ),
      false,
    );
  });
});
