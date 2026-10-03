/**
 * ENTER / WATCH / AVOID scoring for Hyperliquid opportunities.
 * Indications are informational, not financial advice.
 */

import { CL_RANGE_CAVEAT } from "./il";
import type { Indication, Opportunity, Signal, SignalAlert } from "./types";

export const INDICATION_DISCLAIMER =
  "Indications are informational, not financial advice.";

export const SIGNAL_DEFAULTS = {
  ceilingApy: 0.3,
  outlierApy: 2,
  thinTvlUsd: 10_000,
  minTvlEnterLendUsd: 25_000,
  minTvlEnterLpUsd: 50_000,
  incentiveShareWatch: 0.5,
  highUtil: 0.9,
} as const;

export type SignalOptions = {
  ceilingApy?: number;
  outlierApy?: number;
  thinTvlUsd?: number;
  minTvlEnterLendUsd?: number;
  minTvlEnterLpUsd?: number;
  incentiveShareWatch?: number;
  highUtil?: number;
};

const ALERT_COPY: Record<SignalAlert["kind"], string> = {
  "kink-proximity":
    "Utilization is within 5pp of the 80% kink. Borrow APY steps up above that level.",
  paused: "This reserve is paused or frozen.",
  "apy-outlier": "APY is an outlier or unusually high on thin TVL.",
  stale: "This print is stale.",
  "cap-exhausted": "The remaining cap is 0. New supply is closed.",
};

const INDICATION_ORDER: Record<Indication, number> = {
  ENTER: 0,
  WATCH: 1,
  AVOID: 2,
};

export function indicationRank(indication: Indication): number {
  return INDICATION_ORDER[indication];
}

function usableApy(opp: Opportunity): number | null {
  const value = opp.apyTotal ?? opp.apyBase;
  if (value === null || !Number.isFinite(value)) return null;
  return value;
}

function hasRisk(opp: Opportunity, code: string): boolean {
  return opp.risks.includes(code);
}

function hasRangeCaveat(opp: Opportunity): boolean {
  return opp.risks.includes(CL_RANGE_CAVEAT) || opp.risks.some((row) => row.toLowerCase().includes("in range"));
}

export function scoreOpportunity(opp: Opportunity, options: SignalOptions = {}): Signal {
  const cfg = { ...SIGNAL_DEFAULTS, ...options };
  const apy = usableApy(opp);
  const avoid: string[] = [];
  const watch: string[] = [];
  const alerts: SignalAlert["kind"][] = [];
  const notes: string[] = [];

  if (opp.paused === true || hasRisk(opp, "reserve-paused-or-frozen")) {
    avoid.push("This reserve is paused or frozen.");
    alerts.push("paused");
  }

  if (hasRisk(opp, "collateral-no-interest")) {
    avoid.push("This HyperCore collateral earns no interest.");
  } else if (hasRisk(opp, "zero-print") || apy === 0) {
    avoid.push("The venue printed 0% APY.");
  }

  if (apy === null && (opp.type === "lending" || opp.type === "vault")) {
    avoid.push("No usable APY is available for this lend.");
  }

  if (hasRisk(opp, "apy-outlier") || (apy !== null && apy > cfg.outlierApy)) {
    avoid.push("APY is an outlier (above 200%). Treat the print as unusable.");
    alerts.push("apy-outlier");
  }

  if (apy !== null && apy > cfg.ceilingApy && (opp.tvl === null || opp.tvl < cfg.thinTvlUsd)) {
    avoid.push("Unusually high APY on thin TVL. The print may be a temporary incentive or a stale read.");
    alerts.push("apy-outlier");
  }

  if (opp.capRemaining === 0) {
    avoid.push("The remaining cap is 0. New supply is closed.");
    alerts.push("cap-exhausted");
  }

  if (hasRisk(opp, "onchain-verify-failed")) {
    avoid.push("On-chain verify failed for this venue.");
  }

  if (hasRisk(opp, "kink-proximity")) {
    watch.push(ALERT_COPY["kink-proximity"]);
    alerts.push("kink-proximity");
  }

  if (opp.utilization !== null && opp.utilization >= cfg.highUtil) {
    watch.push(`Utilization is ${(opp.utilization * 100).toFixed(1)}%. New borrows may be liquidity-constrained.`);
  }

  if (hasRisk(opp, "rate-model-divergence")) {
    watch.push("The live supply APY diverges from the documented HyperCore rate model.");
  }

  if (hasRisk(opp, "fee-apr-24h-only")) {
    watch.push("Fee APY uses the 24h window. A 7d average was not published.");
  }

  if (hasRisk(opp, "fee-apr-unavailable") || (apy === null && opp.type === "lp")) {
    watch.push("Fee APR is unavailable. Depth is listed; yield is not scored as ENTER.");
  }

  if (hasRangeCaveat(opp)) {
    watch.push(CL_RANGE_CAVEAT);
  }

  if (opp.ilClass === "volatile") {
    watch.push("Impermanent loss class is volatile. Pair prices can diverge.");
  } else if (opp.ilClass === "correlated") {
    watch.push("Impermanent loss class is correlated (HYPE family).");
  }

  if (apy !== null && apy > 0 && opp.apyIncentive !== null && opp.apyIncentive > 0) {
    const share = opp.apyIncentive / apy;
    if (share >= cfg.incentiveShareWatch) {
      watch.push("Incentive APY is more than half of the total print. Incentives can end.");
    }
  }

  if (apy !== null && apy > cfg.ceilingApy && opp.tvl !== null && opp.tvl >= cfg.thinTvlUsd) {
    watch.push("APY is unusually high versus the 30% sanity ceiling. Check whether this is a temporary incentive.");
  }

  if (opp.stale) {
    watch.push("This print is stale.");
    alerts.push("stale");
  }

  if (opp.tvl === null) {
    watch.push("TVL is unavailable.");
  } else if (opp.type === "lp" && opp.tvl < cfg.minTvlEnterLpUsd) {
    watch.push("LP TVL is below the $50k floor used for ENTER.");
  } else if (
    (opp.type === "lending" || opp.type === "vault") &&
    opp.venue !== "hypercore" &&
    opp.tvl < cfg.minTvlEnterLendUsd
  ) {
    watch.push("TVL is below the $25k floor used for ENTER.");
  }

  if (!opp.verified && (opp.type === "lending" || opp.type === "vault") && opp.venue !== "hypercore") {
    watch.push("This lend print is discovery-only. It has not been verified on-chain.");
  }

  if (hasRisk(opp, "project-x-no-protocol-docs")) {
    watch.push("Project X is discovery and deep-link only. Protocol docs were not available.");
  }

  if (hasRisk(opp, "hypercore-usdc-is-not-circle-usdc")) {
    notes.push("HyperCore USDC is not Circle USDC.");
  }

  const uniqueAlerts = [...new Set(alerts)];
  const uniqueAvoid = [...new Set(avoid)];
  const uniqueWatch = [...new Set(watch)];

  if (uniqueAvoid.length > 0) {
    return {
      indication: "AVOID",
      reasons: [...uniqueAvoid, ...notes],
      alerts: uniqueAlerts,
    };
  }

  if (uniqueWatch.length > 0 || apy === null || apy <= 0) {
    const fallback =
      uniqueWatch.length > 0 ? uniqueWatch : ["No usable APY is available."];
    return {
      indication: "WATCH",
      reasons: [...fallback, ...notes],
      alerts: uniqueAlerts,
    };
  }

  const enterReason =
    opp.venue === "hypercore"
      ? "Verified HyperCore supply APY with utilization away from the 80% kink."
      : opp.type === "lp" && opp.ilClass === "stable-stable"
        ? "Stable-stable LP with a usable APY and listed TVL."
        : opp.verified
          ? "Verified venue print with a usable APY and listed TVL."
          : "Usable APY with listed TVL.";

  return { indication: "ENTER", reasons: [enterReason, ...notes], alerts: [] };
}

export function scoreOpportunities(opps: Opportunity[], options?: SignalOptions): Opportunity[] {
  return opps.map((opp) => ({ ...opp, signal: scoreOpportunity(opp, options) }));
}

export function collectAlerts(opps: Opportunity[]): SignalAlert[] {
  const out: SignalAlert[] = [];
  for (const opp of opps) {
    const signal = opp.signal ?? scoreOpportunity(opp);
    const symbol = opp.assets.map((asset) => asset.symbol).join("/") || opp.id;
    for (const kind of signal.alerts) {
      const typed = kind as SignalAlert["kind"];
      if (!(typed in ALERT_COPY)) continue;
      out.push({
        kind: typed,
        opportunityId: opp.id,
        symbol,
        venue: opp.venue,
        message: ALERT_COPY[typed],
      });
    }
  }
  return out;
}
