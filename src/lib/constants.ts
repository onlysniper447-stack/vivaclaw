import { PublicKey } from "@solana/web3.js";
import type { TokenRef } from "@/types";

export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export const TOKENS = {
  SOL: {
    symbol: "SOL",
    mint: NATIVE_SOL_MINT,
    decimals: 9,
  },
  USDC: {
    symbol: "USDC",
    mint: USDC_MINT,
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    mint: USDT_MINT,
    decimals: 6,
  },
} as const satisfies Record<string, TokenRef>;

export const TOKEN_PUBKEYS = {
  SOL: new PublicKey(NATIVE_SOL_MINT),
  USDC: new PublicKey(USDC_MINT),
  USDT: new PublicKey(USDT_MINT),
} as const;

/** Kamino Lend main market (mainnet). */
export const KAMINO_MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

/** Meteora Dynamic Vault program. */
export const METEORA_VAULT_PROGRAM_ID = "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi";

/**
 * Pyth Hermes price-feed IDs (hex, no 0x prefix in some SDKs — we keep 0x).
 * @see https://www.pyth.network/developers/price-feed-ids
 */
export const PYTH_PRICE_IDS = {
  SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  USDC_USD: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT_USD: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
} as const;

export const BPS_DENOMINATOR = 10_000;
export const LAMPORTS_PER_SOL = 1_000_000_000;

/** |ΔAPY| trigger: 3.5% = 350 bps. */
export const YIELD_DELTA_TRIGGER_BPS = 350;

/** USDC/USDT peg band: ±0.50% = 50 bps. */
export const PEG_MAX_DEVIATION_BPS = 50;

export const DEFAULT_SCAN_ASSETS: TokenRef[] = [TOKENS.SOL, TOKENS.USDC];
