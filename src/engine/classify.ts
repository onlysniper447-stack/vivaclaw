/**
 * Classify a HyperEVM − HyperCore gap.
 * Rates are integer basis points. 100 bps = 1%. Null means the venue had no rate.
 * A gap is returned only when both rates are finite and not exactly 0.
 */

export type GapStatus = "above" | "below" | "no-pool" | "suspect" | "error";

export interface Classification {
  status: GapStatus;
  /** Signed gap in bps: HyperEVM − HyperCore. Null when the rates cannot be compared. */
  gap: number | null;
  reason?: string;
  unusual: boolean;
  unusualReason?: string;
}

export const DEFAULT_APY_CEILING_BPS = 3_000;
export const DEFAULT_APY_RATIO = 5;

const UNUSUAL_TEXT =
  "Unusually high. Check whether this is a temporary incentive or a stale read.";

function missing(value: number | null): value is null {
  return value === null;
}

function suspectZero(value: number): boolean {
  return value === 0;
}

export function classifyAsset(
  hyperevmApy: number | null,
  hypercoreApy: number | null,
  trigger: number,
  options?: { ceilingBps?: number; ratio?: number },
): Classification {
  const ceiling = options?.ceilingBps ?? DEFAULT_APY_CEILING_BPS;
  const ratio = options?.ratio ?? DEFAULT_APY_RATIO;
  const hyperevm = hyperevmApy;
  const hypercore = hypercoreApy;

  if (
    (hyperevm !== null && !Number.isFinite(hyperevm)) ||
    (hypercore !== null && !Number.isFinite(hypercore))
  ) {
    return {
      status: "error",
      gap: null,
      reason: "A rate was not a number.",
      unusual: false,
    };
  }

  if (
    (hyperevm !== null && suspectZero(hyperevm)) ||
    (hypercore !== null && suspectZero(hypercore))
  ) {
    return {
      status: "suspect",
      gap: null,
      reason: "A venue printed 0.00%. That is not a usable rate.",
      unusual: false,
    };
  }

  if (missing(hyperevm) && missing(hypercore)) {
    return {
      status: "no-pool",
      gap: null,
      reason: "Neither venue returned a rate.",
      unusual: false,
    };
  }

  if (missing(hyperevm) || missing(hypercore)) {
    const missingVenue = missing(hyperevm) ? "HyperEVM" : "HyperCore";
    return {
      status: "no-pool",
      gap: null,
      reason: `${missingVenue} has no pool for this asset.`,
      unusual: false,
    };
  }

  const gap = hyperevm - hypercore;
  const status: GapStatus = Math.abs(gap) >= trigger ? "above" : "below";
  const lead =
    gap > 0 ? "HyperEVM leads." : gap < 0 ? "HyperCore leads." : "Rates are equal.";

  const larger = Math.max(hyperevm, hypercore);
  const smaller = Math.min(Math.abs(hyperevm), Math.abs(hypercore));
  const stretched = smaller > 0 && larger > smaller * ratio;
  const overCeiling = hyperevm > ceiling || hypercore > ceiling;
  const unusual = stretched || overCeiling;

  return {
    status,
    gap,
    reason: lead,
    unusual,
    unusualReason: unusual ? UNUSUAL_TEXT : undefined,
  };
}

export function gapStatusLabel(status: GapStatus): string {
  switch (status) {
    case "above":
      return "Above trigger";
    case "below":
      return "Below trigger";
    case "no-pool":
      return "Not comparable";
    case "suspect":
    case "error":
      return "Check data";
  }
}
