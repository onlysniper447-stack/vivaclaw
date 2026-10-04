import type { Classification } from "@/engine/classify";
import type { AgentLog, AgentStatus, EngineView, RiskReport, VenueFamily, VenueId } from "@/types/hettnet";
import type { AgentMode, Cluster } from "@/types";
import type { Indication, SignalAlert } from "hettnet-core";

export type BannerKind = "safe" | "dry-run" | "circuit-hold" | "error";

export interface ServiceProbe {
  name: string;
  ok: boolean;
  configured: boolean;
  latencyMs: number | null;
  detail: string;
}

export interface RatePoint {
  at: number;
  bps: number | null;
}

export type GapClassification = Classification;

export interface YieldMonitorRow {
  symbol: string;
  mint: string;
  hypercoreApyBps: number | null;
  hyperevmApyBps: number | null;
  deltaApyBps: number | null;
  meetsTrigger: boolean;
  status: Classification["status"];
  reason: string | null;
  unusual: boolean;
  unusualReason: string | null;
  updatedAt: number | null;
  observed: boolean;
  source: string;
  history: RatePoint[];
}

export interface VenueYieldRow {
  id: string;
  venue: VenueId;
  family: VenueFamily;
  symbol: string;
  mint: string;
  aprBps: number | null;
  apyBps: number | null;
  quality: "ok" | "suspect" | "missing";
  indication: Indication;
  reasons: string[];
  alerts: string[];
  unusual: boolean;
  unusualReason: string | null;
  grossApyBps: number | null;
  netApyBps: number | null;
  feeBps: number;
  priceImpactBps: number | null;
  quoted: boolean;
  source: string;
  updatedAt: number | null;
  history: RatePoint[];
}

export interface LastQuoteView {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  dryRun: boolean;
  at: number | null;
  symbol: string | null;
  fromVenue: string | null;
  toVenue: string | null;
  expectedGapBps: number | null;
}

export interface LastTxView {
  status: "none" | "quoted-dry-run" | "error";
  error?: string;
  at: number | null;
}

export interface PositionView {
  id: string;
  poolId: string;
  venue: VenueId;
  family: VenueFamily;
  symbol: string;
  mint: string;
  unit: string;
  aprBps: number;
  apyBps: number;
  principal: number;
  earned: number;
  claimed: number;
  daily: number;
  status: "open" | "closed";
  enteredAt: number;
  accruedAt: number;
  closedAt: number | null;
  exitAmount: number | null;
}

export interface PositionActionView {
  id: string;
  kind: "enter" | "claim" | "withdraw";
  positionId: string;
  poolId: string;
  symbol: string;
  venue: VenueId;
  amount: number;
  unit: string;
  aprBps: number;
  apyBps: number;
  at: number;
  message: string;
}

export interface DashboardPayload {
  dryRun: boolean;
  cluster: Cluster;
  engineStatus: AgentStatus;
  mode: AgentMode;
  haltReason: string | null;
  lastScanAt: number | null;
  signerLoaded: boolean;
  addressShort: string | null;
  banners: BannerKind[];
  probes: {
    rpc: ServiceProbe;
    hyperevm: ServiceProbe;
    engine: ServiceProbe;
  };
  yields: {
    triggerBps: number;
    ceilingBps: number;
    rows: YieldMonitorRow[];
    venues: VenueYieldRow[];
    enterCount: number;
    watchCount: number;
    avoidCount: number;
  };
  alerts: SignalAlert[];
  disclaimer: string;
  engine: EngineView;
  stale: boolean;
  scanIntervalMs: number;
  risk: RiskReport | null;
  execution: {
    state: AgentMode;
    dryRun: boolean;
    lastQuote: LastQuoteView | null;
    lastTx: LastTxView;
    positions: PositionView[];
    actions: PositionActionView[];
  };
  logs: AgentLog[];
  generatedAt: number;
}
