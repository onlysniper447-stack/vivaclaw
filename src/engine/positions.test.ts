import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { CIRCLE_USDC, WHYPE_ADDRESS, type Opportunity } from "hettnet-core";
import { dailyEarn, earnedFromApr, YEAR_MS } from "../lib/accrual";
import { resetOpportunitySnapshot, setOpportunitySnapshot } from "./opportunity-store";
import {
  claimPool,
  defaultPrincipal,
  earnedAmount,
  enterPool,
  listActions,
  listPositions,
  withdrawPool,
  type StoredPosition,
} from "./positions";

const offline = async () => undefined;

function printed(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    type: "lending",
    venue: "hypercore",
    layer: "core",
    assets: [{ symbol: "USDC", id: CIRCLE_USDC }],
    apyTotal: 0.05,
    apyBase: 0.05,
    apyIncentive: 0,
    apr: 0.048,
    tvl: 1_000_000,
    utilization: 0.4,
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
    signal: { indication: "ENTER", reasons: ["Verified venue print."], alerts: [] },
    ...partial,
  };
}

function openPosition(partial: Partial<StoredPosition> = {}): StoredPosition {
  const now = 1_700_000_000_000;
  return {
    id: "pos:test",
    poolId: "hypercore:usdc",
    venue: "hypercore",
    family: "lend",
    symbol: "USDC",
    mint: CIRCLE_USDC,
    unit: "USDC",
    venueAddress: "reserve",
    aprBps: 1_000,
    apyBps: 1_052,
    principal: 1_000,
    claimed: 0,
    enteredAt: now,
    accruedAt: now,
    status: "open",
    closedAt: null,
    exitAmount: null,
    ...partial,
  };
}

describe("simulated pool size", () => {
  it("uses 0.01 HYPE and 1,000 stables", () => {
    assert.deepEqual(defaultPrincipal("HYPE", WHYPE_ADDRESS), { amount: 0.01, unit: "HYPE" });
    assert.deepEqual(defaultPrincipal("HYPE/USDC", WHYPE_ADDRESS), { amount: 0.01, unit: "HYPE" });
    assert.deepEqual(defaultPrincipal("USDC", CIRCLE_USDC), { amount: 1_000, unit: "USDC" });
  });
});

describe("earned yield", () => {
  it("accrues 10% APR on 1,000 over a year", () => {
    assert.equal(earnedFromApr(1_000, 1_000, YEAR_MS), 100);
    assert.ok(Math.abs(dailyEarn(1_000, 1_000) - 100 / 365) < 1e-10);
  });

  it("returns 0 on a closed pool", () => {
    const closed = openPosition({ status: "closed", closedAt: 1_700_000_000_000 });
    assert.equal(earnedAmount(closed, closed.enteredAt + YEAR_MS), 0);
  });

  it("accrues from the last claim time", () => {
    const row = openPosition({ accruedAt: 1_700_000_000_000 });
    assert.equal(earnedAmount(row, row.accruedAt + YEAR_MS), 100);
  });
});

describe("enter claim withdraw", () => {
  beforeEach(() => {
    resetOpportunitySnapshot();
    listPositions().splice(0, listPositions().length);
    listActions().splice(0, listActions().length);
  });

  it("does not enter a pool that has not been printed", async () => {
    const result = await enterPool("missing-pool", offline);
    assert.equal(result.ok, false);
    assert.equal(result.dryRun, true);
    assert.match(result.error ?? "", /not in the current yield list/);
    assert.equal(/yields first/i.test(result.error ?? ""), false);
  });

  it("refuses ENTER on an AVOID print even with a usable APY", async () => {
    setOpportunitySnapshot(
      [
        printed({
          id: "avoid-pool",
          apyTotal: 0.12,
          signal: { indication: "AVOID", reasons: ["Paused reserve."], alerts: ["paused"] },
        }),
      ],
      1,
      [],
    );
    const result = await enterPool("avoid-pool", offline);
    assert.equal(result.ok, false);
    assert.equal(result.dryRun, true);
    assert.match(result.error ?? "", /AVOID|Paused/i);
    assert.equal(listPositions().length, 0);
  });

  it("enters from the stored yield record without asking to reload", async () => {
    setOpportunitySnapshot([printed({ id: "enter-pool" })], 1, []);
    const result = await enterPool("enter-pool", offline);
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.position?.poolId, "enter-pool");
    assert.equal(/yields first/i.test(result.error ?? ""), false);
  });

  it("does not claim or withdraw a missing position", () => {
    assert.equal(claimPool("pos:missing").ok, false);
    assert.equal(withdrawPool("pos:missing").ok, false);
  });
});
