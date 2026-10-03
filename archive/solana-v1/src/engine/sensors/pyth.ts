import { getServerEnv } from "@/lib/env";
import { PYTH_PRICE_IDS } from "@/lib/constants";
import { fetchHermesPricePrints } from "@/lib/pyth/hermes";
import type { OraclePrice } from "@/types";

export async function fetchOraclePrices(
  ids: readonly string[] = Object.values(PYTH_PRICE_IDS),
): Promise<OraclePrice[]> {
  const env = getServerEnv();
  const prints = await fetchHermesPricePrints(ids);
  const now = Date.now();
  return prints.map((print) => ({
    symbol: print.symbol,
    priceId: print.priceId,
    price: print.price,
    confidence: print.confidence,
    expo: print.expo,
    publishTime: print.publishTime,
    stale: now - print.publishTime * 1000 > env.ORACLE_MAX_STALENESS_MS,
  }));
}

export function requireFreshPrice(prices: OraclePrice[], symbol: string): OraclePrice {
  const match = prices.find((p) => p.symbol === symbol || p.symbol.includes(symbol));
  if (!match) {
    throw new Error(`Missing Pyth feed for ${symbol}`);
  }
  if (match.stale) {
    throw new Error(`Stale Pyth feed for ${symbol}`);
  }
  if (match.price <= 0) {
    throw new Error(`Invalid Pyth price for ${symbol}`);
  }
  return match;
}
