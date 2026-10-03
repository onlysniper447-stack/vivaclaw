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
  SwapExecution,
  VenueId,
  VolatilityCheck,
  YieldDelta,
  YieldPool,
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
  | "kamino"
  | "meteora"
  | "jupiter"
  | "raydium"
  | "orca"
  | "hypercore"
  | "hyperlend"
  | "felix"
  | "morpho"
  | "hyperswap"
  | "kittenswap"
  | "projectx";

export type Cluster = "mainnet-beta" | "devnet" | "testnet" | "hyperliquid";

export type AgentMode = "idle" | "scanning" | "evaluating" | "executing" | "halted";

export type OpportunityKind =
  | "lend-supply"
  | "vault-yield"
  | "lp-fee"
  | "loop-arb"
  | "cross-venue-arb";

export interface TokenRef {
  symbol: string;
  mint: string;
  decimals: number;
}

export interface OraclePrice {
  symbol: string;
  priceId: string;
  price: number;
  confidence: number;
  expo: number;
  publishTime: number;
  stale: boolean;
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
  estimatedGasSol: number;
  /** Null until a route quote exists. Never substitute 0. */
  priceImpactBps: number | null;
  protocolFeeBps: number;
  venueLabel: string;
  updatedAt: number;
}

export interface RiskVerdict {
  allowed: boolean;
  reasons: string[];
  ltvBps?: number;
  slippageBps?: number;
  priceImpactBps?: number | null;
  oracleStale?: boolean;
}

export interface ExecutionIntent {
  opportunityId: string;
  inputMint: string;
  outputMint: string;
  amountAtomic: string;
  slippageBps: number;
  dryRun: boolean;
}

export interface ExecutionResult {
  ok: boolean;
  dryRun: boolean;
  signature?: string;
  error?: string;
  feeShareAtomic?: string;
  netProfitAtomic?: string;
  loggedAt: number;
}

export interface AgentSnapshot {
  mode: AgentMode;
  dryRun: boolean;
  cluster: Cluster;
  pubkey: string | null;
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
