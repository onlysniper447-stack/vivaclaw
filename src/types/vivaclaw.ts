/**
 * VIVACLAW core engine contracts.
 * APY fields are decimal fractions unless suffixed with `Bps` (0.085 = 8.5% = 850 bps).
 */

export type AgentStatus = "IDLE" | "SCANNING" | "EXECUTING" | "CIRCUIT_HOLD";

export type EnginePhase = "idle" | "scanning" | "error";

export type SourceName = "hypercore" | "llama" | "morpho" | "dexscreener" | "hyperlend";

export interface SourceProgress {
  state: "idle" | "running" | "ok" | "error";
  message: string | null;
}

export interface EngineView {
  phase: EnginePhase;
  reason: string | null;
  lastSuccessAt: number | null;
  sources: Record<SourceName, SourceProgress>;
}

export type VenueId =
  | "kamino"
  | "meteora"
  | "meteora-dlmm"
  | "meteora-damm"
  | "raydium"
  | "orca"
  | "hypercore"
  | "hyperlend"
  | "felix"
  | "morpho"
  | "hyperswap"
  | "kittenswap"
  | "projectx";

export type VenueFamily = "lend" | "lp";

export type AgentLogLevel = "info" | "warn" | "error";

export interface YieldPool {
  id: string;
  venue: VenueId;
  /** Underlying SPL mint (base58). */
  mint: string;
  symbol: string;
  decimals: number;
  /** Decimal APR, simple annualized (daily × 365). */
  apr: number;
  aprBps: number;
  /** Decimal APY, daily compound of the same rate. */
  apy: number;
  apyBps: number;
  tvlUsd: number;
  liquidityAtomic: string;
  /** Kamino reserve address or Meteora vault PDA. */
  venueAddress: string;
  updatedAt: number;
  /** `suspect` means the venue responded with 0.00% or another unusable print. */
  rateQuality: "ok" | "suspect";
}

export interface YieldDelta {
  mint: string;
  symbol: string;
  kamino: YieldPool | null;
  meteora: YieldPool | null;
  /**
   * ΔAPY = APY_Meteora − APY_Kamino (decimal).
   * Positive: Meteora leads. Negative: Kamino leads.
   */
  /** Decimal gap. Zero when the rates are not comparable — read `classification` for the truth. */
  deltaApy: number;
  /** Integer bps gap. Null when the rates are not comparable. */
  deltaApyBps: number | null;
  /** True only when both rates are usable and |gap| meets the trigger. */
  meetsTrigger: boolean;
  classification: import("@/engine/classify").Classification;
  updatedAt: number;
}

export interface PegCheck {
  symbol: string;
  priceId: string;
  price: number;
  target: number;
  deviationBps: number;
  maxDeviationBps: number;
  confidenceBps: number;
  publishTime: number;
  healthy: boolean;
}

export interface VolatilityCheck {
  symbol: string;
  ema: number;
  emaDeviationBps: number;
  confidenceBps: number;
  realizedVolBps: number;
  extreme: boolean;
  /** Configured ceiling this print was judged against. */
  maxVolBps: number;
  maxConfBps: number;
}

export interface RiskReport {
  status: AgentStatus;
  circuitHold: boolean;
  reasons: string[];
  peg: PegCheck[];
  volatility: VolatilityCheck[];
  oracleStale: boolean;
  evaluatedAt: number;
  /** When circuit-hold state last changed. Equals the first evaluation until it changes. */
  holdChangedAt: number;
  thresholds: {
    pegMaxBps: number;
    volMaxBps: number;
    confMaxBps: number;
    oracleMaxAgeSec: number;
  };
}

export interface AgentLog {
  ts: number;
  level: AgentLogLevel;
  status: AgentStatus;
  message: string;
  signature?: string;
  solscanUrl?: string;
  data?: Record<string, unknown>;
}

export interface ClawPumpRevenue {
  wallet: string;
  claimedSolLamports: string;
  unclaimedSolLamports: string;
  lifetimeSolLamports: string;
  /** 30% of claimed SOL allocated to $VIVACLAW buyback. */
  buybackShareLamports: string;
  buybackShareBps: number;
  updatedAt: number;
  raw?: Record<string, unknown>;
}

export interface SwapExecution {
  ok: boolean;
  dryRun: boolean;
  signature?: string;
  solscanUrl?: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  jitoTipLamports: number;
  error?: string;
  logs: AgentLog[];
  symbol?: string;
  fromVenue?: string;
  toVenue?: string;
  expectedGapBps?: number | null;
}
