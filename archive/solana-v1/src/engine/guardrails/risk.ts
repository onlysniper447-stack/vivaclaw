import { getServerEnv } from "@/lib/env";
import type { OraclePrice, RiskVerdict, YieldOpportunity } from "@/types";

export function evaluateOpportunity(
  opportunity: YieldOpportunity,
  oracles: OraclePrice[],
  ltvBps = 0,
): RiskVerdict {
  const env = getServerEnv();
  const reasons: string[] = [];

  const staleOracle = oracles.some((o) => o.stale);
  if (staleOracle) reasons.push("oracle print exceeds ORACLE_MAX_STALENESS_MS");

  if (opportunity.netApyBps !== null && opportunity.netApyBps < env.MIN_NET_APY_BPS) {
    reasons.push(
      `net APY ${opportunity.netApyBps} bps below MIN_NET_APY_BPS ${env.MIN_NET_APY_BPS}`,
    );
  }

  if (opportunity.priceImpactBps !== null && opportunity.priceImpactBps > env.MAX_PRICE_IMPACT_BPS) {
    reasons.push(
      `price impact ${opportunity.priceImpactBps} bps exceeds MAX_PRICE_IMPACT_BPS ${env.MAX_PRICE_IMPACT_BPS}`,
    );
  }

  if (ltvBps > env.MAX_LTV_BPS) {
    reasons.push(`LTV ${ltvBps} bps exceeds MAX_LTV_BPS ${env.MAX_LTV_BPS}`);
  }

  if (opportunity.estimatedGasSol > env.MAX_POSITION_SOL) {
    reasons.push("estimated gas exceeds MAX_POSITION_SOL (misconfigured)");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    ltvBps,
    slippageBps: env.MAX_SLIPPAGE_BPS,
    priceImpactBps: opportunity.priceImpactBps,
    oracleStale: staleOracle,
  };
}

export function pickBestAllowed(
  opportunities: YieldOpportunity[],
  oracles: OraclePrice[],
): { opportunity: YieldOpportunity; verdict: RiskVerdict } | null {
  for (const opportunity of opportunities) {
    const verdict = evaluateOpportunity(opportunity, oracles);
    if (verdict.allowed) return { opportunity, verdict };
  }
  return null;
}
