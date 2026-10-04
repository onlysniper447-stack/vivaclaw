import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CIRCLE_USDC, WHYPE_ADDRESS } from "hettnet-core";
import { dailyEarn, earnedFromApr, YEAR_MS } from "../lib/accrual";
import { claimPool, defaultPrincipal, earnedAmount, enterPool, withdrawPool, type StoredPosition } from "./positions";

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
  it("does not enter a pool that has not been printed", () => {
    const result = enterPool("missing-pool");
    assert.equal(result.ok, false);
    assert.equal(result.dryRun, true);
    assert.match(result.error ?? "", /yields first/);
  });

  it("does not claim or withdraw a missing position", () => {
    assert.equal(claimPool("pos:missing").ok, false);
    assert.equal(withdrawPool("pos:missing").ok, false);
  });
});
