import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ilClass } from "./il";

describe("impermanent-loss class", () => {
  it("labels stable/stable pairs", () => {
    assert.equal(ilClass(["USDC", "USDT0"]), "stable-stable");
    assert.equal(ilClass(["USDH", "USDe"]), "stable-stable");
  });

  it("labels HYPE LST pairs as correlated", () => {
    assert.equal(ilClass(["WHYPE", "kHYPE"]), "correlated");
    assert.equal(ilClass(["HYPE", "wstHYPE"]), "correlated");
    assert.equal(ilClass(["beHYPE", "WHYPE"]), "correlated");
  });

  it("labels mixed books as volatile", () => {
    assert.equal(ilClass(["WHYPE", "USDC"]), "volatile");
    assert.equal(ilClass(["UBTC", "WHYPE"]), "volatile");
  });
});
