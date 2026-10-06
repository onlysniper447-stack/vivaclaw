import { singleton } from "@/engine/singleton";
import { getAgentLogs, logInfo, logWarn } from "@/engine/logger";
import type { AgentSnapshot, ExecutionResult, ProtocolId, YieldOpportunity } from "@/types";
import type { AgentStatus, EngineView, SourceName, SourceProgress, VenueId } from "@/types/hettnet";
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
    cluster: "hyperliquid",
    address: null,
    lastScanAt: null,
    opportunities: [],
    lastExecution: null,
    haltReason: null,
    engine: initialEngine,
  };
  return {
    engineState: initialEngine,
    snapshot: initialSnapshot,
    agentStatus: "IDLE" as AgentStatus,
    scanCount: 0,
    scanInflight: null as Promise<AgentSnapshot> | null,
  };
});

function opportunityProtocol(venue: VenueId): ProtocolId {
  return venue;
}

export function getAgentStatus(): AgentStatus {
  return live.agentStatus;
}

export function getEngineView(): EngineView {
  return live.engineState;
}

export function getAgentSnapshot(): AgentSnapshot {
  return {
    ...live.snapshot,
    dryRun: true,
    cluster: "hyperliquid",
    address: null,
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
  live.agentStatus = "SCANNING";
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
    const { discoverOpportunities, mainnetResearchEnabled } = await import("hettnet-core");
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

    const skipResearch = !mainnetResearchEnabled();
    const skipped: SourceProgress = { state: "idle", message: "skipped on testnet" };
    live.engineState.sources.hypercore = mark("hypercore", ["hypercore"]);
    live.engineState.sources.llama = skipResearch ? skipped : mark("llama", ["llama"]);
    live.engineState.sources.morpho = skipResearch ? skipped : mark("morpho", ["morpho"]);
    live.engineState.sources.dexscreener = skipResearch ? skipped : mark("dexscreener", ["dexscreener"]);
    live.engineState.sources.hyperlend = skipResearch ? skipped : mark("hyperlend", ["hyperlend"]);

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
        priceImpactBps: null,
        protocolFeeBps: 0,
        venueLabel: venueLabel(opp.venue),
        updatedAt: opp.fetchedAt,
      } satisfies YieldOpportunity;
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
    live.agentStatus = "IDLE";
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
    live.agentStatus = "IDLE";
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
