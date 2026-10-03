export type OpportunityType = "lending" | "lp" | "vault" | "staking";
export type OpportunityLayer = "core" | "evm";
export type IlClass = "stable-stable" | "correlated" | "volatile";

export type VenueSlug =
  | "hypercore"
  | "hyperlend"
  | "felix"
  | "morpho"
  | "hyperswap"
  | "kittenswap"
  | "projectx";

export interface OpportunityAsset {
  symbol: string;
  /** EVM address, HyperCore token index as `core:<n>`, or native HYPE. */
  id: string;
}

export type Indication = "ENTER" | "WATCH" | "AVOID";

export interface Signal {
  indication: Indication;
  reasons: string[];
  alerts: string[];
}

export interface SignalAlert {
  kind: "kink-proximity" | "paused" | "apy-outlier" | "stale" | "cap-exhausted";
  opportunityId: string;
  symbol: string;
  venue: VenueSlug;
  message: string;
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  venue: VenueSlug;
  layer: OpportunityLayer;
  assets: OpportunityAsset[];
  /** Decimal fraction (0.05 = 5%). Null when the source did not print a total. */
  apyTotal: number | null;
  apyBase: number | null;
  apyIncentive: number | null;
  /** Simple APR. Null when the source only prints APY — never derived for display. */
  apr: number | null;
  tvl: number | null;
  utilization: number | null;
  volume24h: number | null;
  volume7d: number | null;
  /** 0.003 = 0.30%. Null when the fee tier is not published. */
  feeTier: number | null;
  capRemaining: number | null;
  paused: boolean | null;
  /** USD depth from a quote. Null until a quote exists. */
  depthUsd: number | null;
  oraclePx: number | null;
  ilClass: IlClass | null;
  risks: string[];
  source: string;
  url: string | null;
  verified: boolean;
  fetchedAt: number;
  stale: boolean;
  /** Filled by the aggregator after discovery. */
  signal?: Signal;
}

export interface DiscoverResult {
  opportunities: Opportunity[];
  errors: { source: string; message: string }[];
  fetchedAt: number;
  alerts: SignalAlert[];
  disclaimer: string;
}

export interface SupplySimulation {
  currentUtilization: number;
  currentBorrowApy: number;
  currentSupplyApy: number;
  nextUtilization: number;
  nextBorrowApy: number;
  nextSupplyApy: number;
  crossedKink: boolean;
  nearKink: boolean;
  warnings: string[];
}
