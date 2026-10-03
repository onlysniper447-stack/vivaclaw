import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAsset, gapStatusLabel } from "./classify";

const TRIGGER = 350;

describe("classifyAsset", () => {
  it("does not invent a gap when Meteora is missing", () => {
    const result = classifyAsset(null, 869, TRIGGER);
    assert.equal(result.status, "no-pool");
    assert.equal(result.gap, null);
    assert.equal(gapStatusLabel(result.status), "Not comparable");
  });

  it("treats exactly 0.00% as suspect", () => {
    const result = classifyAsset(0, 448, TRIGGER);
    assert.equal(result.status, "suspect");
    assert.equal(result.gap, null);
    assert.equal(gapStatusLabel(result.status), "Check data");
  });

  it("keeps a small negative gap and does not call it above the trigger", () => {
    const result = classifyAsset(200, 300, TRIGGER);
    assert.equal(result.status, "below");
    assert.equal(result.gap, -100);
    assert.equal(gapStatusLabel(result.status), "Below trigger");
  });

  it("treats a large negative gap as above the trigger and names the leader", () => {
    const result = classifyAsset(100, 900, TRIGGER);
    assert.equal(result.status, "above");
    assert.equal(result.gap, -800);
    assert.match(result.reason ?? "", /Kamino leads/);
  });

  it("includes a gap of exactly 3.5%", () => {
    const result = classifyAsset(850, 500, TRIGGER);
    assert.equal(result.status, "above");
    assert.equal(result.gap, 350);
  });

  it("marks a gap above 3.5%", () => {
    const result = classifyAsset(900, 500, TRIGGER);
    assert.equal(result.status, "above");
    assert.equal(result.gap, 400);
    assert.equal(result.unusual, false);
  });

  it("returns no gap when both rates are missing", () => {
    const result = classifyAsset(null, null, TRIGGER);
    assert.equal(result.status, "no-pool");
    assert.equal(result.gap, null);
    assert.match(result.reason ?? "", /Neither venue/);
  });

  it("flags extreme venue rates without turning them into a fake spread", () => {
    const extreme = classifyAsset(8_080, 500, TRIGGER);
    assert.equal(extreme.status, "above");
    assert.equal(extreme.gap, 7_580);
    assert.equal(extreme.unusual, true);
    assert.match(extreme.unusualReason ?? "", /Unusually high/);

    const ratio = classifyAsset(1_000, 100, TRIGGER, { ceilingBps: 50_000, ratio: 5 });
    assert.equal(ratio.unusual, true);
    assert.equal(ratio.gap, 900);
  });

  it("does not compare NaN", () => {
    const result = classifyAsset(Number.NaN, 400, TRIGGER);
    assert.equal(result.status, "error");
    assert.equal(result.gap, null);
    assert.equal(gapStatusLabel(result.status), "Check data");
  });

  it("does not compare Infinity", () => {
    const result = classifyAsset(Number.POSITIVE_INFINITY, 400, TRIGGER);
    assert.equal(result.status, "error");
    assert.equal(result.gap, null);
  });
});
