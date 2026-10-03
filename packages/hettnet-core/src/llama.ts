import type { Opportunity, OpportunityType, VenueSlug } from "./types";
import { parseFinite } from "./http";
import { CL_RANGE_CAVEAT, ilClass } from "./il";

/** Llama `apy` / `apyBase` / `apyReward` / `apyBase7d` are percents (56 = 56%). */
export function llamaPercentToDecimal(value: unknown): number | null {
  const n = parseFinite(value);
  if (n === null) return null;
  return n / 100;
}

export function parseFeeTier(meta: unknown): number | null {
  if (typeof meta !== "string") return null;
  const match = meta.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match?.[1]) return null;
  return Number(match[1]) / 100;
}

export interface LlamaPool {
  chain?: string;
  project?: string;
  symbol?: string;
  tvlUsd?: number;
  apy?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  apyBase7d?: number | null;
  volumeUsd1d?: number | null;
  volumeUsd7d?: number | null;
  pool?: string;
  poolMeta?: string | null;
  underlyingTokens?: string[] | null;
}

const PROJECT_META: Record<
  string,
  { venue: VenueSlug; type: OpportunityType; concentrated: boolean }
> = {
  "hyperlend-pooled": { venue: "hyperlend", type: "lending", concentrated: false },
  "felix-cdp": { venue: "felix", type: "lending", concentrated: false },
  "hyperswap-v3": { venue: "hyperswap", type: "lp", concentrated: true },
  "hyperswap-v2": { venue: "hyperswap", type: "lp", concentrated: false },
  "project-x": { venue: "projectx", type: "lp", concentrated: true },
};

export function mapLlamaPool(pool: LlamaPool, fetchedAt = Date.now()): Opportunity | null {
  const project = pool.project ?? "";
  const meta = PROJECT_META[project];
  if (!meta) return null;

  const symbols = String(pool.symbol ?? "")
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);
  const tokens = pool.underlyingTokens ?? [];
  const assets = symbols.map((symbol, i) => ({
    symbol,
    id: (tokens[i] ?? tokens[0] ?? pool.pool ?? symbol).toLowerCase(),
  }));
  if (assets.length === 0) return null;

  const apyTotal = llamaPercentToDecimal(pool.apy);
  const apyIncentive = llamaPercentToDecimal(pool.apyReward);
  const apyBase7d = llamaPercentToDecimal(pool.apyBase7d);
  const apyBase24h = llamaPercentToDecimal(pool.apyBase);
  const risks: string[] = [];
  let apyBase: number | null = null;

  if (meta.type === "lp") {
    if (apyBase7d !== null) {
      apyBase = apyBase7d;
    } else if (apyBase24h !== null) {
      apyBase = apyBase24h;
      risks.push("fee-apr-24h-only");
    }
    if (meta.concentrated) risks.push(CL_RANGE_CAVEAT);
  } else {
    apyBase = apyBase24h ?? apyTotal;
  }

  if (apyTotal === 0 || apyBase === 0) {
    risks.push("zero-print");
  }
  if (project === "project-x") {
    risks.push("project-x-no-protocol-docs");
  }

  return {
    id: `llama:${project}:${pool.pool ?? symbols.join("-")}`,
    type: meta.type,
    venue: meta.venue,
    layer: "evm",
    assets,
    apyTotal,
    apyBase,
    apyIncentive,
    apr: null,
    tvl: parseFinite(pool.tvlUsd),
    utilization: null,
    volume24h: parseFinite(pool.volumeUsd1d),
    volume7d: parseFinite(pool.volumeUsd7d),
    feeTier: parseFeeTier(pool.poolMeta),
    capRemaining: null,
    paused: null,
    depthUsd: null,
    oraclePx: null,
    ilClass: meta.type === "lp" ? ilClass(symbols) : null,
    risks,
    source: `defillama:${project}`,
    url: null,
    verified: false,
    fetchedAt,
    stale: false,
  };
}
