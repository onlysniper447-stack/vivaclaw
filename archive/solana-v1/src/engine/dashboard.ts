import { getServerEnv } from "@/lib/env";
import { NATIVE_SOL_MINT, TOKENS } from "@/lib/constants";
import { venueFamily, venueSource } from "@/lib/venues";
import { yieldSensor } from "@/engine/YieldSensor";
import { riskEngine } from "@/engine/RiskEngine";
import { executionRouter } from "@/engine/ExecutionRouter";
import { clawPumpEngine } from "@/engine/ClawPumpEngine";
import { engineLogs, getAgentSnapshot, getEngineView, getVivaclawStatus } from "@/engine/agent";
import { dailyEarn } from "@/lib/accrual";
import { earnedAmount, listActions, listPositions } from "@/engine/positions";
import { probeJupiter, probeRpc } from "@/engine/probes";
import type {
  BannerKind,
  ClawPumpView,
  DashboardPayload,
  LastTxView,
  PositionView,
  VenueYieldRow,
  YieldMonitorRow,
} from "@/types/dashboard";

const PLACEHOLDER_ASSETS = [
  { symbol: "SOL", mint: NATIVE_SOL_MINT },
  { symbol: "USDC", mint: TOKENS.USDC.mint },
  { symbol: "USDT", mint: TOKENS.USDT.mint },
] as const;

function skipNetworkProbes(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function txFromSwap(
  swap: {
    ok: boolean;
    dryRun: boolean;
    error?: string;
  } | null,
  at: number | null,
): LastTxView {
  if (!swap) return { status: "none", at: null };
  if (!swap.ok) {
    return { status: "error", error: swap.error, at };
  }
  return { status: "quoted-dry-run", at };
}

export async function getDashboardPayload(): Promise<DashboardPayload> {
  const env = getServerEnv();
  const snapshot = getAgentSnapshot();
  const engineStatus = getVivaclawStatus();
  const deltas = yieldSensor.getDeltas();
  const risk = riskEngine.getLastReport();
  const lastSwap = executionRouter.getLastSwap();
  const revenue = clawPumpEngine.getLastRevenue();
  const lastBuyback = clawPumpEngine.getLastBuyback();

  const [rpc, jupiter] = skipNetworkProbes()
    ? [
        {
          name: "Solana RPC",
          ok: true,
          configured: Boolean(env.SOLANA_RPC_URL),
          latencyMs: null,
          detail: "probe skipped during build",
        },
        {
          name: "Jupiter API",
          ok: true,
          configured: Boolean(env.JUPITER_API_URL),
          latencyMs: null,
          detail: "probe skipped during build",
        },
      ]
    : await Promise.all([probeRpc(), probeJupiter()]);

  const circuitHold = engineStatus === "CIRCUIT_HOLD" || Boolean(risk?.circuitHold);
  const banners: BannerKind[] = ["dry-run"];
  if (circuitHold) banners.push("circuit-hold");
  if (!rpc.ok || !jupiter.ok) banners.push("error");
  if (!circuitHold && rpc.ok && !banners.includes("error")) banners.push("safe");

  const feeBps = env.CLAWPUMP_FEE_BPS;
  const observedRows: YieldMonitorRow[] = deltas.map((delta) => ({
    symbol: delta.symbol,
    mint: delta.mint,
    kaminoApyBps: delta.kamino && delta.kamino.rateQuality === "ok" ? delta.kamino.apyBps : delta.kamino ? 0 : null,
    meteoraApyBps:
      delta.meteora && delta.meteora.rateQuality === "ok"
        ? delta.meteora.apyBps
        : delta.meteora
          ? 0
          : null,
    deltaApyBps: delta.classification.gap,
    meetsTrigger: delta.meetsTrigger,
    status: delta.classification.status,
    reason: delta.classification.reason ?? null,
    unusual: delta.classification.unusual,
    unusualReason: delta.classification.unusualReason ?? null,
    updatedAt: delta.updatedAt,
    observed: true,
    source: "Kamino klend · Meteora vault",
    history: yieldSensor.getHistory(delta.mint).map((point) => ({
      at: point.at,
      bps: point.meteoraBps !== null && point.kaminoBps !== null ? point.meteoraBps - point.kaminoBps : null,
    })),
  }));

  const venues: VenueYieldRow[] = [];
  for (const delta of deltas) {
    for (const pool of [delta.kamino, delta.meteora]) {
      if (!pool) continue;
      const history = yieldSensor.getHistory(delta.mint).map((point) => ({
        at: point.at,
        bps: pool.venue === "kamino" ? point.kaminoBps : point.meteoraBps,
      }));
      const gross = pool.rateQuality === "ok" ? pool.apyBps : null;
      const apr = pool.rateQuality === "ok" ? pool.aprBps : null;
      const peer = pool.venue === "kamino" ? delta.meteora : delta.kamino;
      const peerBps = peer && peer.rateQuality === "ok" ? peer.apyBps : null;
      const highPrint =
        gross !== null &&
        delta.classification.unusual &&
        (peerBps === null || gross >= peerBps);
      venues.push({
        id: pool.id,
        venue: pool.venue,
        family: venueFamily(pool.venue),
        symbol: pool.symbol,
        mint: pool.mint,
        aprBps: apr,
        apyBps: gross,
        quality: pool.rateQuality,
        unusual: highPrint,
        unusualReason: highPrint ? (delta.classification.unusualReason ?? null) : null,
        grossApyBps: gross,
        netApyBps: null,
        feeBps,
        priceImpactBps: null,
        quoted: false,
        source: venueSource(pool.venue),
        updatedAt: pool.updatedAt,
        history,
      });
    }
  }
  for (const pool of yieldSensor.getLpPools?.() ?? []) {
    const gross = pool.rateQuality === "ok" ? pool.apyBps : null;
    const apr = pool.rateQuality === "ok" ? pool.aprBps : null;
    const overCeiling = gross !== null && gross > env.APY_SANITY_CEILING_BPS;
    venues.push({
      id: pool.id,
      venue: pool.venue,
      family: "lp",
      symbol: pool.symbol,
      mint: pool.mint,
      aprBps: apr,
      apyBps: gross,
      quality: pool.rateQuality,
      unusual: overCeiling,
      unusualReason: overCeiling
        ? "Unusually high. Check whether this is a temporary incentive or a stale read."
        : null,
      grossApyBps: gross,
      netApyBps: null,
      feeBps,
      priceImpactBps: null,
      quoted: false,
      source: venueSource(pool.venue),
      updatedAt: pool.updatedAt,
      history: [],
    });
  }
  venues.sort((a, b) => (b.apyBps ?? -1) - (a.apyBps ?? -1));

  const rows: YieldMonitorRow[] =
    observedRows.length > 0
      ? observedRows
      : PLACEHOLDER_ASSETS.map((asset) => ({
          symbol: asset.symbol,
          mint: asset.mint,
          kaminoApyBps: null,
          meteoraApyBps: null,
          deltaApyBps: null,
          meetsTrigger: false,
          status: "no-pool",
          reason: snapshot.lastScanAt
            ? "The last check did not return a rate for this asset."
            : "No check yet.",
          unusual: false,
          unusualReason: null,
          updatedAt: null,
          observed: false,
          source: "Not checked",
          history: [],
        }));

  const lastQuote = lastSwap
    ? {
        inputMint: lastSwap.inputMint,
        outputMint: lastSwap.outputMint,
        inAmount: lastSwap.inAmount,
        outAmount: lastSwap.outAmount,
        jitoTipLamports: lastSwap.jitoTipLamports,
        dryRun: lastSwap.dryRun,
        at: snapshot.lastExecution?.loggedAt ?? null,
        symbol: lastSwap.symbol ?? null,
        fromVenue: lastSwap.fromVenue ?? null,
        toVenue: lastSwap.toVenue ?? null,
        expectedGapBps: lastSwap.expectedGapBps ?? null,
      }
    : null;

  const clawpump: ClawPumpView = {
    claimedSolLamports: revenue?.claimedSolLamports ?? null,
    unclaimedSolLamports: revenue?.unclaimedSolLamports ?? null,
    buybackShareLamports: revenue?.buybackShareLamports ?? null,
    buybackShareBps: revenue?.buybackShareBps ?? env.CLAWPUMP_BUYBACK_BPS,
    vivaclawMint: env.VIVACLAW_MINT,
    mintConfigured: Boolean(env.VIVACLAW_MINT.trim()),
    lastBuyback: txFromSwap(
      lastBuyback
        ? { ok: lastBuyback.ok, dryRun: lastBuyback.dryRun, error: lastBuyback.error }
        : null,
      clawPumpEngine.getLastBuybackAt(),
    ),
  };

  return {
    dryRun: true,
    cluster: snapshot.cluster,
    engineStatus,
    mode: snapshot.mode,
    haltReason: snapshot.haltReason,
    lastScanAt: snapshot.lastScanAt,
    signerLoaded: Boolean(snapshot.pubkey),
    pubkeyShort: snapshot.pubkey
      ? `${snapshot.pubkey.slice(0, 4)}…${snapshot.pubkey.slice(-4)}`
      : null,
    banners,
    probes: {
      rpc,
      jupiter,
      engine: {
        name: "Engine",
        ok: getEngineView().phase !== "error",
        configured: true,
        latencyMs: null,
        detail: getEngineView().phase,
      },
    },
    yields: {
      triggerBps: env.YIELD_DELTA_TRIGGER_BPS,
      ceilingBps: env.APY_SANITY_CEILING_BPS,
      rows,
      venues,
    },
    engine: getEngineView(),
    stale:
      snapshot.lastScanAt !== null &&
      Date.now() - snapshot.lastScanAt > env.SCAN_INTERVAL_MS * 2,
    scanIntervalMs: env.SCAN_INTERVAL_MS,
    risk,
    execution: {
      state: snapshot.mode,
      dryRun: true,
      lastQuote,
      lastTx: txFromSwap(
        lastSwap
          ? {
              ok: lastSwap.ok,
              dryRun: lastSwap.dryRun,
              error: lastSwap.error,
            }
          : snapshot.lastExecution
            ? {
                ok: snapshot.lastExecution.ok,
                dryRun: snapshot.lastExecution.dryRun,
                error: snapshot.lastExecution.error,
              }
            : null,
        snapshot.lastExecution?.loggedAt ?? null,
      ),
      positions: listPositions().map((row): PositionView => ({
        id: row.id,
        poolId: row.poolId,
        venue: row.venue,
        family: row.family,
        symbol: row.symbol,
        mint: row.mint,
        unit: row.unit,
        aprBps: row.aprBps,
        apyBps: row.apyBps,
        principal: row.principal,
        earned: earnedAmount(row),
        claimed: row.claimed,
        daily: dailyEarn(row.principal, row.aprBps),
        status: row.status,
        enteredAt: row.enteredAt,
        accruedAt: row.accruedAt,
        closedAt: row.closedAt,
        exitAmount: row.exitAmount,
      })),
      actions: [...listActions()].reverse(),
    },
    clawpump,
    logs: engineLogs(),
    generatedAt: Date.now(),
  };
}
