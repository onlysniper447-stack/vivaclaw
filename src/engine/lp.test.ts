import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NATIVE_SOL_MINT, USDC_MINT, USDT_MINT } from "../lib/constants";
import { venueFamily, venueLabel } from "../lib/venues";
import {
  annualizeDailyRatio,
  isGoodHighReturn,
  isUsdcUsdtPair,
  isWatchedPair,
  LP_MAX_APR_BPS,
  LP_MIN_APR_BPS,
  meteoraDecimalApy,
  pairSymbol,
  percentToDecimal,
  primaryMint,
  selectBestLps,
  type LpCandidate,
} from "./sensors/lp";

function candidate(partial: Partial<LpCandidate> & Pick<LpCandidate, "address" | "apr">): LpCandidate {
  return {
    venue: "orca",
    mintA: NATIVE_SOL_MINT,
    mintB: USDC_MINT,
    tvlUsd: 2_000_000,
    volume24h: 500_000,
    ...partial,
  };
}

describe("LP pair helpers", () => {
  it("accepts SOL and stable pairs in either mint order", () => {
    assert.equal(isWatchedPair(NATIVE_SOL_MINT, USDC_MINT), true);
    assert.equal(isWatchedPair(USDC_MINT, NATIVE_SOL_MINT), true);
    assert.equal(isUsdcUsdtPair(USDT_MINT, USDC_MINT), true);
    assert.equal(isWatchedPair(USDC_MINT, USDC_MINT), false);
    assert.equal(isWatchedPair(USDC_MINT, "SoRandomMint1111111111111111111111111111111"), false);
  });

  it("names the pair with SOL first", () => {
    assert.equal(pairSymbol(USDC_MINT, NATIVE_SOL_MINT), "SOL/USDC");
    assert.equal(pairSymbol(USDT_MINT, USDC_MINT), "USDC/USDT");
    assert.equal(primaryMint(USDC_MINT, NATIVE_SOL_MINT), NATIVE_SOL_MINT);
  });
});

describe("LP APY math", () => {
  it("annualizes Meteora 24h fees over TVL as a decimal APY", () => {
    const apy = meteoraDecimalApy(4.325, 252_316.9);
    assert.ok(apy > 0.005 && apy < 0.008);
    assert.equal(meteoraDecimalApy(0, 100_000), 0);
  });

  it("treats Raydium apr as a percent", () => {
    assert.equal(percentToDecimal(12.5), 0.125);
  });

  it("annualizes Orca 24h yieldOverTvl", () => {
    const apy = annualizeDailyRatio(0.00015138);
    assert.ok(apy > 0.05 && apy < 0.06);
  });
});

describe("high-return LP quality bar", () => {
  it("keeps a deep, active pool at or above 3%", () => {
    assert.equal(
      isGoodHighReturn(candidate({ address: "good", apr: LP_MIN_APR_BPS / 10_000 })),
      true,
    );
  });

  it("drops thin books, quiet books, weak yield, and junk prints", () => {
    assert.equal(isGoodHighReturn(candidate({ address: "thin", apr: 0.12, tvlUsd: 20_000 })), false);
    assert.equal(isGoodHighReturn(candidate({ address: "quiet", apr: 0.12, volume24h: 1_000 })), false);
    assert.equal(isGoodHighReturn(candidate({ address: "weak", apr: 0.01 })), false);
    assert.equal(isGoodHighReturn(candidate({ address: "deep-sol", apr: 0.71 })), true);
    assert.equal(isGoodHighReturn(candidate({ address: "junk", apr: (LP_MAX_APR_BPS + 1) / 10_000 })), false);
  });

  it("ranks by APY and keeps a short list of the best venues", () => {
    const picked = selectBestLps([
      candidate({ address: "low", venue: "orca", apr: 0.04 }),
      candidate({ address: "mid", venue: "raydium", apr: 0.08 }),
      candidate({ address: "top", venue: "meteora-dlmm", apr: 0.18 }),
      candidate({ address: "also-orca", venue: "orca", apr: 0.11 }),
      candidate({ address: "third-orca", venue: "orca", apr: 0.1 }),
      candidate({ address: "thin-high", venue: "raydium", apr: 0.25, tvlUsd: 1_000 }),
    ]);
    assert.deepEqual(
      picked.map((row) => row.address),
      ["top", "also-orca", "third-orca", "mid"],
    );
  });

  it("labels LP venues without mixing them into lend", () => {
    assert.equal(venueFamily("kamino"), "lend");
    assert.equal(venueFamily("raydium"), "lp");
    assert.equal(venueFamily("meteora-damm"), "lp");
    assert.equal(venueLabel("orca"), "Orca");
    assert.equal(venueLabel("meteora-damm"), "Meteora DAMM");
  });
});
