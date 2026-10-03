import { cached } from "../cache";
import { CACHE_TTL, DEXSCREENER_SEARCH_URL } from "../constants";
import { getJson, parseFinite } from "../http";
import { CL_RANGE_CAVEAT, ilClass } from "../il";
import type { Opportunity } from "../types";

interface DexPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
}

interface DexSearch {
  pairs?: DexPair[];
}

export async function fetchKittenswapOpportunities(): Promise<Opportunity[]> {
  return cached("dexscreener:kittenswap", CACHE_TTL.dexscreenerMs, loadKittenswap);
}

async function loadKittenswap(): Promise<Opportunity[]> {
  const query = encodeURIComponent("kittenswap");
  const body = await getJson<DexSearch>(`${DEXSCREENER_SEARCH_URL}?q=${query}`);
  const fetchedAt = Date.now();
  const seen = new Set<string>();
  const out: Opportunity[] = [];
  for (const pair of body.pairs ?? []) {
    const mapped = mapPair(pair, fetchedAt);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }
  return out;
}

function mapPair(pair: DexPair, fetchedAt: number): Opportunity | null {
  if (pair.chainId !== "hyperevm" || pair.dexId !== "kittenswap") return null;
  const address = pair.pairAddress;
  if (!address) return null;
  const base = pair.baseToken?.symbol ?? "BASE";
  const quote = pair.quoteToken?.symbol ?? "QUOTE";
  const tvl = parseFinite(pair.liquidity?.usd);
  const volume24h = parseFinite(pair.volume?.h24);
  return {
    id: `kittenswap:${address.toLowerCase()}`,
    type: "lp",
    venue: "kittenswap",
    layer: "evm",
    assets: [
      { symbol: base, id: (pair.baseToken?.address ?? base).toLowerCase() },
      { symbol: quote, id: (pair.quoteToken?.address ?? quote).toLowerCase() },
    ],
    apyTotal: null,
    apyBase: null,
    apyIncentive: null,
    apr: null,
    tvl,
    utilization: null,
    volume24h,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: null,
    depthUsd: null,
    oraclePx: null,
    ilClass: ilClass([base, quote]),
    risks: ["fee-apr-unavailable", CL_RANGE_CAVEAT],
    source: "dexscreener:kittenswap",
    url: pair.url ?? `https://dexscreener.com/hyperevm/${address}`,
    verified: false,
    fetchedAt,
    stale: false,
  };
}
