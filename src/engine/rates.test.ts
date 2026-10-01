import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aprFromApy, apyFromApr, ratesFromApr, ratesFromApy, toBps } from "./rates";

describe("APR and APY", () => {
  it("compounds a 10% APR into a slightly higher APY", () => {
    const apy = apyFromApr(0.1);
    assert.ok(apy > 0.104 && apy < 0.106);
    assert.equal(apyFromApr(0), 0);
    assert.equal(aprFromApy(0), 0);
  });

  it("round-trips APR through APY", () => {
    const apr = 0.12;
    const back = aprFromApy(apyFromApr(apr));
    assert.ok(Math.abs(back - apr) < 1e-10);
  });

  it("fills both bps fields from a simple APR", () => {
    const rates = ratesFromApr(0.05);
    assert.equal(rates.aprBps, 500);
    assert.ok(rates.apyBps > 500 && rates.apyBps < 520);
  });

  it("derives APR from a lend APY print", () => {
    const rates = ratesFromApy(0.085);
    assert.equal(rates.apyBps, 850);
    assert.ok(rates.aprBps > 800 && rates.aprBps < 850);
    assert.equal(toBps(0), 0);
  });
});
