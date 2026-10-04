import type { EngineView } from "./hettnet";

export type {
  AgentStatus,
  AgentLog,
  EnginePhase,
  EngineView,
  PegCheck,
  RiskReport,
  SourceName,
  SourceProgress,
  VenueId,
  VolatilityCheck,
} from "./hettnet";

export type {
  BannerKind,
  DashboardPayload,
  LastQuoteView,
  LastTxView,
  ServiceProbe,
  YieldMonitorRow,
} from "./dashboard";

export type ProtocolId =
  | "hypercore"
  | "hyperlend"
  | "felix"
  | "morpho"
  | "hyperswap"
  | "kittenswap"
  | "projectx";

export type Cluster = "hyperliquid";

export type AgentMode = "idle" | "scanning" | "evaluating" | "executing" | "halted";

export type OpportunityKind = "lend-supply" | "vault-yield" | "lp-fee";

export interface TokenRef {
  symbol: string;
  mint: string;
  decimals: number;
}

export interface YieldOpportunity {
  id: string;
  protocol: ProtocolId;
  kind: OpportunityKind;
  asset: TokenRef;
  grossApyBps: number | null;
  netApyBps: number | null;
  tvlUsd: number;
  liquidityUsd: number;
  priceImpactBps: number | null;
  protocolFeeBps: number;
  venueLabel: string;
  updatedAt: number;
}

export interface ExecutionResult {
  ok: boolean;
  dryRun: boolean;
  signature?: string;
  error?: string;
  loggedAt: number;
}

export interface AgentSnapshot {
  mode: AgentMode;
  dryRun: boolean;
  cluster: Cluster;
  address: string | null;
  lastScanAt: number | null;
  opportunities: YieldOpportunity[];
  lastExecution: ExecutionResult | null;
  haltReason: string | null;
  engine: EngineView;
}

export interface WsFeedEvent {
  type: "snapshot" | "scan" | "execution" | "halt" | "heartbeat";
  payload: AgentSnapshot | YieldOpportunity[] | ExecutionResult | { reason: string };
  ts: number;
}
