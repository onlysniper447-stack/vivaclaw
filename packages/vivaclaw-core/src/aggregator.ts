import { fetchKittenswapOpportunities } from "./adapters/dexscreener";
import { fetchHyperCoreOpportunities } from "./adapters/hypercore";
import { verifyHyperLend } from "./adapters/hyperlend";
import { fetchLlamaOpportunities } from "./adapters/llama";
import { fetchMorphoOpportunities } from "./adapters/morpho";
import { verifyErc4626Vaults } from "./adapters/verify-vault";
import { cached } from "./cache";
import { CACHE_TTL, VERIFY_TOP_N } from "./constants";
import { collectAlerts, indicationRank, INDICATION_DISCLAIMER, scoreOpportunities } from "./signal";
import type { DiscoverResult, Opportunity } from "./types";

export async function discoverOpportunities(): Promise<DiscoverResult> {
  return cached("aggregate:p0", CACHE_TTL.aggregateMs, loadAll);
}

async function loadAll(): Promise<DiscoverResult> {
  const errors: DiscoverResult["errors"] = [];
  const buckets = await Promise.all([
    settle("hypercore", fetchHyperCoreOpportunities),
    settle("llama", fetchLlamaOpportunities),
    settle("morpho", fetchMorphoOpportunities),
    settle("dexscreener", fetchKittenswapOpportunities),
  ]);

  const opportunities: Opportunity[] = [];
  for (const bucket of buckets) {
    if (bucket.ok) opportunities.push(...bucket.value);
    else errors.push({ source: bucket.source, message: bucket.message });
  }

  const fetchedAt = Date.now();
  const verified = skipVerify() ? opportunities : await verifyTop(opportunities);
  const scored = scoreOpportunities(verified);
  scored.sort(rank);
  return {
    opportunities: scored,
    errors,
    fetchedAt,
    alerts: collectAlerts(scored),
    disclaimer: INDICATION_DISCLAIMER,
  };
}

function skipVerify(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.VIVACLAW_SKIP_VERIFY === "1"
  );
}

async function verifyTop(opps: Opportunity[]): Promise<Opportunity[]> {
  const hyperlend = pick(opps, (o) => o.venue === "hyperlend", VERIFY_TOP_N);
  const vaults = pick(opps, (o) => o.venue === "felix" || o.venue === "morpho", VERIFY_TOP_N);
  const restIds = new Set([...hyperlend, ...vaults].map((o) => o.id));
  const rest = opps.filter((o) => !restIds.has(o.id));
  const [hl, morpho] = await Promise.all([
    verifyHyperLend(hyperlend).catch(() =>
      hyperlend.map((o) => ({ ...o, risks: [...o.risks, "onchain-verify-failed"] })),
    ),
    verifyErc4626Vaults(vaults).catch(() =>
      vaults.map((o) => ({ ...o, risks: [...o.risks, "onchain-verify-failed"] })),
    ),
  ]);
  return [...hl, ...morpho, ...rest];
}

function pick(opps: Opportunity[], test: (o: Opportunity) => boolean, n: number): Opportunity[] {
  return opps.filter(test).sort(rank).slice(0, n);
}

function rank(a: Opportunity, b: Opportunity): number {
  const orderA = a.signal ? indicationRank(a.signal.indication) : 1;
  const orderB = b.signal ? indicationRank(b.signal.indication) : 1;
  if (orderA !== orderB) return orderA - orderB;
  const apyA = a.apyTotal ?? -1;
  const apyB = b.apyTotal ?? -1;
  if (apyA !== apyB) return apyB - apyA;
  return (b.tvl ?? 0) - (a.tvl ?? 0);
}

async function settle(
  source: string,
  fn: () => Promise<Opportunity[]>,
): Promise<{ ok: true; value: Opportunity[] } | { ok: false; source: string; message: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return {
      ok: false,
      source,
      message: error instanceof Error ? error.message : `${source} failed`,
    };
  }
}
