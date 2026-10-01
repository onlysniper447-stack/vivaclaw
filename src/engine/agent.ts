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
import type { AgentStatus, EngineView, SourceProgress, VenueId, YieldDelta, YieldPool } from "@/types/vivaclaw";
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
      kamino: idleSource(),
      meteora: idleSource(),
      lp: idleSource(),
      jupiter: idleSource(),
      pyth: idleSource(),
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
      kamino: { state: "running", message: null },
      meteora: { state: "running", message: null },
      lp: { state: "running", message: null },
      jupiter: { state: "running", message: null },
      pyth: { state: "running", message: null },
    },
  };
  live.snapshot = {
    ...getAgentSnapshot(),
    mode: "scanning",
    haltReason: null,
  };

  try {
    const [deltas, risk, jupiter] = await Promise.all([
      yieldSensor.pollOnce(),
      riskEngine.evaluate().catch((error: unknown) => {
        throw error;
      }),
      probeJupiter(),
    ]);
    const sensor = yieldSensor.getSourceReport();
    live.engineState.sources.kamino = sensor.kamino;
    live.engineState.sources.meteora = sensor.meteora;
    live.engineState.sources.lp = sensor.lp;
    live.engineState.sources.jupiter = {
      state: jupiter.ok ? "ok" : "error",
      message: jupiter.detail,
    };
    live.engineState.sources.pyth = {
      state: risk.oracleStale || (risk.circuitHold && risk.peg.length === 0) ? "error" : "ok",
      message: risk.oracleStale
        ? risk.peg.length === 0
          ? (risk.reasons[0] ?? "Pyth unavailable")
          : "Pyth print is stale"
        : risk.peg.length === 0
          ? (risk.reasons[0] ?? "No Pyth peg print")
          : "Pyth print is fresh",
    };

    live.snapshot.opportunities = toOpportunities(deltas, yieldSensor.getLpPools?.() ?? []);
    live.snapshot.lastScanAt = Date.now();
    live.scanCount += 1;

    const sourceErrors = [
      sensor.kamino,
      sensor.meteora,
      sensor.lp,
      live.engineState.sources.jupiter,
    ].filter((source) => source.state === "error");
    const allVenueFailed = sensor.kamino.state === "error" && sensor.meteora.state === "error";

    if (risk.circuitHold) {
      live.vivaclawStatus = "CIRCUIT_HOLD";
      live.snapshot.haltReason = risk.reasons.join("; ");
      logWarn("CIRCUIT_HOLD", live.snapshot.haltReason);
    }

    const triggered = deltas.filter((d) => d.meetsTrigger && !d.classification.unusual);
    if (!risk.circuitHold && triggered.length > 0) {
      live.vivaclawStatus = "EXECUTING";
      logInfo("EXECUTING", `${triggered.length} comparable gap(s) cleared the trigger. Dry run only.`);
      const best = triggered[0];
      if (best) {
        const exec = await executionRouter.maybeExecute(best, risk);
        if (exec) {
          const result: ExecutionResult = {
            ok: exec.ok,
            dryRun: true,
            error: exec.error,
            netProfitAtomic: exec.outAmount,
            loggedAt: Date.now(),
          };
          live.snapshot.lastExecution = result;
          if (!exec.ok) {
            live.snapshot.haltReason = exec.error ?? "quote failed";
          }
        }
      }
    } else if (!risk.circuitHold) {
      logInfo("SCANNING", "No comparable gap is at or above the trigger.");
    }

    if (live.scanCount % 4 === 0) {
      await clawPumpEngine.routeBuyback(risk.circuitHold);
    }

    if (allVenueFailed) {
      live.engineState = {
        ...live.engineState,
        phase: "error",
        reason: sourceErrors.map((source) => source.message).filter(Boolean).join("; ") || "Rates could not be read",
      };
      live.snapshot.mode = "halted";
      live.snapshot.haltReason = live.engineState.reason;
      live.vivaclawStatus = "IDLE";
    } else {
      live.engineState = {
        ...live.engineState,
        phase: "idle",
        reason: sourceErrors.length
          ? sourceErrors.map((source) => source.message).filter(Boolean).join("; ")
          : null,
        lastSuccessAt: Date.now(),
      };
      live.snapshot.mode = "idle";
      live.vivaclawStatus = risk.circuitHold ? "CIRCUIT_HOLD" : "IDLE";
    }
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
