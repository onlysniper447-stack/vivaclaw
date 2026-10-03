import { singleton } from "@/engine/singleton";
import { getServerEnv } from "@/lib/env";
import { tryLoadAgentPubkey } from "@/lib/solana/wallet";
import { yieldSensor } from "@/engine/YieldSensor";
import { riskEngine } from "@/engine/RiskEngine";
import { executionRouter } from "@/engine/ExecutionRouter";
import { clawPumpEngine } from "@/engine/ClawPumpEngine";
import { probeJupiter } from "@/engine/probes";
import { getAgentLogs, logInfo, logWarn } from "@/engine/logger";
import type { AgentSnapshot, ExecutionResult, OpportunityKind, ProtocolId, YieldOpportunity } from "@/types";
import type { AgentStatus, EngineView, SourceName, SourceProgress, VenueId, YieldDelta, YieldPool } from "@/types/vivaclaw";
import { venueLabel } from "@/lib/venues";

function idleSource(): SourceProgress {
  return { state: "idle", message: null };
}

export function idleEngine(lastSuccessAt: number | null = null): EngineView {
  return {
    phase: "idle",
    reason: null,
    lastSuccessAt,
    sources: {
      hypercore: idleSource(),
      llama: idleSource(),
      morpho: idleSource(),
      dexscreener: idleSource(),
      hyperlend: idleSource(),
    },
  };
}

const live = singleton("agent.aprApy", () => {
  const initialEngine = idleEngine();
  const initialSnapshot: AgentSnapshot = {
    mode: "idle",
    dryRun: true,
    cluster: "mainnet-beta",
    pubkey: null,
    lastScanAt: null,
    opportunities: [],
    lastExecution: null,
    haltReason: null,
    engine: initialEngine,
  };
  return {
    engineState: initialEngine,
    snapshot: initialSnapshot,
    vivaclawStatus: "IDLE" as AgentStatus,
    scanCount: 0,
    scanInflight: null as Promise<AgentSnapshot> | null,
  };
});

function feeNet(grossBps: number, feeBps: number): number {
  return grossBps - feeBps;
}

function opportunityProtocol(venue: VenueId): ProtocolId {
  switch (venue) {
    case "kamino":
      return "kamino";
    case "meteora":
    case "meteora-dlmm":
    case "meteora-damm":
      return "meteora";
    case "raydium":
      return "raydium";
    case "orca":
      return "orca";
    case "hypercore":
      return "hypercore";
    case "hyperlend":
      return "hyperlend";
    case "felix":
      return "felix";
    case "morpho":
      return "morpho";
    case "hyperswap":
      return "hyperswap";
    case "kittenswap":
      return "kittenswap";
    case "projectx":
      return "projectx";
  }
}

function opportunityKind(venue: VenueId): OpportunityKind {
  if (venue === "kamino") return "lend-supply";
  if (venue === "meteora") return "vault-yield";
  return "lp-fee";
}

function opportunityFromPool(pool: YieldPool, feeBps: number): YieldOpportunity {
  const gross = pool.rateQuality === "ok" ? pool.apyBps : null;
  return {
    id: pool.id,
    protocol: opportunityProtocol(pool.venue),
    kind: opportunityKind(pool.venue),
    asset: { symbol: pool.symbol, mint: pool.mint, decimals: pool.decimals },
    grossApyBps: gross,
    netApyBps: gross === null ? null : feeNet(gross, feeBps),
    tvlUsd: pool.tvlUsd,
    liquidityUsd: Number(pool.liquidityAtomic) / 10 ** pool.decimals,
    estimatedGasSol: 0.002,
    priceImpactBps: null,
    clawpumpFeeBps: feeBps,
    venueLabel: venueLabel(pool.venue),
    updatedAt: pool.updatedAt,
  };
}

function toOpportunities(deltas: YieldDelta[], lpPools: YieldPool[]): YieldOpportunity[] {
  const feeBps = getServerEnv().CLAWPUMP_FEE_BPS;
  const rows: YieldOpportunity[] = [];
  for (const delta of deltas) {
    for (const pool of [delta.kamino, delta.meteora]) {
      if (!pool) continue;
      rows.push(opportunityFromPool(pool, feeBps));
    }
  }
  for (const pool of lpPools) {
    rows.push(opportunityFromPool(pool, feeBps));
  }
  rows.sort((a, b) => (b.grossApyBps ?? -1) - (a.grossApyBps ?? -1));
  return rows;
}

export function getVivaclawStatus(): AgentStatus {
  return live.vivaclawStatus;
}

export function getEngineView(): EngineView {
  return live.engineState;
}

export function getAgentSnapshot(): AgentSnapshot {
  const env = getServerEnv();
  return {
    ...live.snapshot,
    dryRun: true,
    cluster: env.AGENT_CLUSTER,
    pubkey: tryLoadAgentPubkey(),
    engine: live.engineState,
  };
}

export async function scanOnce(): Promise<AgentSnapshot> {
  if (live.scanInflight) return live.scanInflight;
  live.scanInflight = runScan().finally(() => {
    live.scanInflight = null;
  });
  return live.scanInflight;
}

async function runScan(): Promise<AgentSnapshot> {
  live.vivaclawStatus = "SCANNING";
  live.engineState = {
    phase: "scanning",
    reason: null,
    lastSuccessAt: live.engineState.lastSuccessAt,
    sources: {
      hypercore: { state: "running", message: null },
      llama: { state: "running", message: null },
      morpho: { state: "running", message: null },
      dexscreener: { state: "running", message: null },
      hyperlend: { state: "running", message: null },
    },
  };
  live.snapshot = {
    ...getAgentSnapshot(),
    mode: "scanning",
    haltReason: null,
  };

  try {
    const { discoverOpportunities } = await import("vivaclaw-core");
    const { setOpportunitySnapshot } = await import("@/engine/opportunity-store");
    const result = await discoverOpportunities();
    setOpportunitySnapshot(result.opportunities, result.fetchedAt, result.errors);

    const countFor = (source: string) =>
      result.opportunities.filter((row) => row.source.includes(source) || row.venue === source).length;
    const mark = (name: SourceName, aliases: string[]): SourceProgress => {
      const err = result.errors.find((row) => aliases.some((a) => row.source.includes(a)));
      if (err) return { state: "error", message: err.message };
      return { state: "ok", message: `${countFor(aliases[0] ?? name)} prints` };
    };

    live.engineState.sources.hypercore = mark("hypercore", ["hypercore"]);
    live.engineState.sources.llama = mark("llama", ["llama"]);
    live.engineState.sources.morpho = mark("morpho", ["morpho"]);
    live.engineState.sources.dexscreener = mark("dexscreener", ["dexscreener"]);
    live.engineState.sources.hyperlend = mark("hyperlend", ["hyperlend"]);

    live.snapshot.opportunities = result.opportunities.map((opp) => {
      const apyBps =
        opp.apyTotal !== null && Number.isFinite(opp.apyTotal) ? Math.round(opp.apyTotal * 10_000) : null;
      return {
        id: opp.id,
        protocol: opportunityProtocol(opp.venue as VenueId),
        kind: opp.type === "lp" ? "lp-fee" : opp.type === "vault" ? "vault-yield" : "lend-supply",
        asset: {
          symbol: opp.assets.map((a) => a.symbol).join("/"),
          mint: opp.assets[0]?.id ?? opp.id,
          decimals: 18,
        },
        grossApyBps: apyBps,
        netApyBps: apyBps,
        tvlUsd: opp.tvl ?? 0,
        liquidityUsd: opp.tvl ?? 0,
        estimatedGasSol: 0,
        priceImpactBps: null,
        clawpumpFeeBps: 0,
        venueLabel: venueLabel(opp.venue),
        updatedAt: opp.fetchedAt,
      };
    });
    live.snapshot.lastScanAt = result.fetchedAt;
    live.snapshot.cluster = "hyperliquid";
    live.scanCount += 1;

    const failed = result.errors.length > 0 && result.opportunities.length === 0;
    live.engineState = {
      ...live.engineState,
      phase: failed ? "error" : "idle",
      reason: failed ? result.errors.map((e) => e.message).join("; ") : null,
      lastSuccessAt: failed ? live.engineState.lastSuccessAt : result.fetchedAt,
    };
    live.snapshot.mode = failed ? "halted" : "idle";
    live.snapshot.haltReason = live.engineState.reason;
    live.vivaclawStatus = "IDLE";
    logInfo("SCANNING", `Hyperliquid discovery returned ${result.opportunities.length} opportunities.`);
    return getAgentSnapshot();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    live.engineState = {
      ...live.engineState,
      phase: "error",
      reason,
    };
    live.snapshot.mode = "halted";
    live.snapshot.haltReason = reason;
    live.vivaclawStatus = "IDLE";
    logWarn("IDLE", reason);
    return getAgentSnapshot();
  }
}

export function recordExecution(result: ExecutionResult): void {
  live.snapshot.lastExecution = result;
  live.snapshot.mode = result.ok ? "idle" : "halted";
  if (!result.ok) live.snapshot.haltReason = result.error ?? "execution failed";
}

export function rankedOpportunities(): YieldOpportunity[] {
  return [...live.snapshot.opportunities].sort((a, b) => (b.grossApyBps ?? -1) - (a.grossApyBps ?? -1));
}

export function engineLogs() {
  return getAgentLogs(200);
}
