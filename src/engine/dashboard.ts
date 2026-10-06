import {
  discoverOpportunities,
  hypercoreInfoUrl,
  hyperevmRpcUrl,
  INDICATION_DISCLAIMER,
  mainnetResearchEnabled,
  scoreOpportunity,
  type Indication,
  type Opportunity,
  type VenueSlug,
} from "hettnet-core";
import { classifyAsset } from "@/engine/classify";
import { earnedAmount, listActions, listPositions } from "@/engine/positions";
import { dailyEarn } from "@/lib/accrual";
import { venueFamily } from "@/lib/venues";
import { setOpportunitySnapshot } from "@/engine/opportunity-store";
import type {
  BannerKind,
  DashboardPayload,
  PositionView,
  ServiceProbe,
  VenueYieldRow,
  YieldMonitorRow,
} from "@/types/dashboard";
import type { EngineView, SourceName, SourceProgress, VenueId } from "@/types/hettnet";

function skipNetwork(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function idleSource(): SourceProgress {
  return { state: "idle", message: null };
}

function toBps(decimal: number | null): number | null {
  if (decimal === null || !Number.isFinite(decimal)) return null;
  return Math.round(decimal * 10_000);
}

function asVenue(venue: VenueSlug): VenueId {
  return venue;
}

function sourceState(
  errors: { source: string; message: string }[],
  name: SourceName,
  count: number,
): SourceProgress {
  const err = errors.find((row) => row.source === name || row.source.startsWith(name));
  if (err) return { state: "error", message: err.message };
  if (!mainnetResearchEnabled() && (name === "llama" || name === "morpho" || name === "dexscreener" || name === "hyperlend")) {
    return { state: "idle", message: "skipped on testnet" };
  }
  if (count > 0) return { state: "ok", message: `${count} prints` };
  return { state: "ok", message: "no prints" };
}

function qualityOf(opp: Opportunity): VenueYieldRow["quality"] {
  if (opp.paused) return "suspect";
  if (opp.apyTotal === 0) return "suspect";
  if (opp.risks.includes("apy-outlier") || opp.risks.includes("zero-print")) return "suspect";
  if (opp.apyTotal === null && opp.apyBase === null) return "missing";
  return "ok";
}

function mapVenueRow(opp: Opportunity, ceilingBps: number): VenueYieldRow {
  const apyBps = toBps(opp.apyTotal ?? opp.apyBase);
  const aprBps = toBps(opp.apr);
  const overCeiling = apyBps !== null && apyBps > ceilingBps;
  const signal = opp.signal ?? scoreOpportunity(opp, { ceilingApy: ceilingBps / 10_000 });
  return {
    id: opp.id,
    venue: asVenue(opp.venue),
    family: venueFamily(asVenue(opp.venue)),
    symbol: opp.assets.map((a) => a.symbol).join("/"),
    mint: opp.assets[0]?.id ?? opp.id,
    aprBps,
    apyBps,
    quality: qualityOf(opp),
    indication: signal.indication,
    reasons: signal.reasons,
    alerts: signal.alerts,
    unusual: overCeiling || signal.alerts.includes("kink-proximity"),
    unusualReason: overCeiling
      ? "Unusually high. Check whether this is a temporary incentive or a stale read."
      : signal.alerts.includes("kink-proximity")
        ? "Utilization is near the 80% kink. Borrow APY steps up above that level."
        : signal.reasons[0] ?? null,
    grossApyBps: apyBps,
    netApyBps: null,
    feeBps: 0,
    priceImpactBps: null,
    quoted: false,
    source: opp.source,
    updatedAt: opp.fetchedAt,
    history: [],
  };
}

function gapRows(opps: Opportunity[], triggerBps: number, ceilingBps: number): YieldMonitorRow[] {
  const groups = new Map<string, Opportunity[]>();
  for (const opp of opps) {
    if (opp.type !== "lending" && opp.type !== "vault") continue;
    const key = (opp.assets[0]?.id ?? "").toLowerCase();
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(opp);
    groups.set(key, list);
  }

  const rows: YieldMonitorRow[] = [];
  for (const [mint, list] of groups) {
    const core = list.find((row) => row.venue === "hypercore");
    const evm = list
      .filter((row) => row.venue !== "hypercore")
      .sort((a, b) => (b.apyTotal ?? -1) - (a.apyTotal ?? -1))[0];
    if (!core && !evm) continue;
    const hypercoreApyBps = toBps(core?.apyTotal ?? null);
    const hyperevmApyBps = toBps(evm?.apyTotal ?? null);
    const classification = classifyAsset(hyperevmApyBps, hypercoreApyBps, triggerBps, { ceilingBps });
    rows.push({
      symbol: (evm ?? core)?.assets[0]?.symbol ?? mint,
      mint,
      hypercoreApyBps,
      hyperevmApyBps,
      deltaApyBps: classification.gap,
      meetsTrigger: classification.status === "above",
      status: classification.status,
      reason: classification.reason ?? null,
      unusual: classification.unusual,
      unusualReason: classification.unusualReason ?? null,
      updatedAt: (evm ?? core)?.fetchedAt ?? null,
      observed: true,
      source: [core?.source, evm?.source].filter(Boolean).join(" · ") || "Hyperliquid",
      history: [],
    });
  }
  return rows.sort((a, b) => Math.abs(b.deltaApyBps ?? 0) - Math.abs(a.deltaApyBps ?? 0));
}

function engineView(
  errors: { source: string; message: string }[],
  opps: Opportunity[],
  fetchedAt: number,
): EngineView {
  const count = (name: string) => opps.filter((row) => row.source.includes(name) || row.venue === name).length;
  const sources: Record<SourceName, SourceProgress> = {
    hypercore: sourceState(errors, "hypercore", count("hypercore")),
    llama: sourceState(errors, "llama", count("defillama")),
    morpho: sourceState(errors, "morpho", count("morpho")),
    dexscreener: sourceState(errors, "dexscreener", count("dexscreener")),
    hyperlend: sourceState(errors, "hyperlend", count("hyperlend")),
  };
  const failed = errors.length > 0 && opps.length === 0;
  return {
    phase: failed ? "error" : "idle",
    reason: failed ? errors.map((e) => e.message).join(" ") : null,
    lastSuccessAt: opps.length > 0 ? fetchedAt : null,
    sources,
  };
}

async function probeHyperCore(): Promise<ServiceProbe> {
  const started = Date.now();
  try {
    const res = await fetch(hypercoreInfoUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "allBorrowLendReserveStates" }),
      signal: AbortSignal.timeout(6_000),
    });
    return {
      name: "HyperCore",
      ok: res.ok,
      configured: true,
      latencyMs: Date.now() - started,
      detail: res.ok ? "allBorrowLendReserveStates" : `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      name: "HyperCore",
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "HyperCore did not respond",
    };
  }
}

async function probeHyperEvm(): Promise<ServiceProbe> {
  const started = Date.now();
  const url = hyperevmRpcUrl();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(6_000),
    });
    const body = (await res.json()) as { result?: string };
    const ok = body.result === "0x3e6";
    return {
      name: "HyperEVM",
      ok,
      configured: true,
      latencyMs: Date.now() - started,
      detail: ok ? "chainId 998 testnet" : `chainId ${body.result ?? "unknown"}`,
    };
  } catch (error) {
    return {
      name: "HyperEVM",
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "HyperEVM RPC did not respond",
    };
  }
}

function dashboardTuning() {
  const triggerBps = Number(process.env.YIELD_DELTA_TRIGGER_BPS);
  const ceilingBps = Number(process.env.APY_SANITY_CEILING_BPS);
  const scanIntervalMs = Number(process.env.SCAN_INTERVAL_MS);
  return {
    triggerBps: Number.isFinite(triggerBps) && triggerBps > 0 ? triggerBps : 350,
    ceilingBps: Number.isFinite(ceilingBps) && ceilingBps > 0 ? ceilingBps : 3_000,
    scanIntervalMs: Number.isFinite(scanIntervalMs) && scanIntervalMs > 0 ? scanIntervalMs : 15_000,
  };
}

export async function getDashboardPayload(): Promise<DashboardPayload> {
  const env = dashboardTuning();
  if (skipNetwork()) {
    return emptyPayload(env.triggerBps, env.ceilingBps, env.scanIntervalMs);
  }

  const result = await discoverOpportunities();
  setOpportunitySnapshot(result.opportunities, result.fetchedAt, result.errors);
  const [hyperevm, info] = await Promise.all([probeHyperEvm(), probeHyperCore()]);
  const engine = engineView(result.errors, result.opportunities, result.fetchedAt);
  const venues = result.opportunities.map((opp) => mapVenueRow(opp, env.ceilingBps));
  const rows = gapRows(result.opportunities, env.triggerBps, env.ceilingBps);
  const banners: BannerKind[] = ["dry-run"];
  if (!hyperevm.ok || !info.ok) banners.push("error");
  else banners.push("safe");

  return {
    dryRun: true,
    cluster: "hyperliquid",
    engineStatus: engine.phase === "error" ? "IDLE" : "IDLE",
    mode: "idle",
    haltReason: engine.reason,
    lastScanAt: result.fetchedAt,
    signerLoaded: false,
    addressShort: null,
    banners,
    probes: {
      rpc: info,
      hyperevm,
      engine: {
        name: "Engine",
        ok: engine.phase !== "error",
        configured: true,
        latencyMs: null,
        detail: engine.phase,
      },
    },
    yields: {
      triggerBps: env.triggerBps,
      ceilingBps: env.ceilingBps,
      rows,
      venues,
      enterCount: countIndication(venues, "ENTER"),
      watchCount: countIndication(venues, "WATCH"),
      avoidCount: countIndication(venues, "AVOID"),
    },
    alerts: result.alerts,
    disclaimer: result.disclaimer || INDICATION_DISCLAIMER,
    engine,
    stale: false,
    scanIntervalMs: env.scanIntervalMs,
    risk: null,
    execution: {
      state: "idle",
      dryRun: true,
      lastQuote: null,
      lastTx: { status: "none", at: null },
      positions: listPositions().map(
        (row): PositionView => ({
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
        }),
      ),
      actions: [...listActions()].reverse(),
    },
    logs: [],
    generatedAt: Date.now(),
  };
}

function countIndication(venues: VenueYieldRow[], indication: Indication): number {
  return venues.filter((row) => row.indication === indication).length;
}

function emptyPayload(triggerBps: number, ceilingBps: number, scanIntervalMs: number): DashboardPayload {
  return {
    dryRun: true,
    cluster: "hyperliquid",
    engineStatus: "IDLE",
    mode: "idle",
    haltReason: null,
    lastScanAt: null,
    signerLoaded: false,
    addressShort: null,
    banners: ["dry-run"],
    probes: {
      rpc: { name: "HyperCore", ok: true, configured: true, latencyMs: null, detail: "probe skipped during build" },
      hyperevm: { name: "HyperEVM", ok: true, configured: true, latencyMs: null, detail: "probe skipped during build" },
      engine: { name: "Engine", ok: true, configured: true, latencyMs: null, detail: "idle" },
    },
    yields: { triggerBps, ceilingBps, rows: [], venues: [], enterCount: 0, watchCount: 0, avoidCount: 0 },
    alerts: [],
    disclaimer: INDICATION_DISCLAIMER,
    engine: {
      phase: "idle",
      reason: null,
      lastSuccessAt: null,
      sources: {
        hypercore: idleSource(),
        llama: idleSource(),
        morpho: idleSource(),
        dexscreener: idleSource(),
        hyperlend: idleSource(),
      },
    },
    stale: false,
    scanIntervalMs,
    risk: null,
    execution: {
      state: "idle",
      dryRun: true,
      lastQuote: null,
      lastTx: { status: "none", at: null },
      positions: [],
      actions: [],
    },
    logs: [],
    generatedAt: Date.now(),
  };
}
