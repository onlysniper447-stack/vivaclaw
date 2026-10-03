import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STABLE_BASE_APY,
  STABLE_KINK,
  borrowApy,
  nearKink,
  simulateSupplyApy,
  supplyApy,
} from "./rate-model";

describe("HyperCore stablecoin rate model", () => {
  it("matches the Phase 0 USDC snapshot (util 0.752, supply 0.03384)", () => {
    const util = 0.752;
    assert.equal(borrowApy(util), 0.05);
    assert.ok(Math.abs(supplyApy(util) - 0.03384) < 1e-12);
    assert.equal(supplyApy(util), 0.05 * util * 0.9);
  });

  it("matches the live USDC print (util 0.7603084535, supply 0.0342138804)", () => {
    const util = 0.7603084535;
    assert.equal(borrowApy(util), STABLE_BASE_APY);
    assert.ok(Math.abs(supplyApy(util) - 0.0342138804075) < 1e-12);
  });

  it("stays at the 5% base at the 80% kink", () => {
    assert.equal(borrowApy(STABLE_KINK), 0.05);
    assert.equal(supplyApy(STABLE_KINK), 0.05 * 0.8 * 0.9);
  });

  it("applies the 4.75 slope above the kink", () => {
    const util = 0.85;
    const expectedBorrow = 0.05 + 4.75 * (util - 0.8);
    assert.ok(Math.abs(borrowApy(util) - expectedBorrow) < 1e-12);
    assert.ok(Math.abs(supplyApy(util) - expectedBorrow * util * 0.9) < 1e-12);
  });

  it("returns 0 supply APY at 0 utilization", () => {
    assert.equal(supplyApy(0), 0);
    assert.equal(borrowApy(0), 0.05);
  });

  it("flags kink proximity inside the 5pp band", () => {
    assert.equal(nearKink(0.74), false);
    assert.equal(nearKink(0.75), true);
    assert.equal(nearKink(0.8), true);
    assert.equal(nearKink(0.84), true);
    assert.equal(nearKink(0.86), false);
  });

  it("simulateSupplyApy warns when additional supply crosses the kink", () => {
    const sim = simulateSupplyApy({
      totalSupplied: 100,
      totalBorrowed: 82,
      additionalSupply: 10,
    });
    assert.ok(sim.currentUtilization > STABLE_KINK);
    assert.ok(sim.nextUtilization < STABLE_KINK);
    assert.equal(sim.crossedKink, true);
    assert.equal(sim.nearKink, true);
    assert.ok(sim.warnings.length > 0);
    assert.ok(sim.nextSupplyApy < sim.currentSupplyApy);
  });

  it("simulateSupplyApy is unchanged when additional supply is 0", () => {
    const sim = simulateSupplyApy({
      totalSupplied: 526_031_336.5128333569,
      totalBorrowed: 399_946_071.9520007372,
      additionalSupply: 0,
    });
    assert.ok(Math.abs(sim.currentUtilization - sim.nextUtilization) < 1e-12);
    assert.equal(sim.currentSupplyApy, sim.nextSupplyApy);
    assert.equal(sim.crossedKink, false);
  });
});
