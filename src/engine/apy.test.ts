import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveIndexedApy } from "./YieldSensor";

describe("resolveIndexedApy", () => {
  it("keeps a positive indexed print", () => {
    assert.equal(resolveIndexedApy(0.085, 0.12), 0.085);
  });

  it("falls back when the index prints 0", () => {
    assert.equal(resolveIndexedApy(0, 0.09), 0.09);
  });

  it("falls back when the index is missing", () => {
    assert.equal(resolveIndexedApy(null, 0.09), 0.09);
  });

  it("returns 0 when neither print is usable", () => {
    assert.equal(resolveIndexedApy(0, 0), 0);
    assert.equal(resolveIndexedApy(null, 0), 0);
  });
});
