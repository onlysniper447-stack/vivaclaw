/**
 * Hettnet engine contracts.
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
  | "hypercore"
  | "hyperlend"
  | "felix"
  | "morpho"
  | "hyperswap"
  | "kittenswap"
  | "projectx";

export type VenueFamily = "lend" | "lp";

export type AgentLogLevel = "info" | "warn" | "error";

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
  data?: Record<string, unknown>;
}
