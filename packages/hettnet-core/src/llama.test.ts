import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { llamaPercentToDecimal, mapLlamaPool, parseFeeTier } from "./llama";

describe("Llama percent mapping", () => {
  it("treats 56 as 56%, not 5600%", () => {
    assert.equal(llamaPercentToDecimal(56), 0.56);
    assert.ok(Math.abs((llamaPercentToDecimal(3.69512) ?? 0) - 0.0369512) < 1e-12);
    assert.equal(llamaPercentToDecimal(null), null);
  });

  it("prefers 7d fee APY over 24h for LPs", () => {
    const opp = mapLlamaPool({
      project: "hyperswap-v3",
      symbol: "WHYPE-UBTC",
      apy: 0.68214,
      apyBase: 0.68214,
      apyBase7d: 42.42685,
      apyReward: null,
      tvlUsd: 2_971_403,
      volumeUsd7d: 8_059_093,
      poolMeta: "0.3%",
      pool: "abc",
      underlyingTokens: ["0x5555", "0x9fdb"],
    });
    assert.ok(opp);
    assert.equal(opp.venue, "hyperswap");
    assert.equal(opp.type, "lp");
    assert.ok(Math.abs((opp.apyBase ?? 0) - 0.4242685) < 1e-9);
    assert.equal(opp.apr, null);
    assert.equal(opp.feeTier, 0.003);
    assert.equal(opp.ilClass, "volatile");
    assert.equal(opp.risks.includes("fee-apr-24h-only"), false);
    assert.ok(opp.risks.some((r) => r.includes("in range")));
  });

  it("marks 24h-only fee APY when 7d is missing", () => {
    const opp = mapLlamaPool({
      project: "project-x",
      symbol: "WHYPE-USDC",
      apy: 0.26187,
      apyBase: 0.26187,
      poolMeta: "0.05%",
      pool: "px",
      underlyingTokens: ["0x5555", "0xb883"],
    });
    assert.ok(opp);
    assert.ok(opp.risks.includes("fee-apr-24h-only"));
    assert.ok(opp.risks.includes("project-x-no-protocol-docs"));
    assert.equal(opp.apr, null);
  });

  it("does not invent APR for lending prints", () => {
    const opp = mapLlamaPool({
      project: "hyperlend-pooled",
      symbol: "USDC",
      apy: 3.69512,
      apyBase: 3.69512,
      tvlUsd: 8_134_880,
      pool: "hl-usdc",
      underlyingTokens: ["0xb88339CB7199b77E23DB6E890353E22632Ba630f"],
    });
    assert.ok(opp);
    assert.equal(opp.apr, null);
    assert.ok(Math.abs((opp.apyTotal ?? 0) - 0.0369512) < 1e-9);
  });
});

describe("parseFeeTier", () => {
  it("reads Llama poolMeta percents", () => {
    assert.equal(parseFeeTier("0.3%"), 0.003);
    assert.equal(parseFeeTier("0.05%"), 0.0005);
    assert.ok(Math.abs((parseFeeTier("CL 0.14%") ?? 0) - 0.0014) < 1e-12);
    assert.equal(parseFeeTier("Dynamic-fee CL"), null);
  });
});
