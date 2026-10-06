import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEnterYield, planColumnAction, type YieldPlanRow } from "./yield-plan";

function row(partial: Partial<YieldPlanRow> = {}): YieldPlanRow {
  return { indication: "ENTER", quality: "ok", apyBps: 115, ...partial };
}

describe("AVOID plan column", () => {
  it("never shows ENTER for an AVOID indication", () => {
    const avoid = row({ indication: "AVOID", apyBps: 0 });
    assert.equal(planColumnAction(avoid, false), "none");
    assert.equal(canEnterYield(avoid), false);
  });

  it("does not enable ENTER when an AVOID row has a positive APY", () => {
    const avoid = row({ indication: "AVOID", quality: "ok", apyBps: 1_200 });
    assert.equal(planColumnAction(avoid, false), "none");
    assert.equal(canEnterYield(avoid), false);
  });

  it("offers ENTER for a usable ENTER indication", () => {
    const enter = row({ indication: "ENTER" });
    assert.equal(planColumnAction(enter, false), "enter");
    assert.equal(canEnterYield(enter), true);
  });

  it("offers ENTER for a usable WATCH indication", () => {
    const watch = row({ indication: "WATCH" });
    assert.equal(planColumnAction(watch, false), "enter");
    assert.equal(canEnterYield(watch), true);
  });

  it("never labels an AVOID row ENTER even if a position is already open", () => {
    const avoid = row({ indication: "AVOID", apyBps: 1_200 });
    assert.equal(planColumnAction(avoid, true), "open");
    assert.equal(canEnterYield(avoid), false);
  });
});
