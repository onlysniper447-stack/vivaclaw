/**
 * Classify a Meteora − Kamino gap.
 * Rates are integer basis points. 100 bps = 1%. Null means the venue had no rate.
 * A gap is returned only when both rates are finite and not exactly 0.
 */

export type GapStatus = "above" | "below" | "no-pool" | "suspect" | "error";

export interface Classification {
  status: GapStatus;
  /** Signed gap in bps: Meteora − Kamino. Null when the rates cannot be compared. */
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
  meteoraApy: number | null,
  kaminoApy: number | null,
  trigger: number,
  options?: { ceilingBps?: number; ratio?: number },
): Classification {
  const ceiling = options?.ceilingBps ?? DEFAULT_APY_CEILING_BPS;
  const ratio = options?.ratio ?? DEFAULT_APY_RATIO;
  const meteora = meteoraApy;
  const kamino = kaminoApy;

  if (
    (meteora !== null && !Number.isFinite(meteora)) ||
    (kamino !== null && !Number.isFinite(kamino))
  ) {
    return {
      status: "error",
      gap: null,
      reason: "A rate was not a number.",
      unusual: false,
    };
  }

  if (
    (meteora !== null && suspectZero(meteora)) ||
    (kamino !== null && suspectZero(kamino))
  ) {
    return {
      status: "suspect",
      gap: null,
      reason: "A venue printed 0.00%. That is not a usable rate.",
      unusual: false,
    };
  }

  if (missing(meteora) && missing(kamino)) {
    return {
      status: "no-pool",
      gap: null,
      reason: "Neither venue returned a rate.",
      unusual: false,
    };
  }

  if (missing(meteora) || missing(kamino)) {
    const missingVenue = missing(meteora) ? "Meteora" : "Kamino";
    return {
      status: "no-pool",
      gap: null,
      reason: `${missingVenue} has no pool for this asset.`,
      unusual: false,
    };
  }

  const gap = meteora - kamino;
  const status: GapStatus = Math.abs(gap) >= trigger ? "above" : "below";
  const lead =
    gap > 0 ? "Meteora leads." : gap < 0 ? "Kamino leads." : "Rates are equal.";

  const larger = Math.max(meteora, kamino);
  const smaller = Math.min(Math.abs(meteora), Math.abs(kamino));
  const stretched = smaller > 0 && larger > smaller * ratio;
  const overCeiling = meteora > ceiling || kamino > ceiling;
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
