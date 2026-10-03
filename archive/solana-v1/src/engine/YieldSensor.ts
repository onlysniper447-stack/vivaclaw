import { singleton } from "@/engine/singleton";
import { address } from "@solana/kit";
import {
  DEFAULT_RECENT_SLOT_DURATION_MS,
  getCurrentLedgerInstant,
  KaminoMarket,
  type KaminoReserve,
} from "@kamino-finance/klend-sdk";
import VaultImpl from "@meteora-ag/vault-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getKitRpc } from "@/lib/solana/connection";
import { getServerEnv } from "@/lib/env";
import {
  BPS_DENOMINATOR,
  KAMINO_MAIN_MARKET,
  NATIVE_SOL_MINT,
  PYTH_PRICE_IDS,
  TOKEN_PUBKEYS,
  TOKENS,
} from "@/lib/constants";
import { classifyAsset } from "@/engine/classify";
import { logError, logInfo, logWarn } from "@/engine/logger";
import { retry, withTimeout } from "@/engine/retry";
import { ratesFromApy } from "@/engine/rates";
import { scanLpPools } from "@/engine/sensors/lp";
import type { SourceProgress, YieldDelta, YieldPool } from "@/types/vivaclaw";

const METEORA_API = "https://merv2-api.meteora.ag";
const METEORA_API_LEGACY = "https://merv2-api.mercurial.finance";

const WATCH_MINTS = [
  { symbol: "SOL", mint: NATIVE_SOL_MINT, decimals: 9, pyth: PYTH_PRICE_IDS.SOL_USD },
  { symbol: "USDC", mint: TOKENS.USDC.mint, decimals: 6, pyth: PYTH_PRICE_IDS.USDC_USD },
  { symbol: "USDT", mint: TOKENS.USDT.mint, decimals: 6, pyth: PYTH_PRICE_IDS.USDT_USD },
] as const;

function triggerBps(): number {
  return getServerEnv().YIELD_DELTA_TRIGGER_BPS;
}

function asDecimalApy(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  // Indexed APYs sometimes arrive as 8.5 (percent) and sometimes as 0.085.
  if (n > 1.5) return n / 100;
  return n;
}

/** Prefer a positive indexed print; otherwise use the on-chain estimate. Zero is not usable. */
export function resolveIndexedApy(indexed: number | null, fallback: number): number {
  if (indexed !== null && indexed > 0) return indexed;
  return fallback > 0 ? fallback : 0;
}

function mintKey(mint: PublicKey | string): PublicKey {
  if (mint === NATIVE_SOL_MINT || mint === "SOL") return NATIVE_MINT;
  if (typeof mint === "string") {
    return TOKEN_PUBKEYS[mint as keyof typeof TOKEN_PUBKEYS] ?? new PublicKey(mint);
  }
  return mint;
}

async function fetchJson(url: string, timeoutMs = 4_000): Promise<unknown> {
  return retry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        const err = new Error(`${url} → HTTP ${res.status}`) as Error & { noRetry?: boolean };
        if (res.status >= 400 && res.status < 500) err.noRetry = true;
        throw err;
      }
      return await res.json();
    } catch (error) {
      if (controller.signal.aborted) {
        const err = new Error(`${url} timed out after ${timeoutMs}ms`) as Error & { noRetry?: boolean };
        err.noRetry = true;
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  });
}

function pickApy(record: Record<string, unknown>): number | null {
  const keys = [
    "closest_apy",
    "closestApy",
    "average_apy",
    "averageApy",
    "long_apy",
    "longApy",
    "apy",
    "apy_pct",
  ];
  for (const key of keys) {
    const parsed = asDecimalApy(record[key]);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}

function walkForMintApy(node: unknown, mint: string): number | null {
  if (node === null || node === undefined) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = walkForMintApy(item, mint);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const rec = node as Record<string, unknown>;
  const token =
    String(rec.token_mint ?? rec.tokenMint ?? rec.mint ?? rec.token_address ?? "");
  if (token === mint) {
    const apy = pickApy(rec);
    if (apy !== null) return apy;
  }
  for (const value of Object.values(rec)) {
    if (value && typeof value === "object") {
      const nested = walkForMintApy(value, mint);
      if (nested !== null) return nested;
    }
  }
  return null;
}

async function fetchMeteoraApy(mint: string): Promise<number | null> {
  const endpoints = [
    `${METEORA_API}/apy_state/${mint}`,
    `${METEORA_API_LEGACY}/apy_state/${mint}`,
    `${METEORA_API}/vault_info`,
    `${METEORA_API_LEGACY}/vault_info`,
  ];

  for (const url of endpoints) {
    try {
      const body = await fetchJson(url);
      const apy = walkForMintApy(body, mint);
      if (apy !== null) return apy;
      if (body && typeof body === "object") {
        const direct = pickApy(body as Record<string, unknown>);
        if (direct !== null && url.includes(mint)) return direct;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function annualizeLockedProfit(totalAmount: number, lockedProfit: number): number {
  if (totalAmount <= 0 || lockedProfit <= 0) return 0;
  // Locked profit unlocks over ~6 hours on Dynamic Vaults; annualize the instantaneous yield.
  const sixHourRate = lockedProfit / totalAmount;
  return sixHourRate * (365 * 24) / 6;
}

export interface RateHistoryPoint {
  at: number;
  kaminoBps: number | null;
  meteoraBps: number | null;
}

const idleSource = (): SourceProgress => ({ state: "idle", message: null });

export class YieldSensor {
  private kaminoMarket: KaminoMarket | null = null;
  private pools: YieldPool[] = [];
  private lpPools: YieldPool[] = [];
  private deltas: YieldDelta[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private inflight: Promise<YieldDelta[]> | null = null;
  private history = new Map<string, RateHistoryPoint[]>();
  private sourceReport: { kamino: SourceProgress; meteora: SourceProgress; lp: SourceProgress } = {
    kamino: idleSource(),
    meteora: idleSource(),
    lp: idleSource(),
  };

  getPools(): YieldPool[] {
    return this.pools;
  }

  getLpPools(): YieldPool[] {
    return this.lpPools;
  }

  getDeltas(): YieldDelta[] {
    return this.deltas;
  }

  getHistory(mint: string): RateHistoryPoint[] {
    return this.history.get(mint) ?? [];
  }

  getSourceReport(): { kamino: SourceProgress; meteora: SourceProgress; lp: SourceProgress } {
    return this.sourceReport;
  }

  async pollOnce(): Promise<YieldDelta[]> {
    if (this.inflight) return this.inflight;
    this.inflight = this.runPoll().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async runPoll(): Promise<YieldDelta[]> {
    logInfo("SCANNING", "Yield sensor poll — Kamino, Meteora vaults, high-return LP (APR and APY)");
    this.sourceReport = {
      kamino: { state: "running", message: null },
      meteora: { state: "running", message: null },
      lp: { state: "running", message: null },
    };

    const [kaminoResult, meteoraResult, lpResult] = await Promise.allSettled([
      withTimeout(this.pollKamino(), 20_000, "Kamino"),
      withTimeout(this.pollMeteora(), 20_000, "Meteora"),
      withTimeout(scanLpPools(), 20_000, "LP"),
    ]);

    const kamino = kaminoResult.status === "fulfilled" ? kaminoResult.value : [];
    const meteora = meteoraResult.status === "fulfilled" ? meteoraResult.value : [];
    const lpScan = lpResult.status === "fulfilled" ? lpResult.value : null;
    const lp = lpScan?.pools ?? [];

    this.sourceReport.kamino =
      kaminoResult.status === "fulfilled"
        ? { state: "ok", message: `${kamino.length} reserves` }
        : {
            state: "error",
            message:
              kaminoResult.reason instanceof Error
                ? kaminoResult.reason.message
                : "Kamino did not respond",
          };
    this.sourceReport.meteora =
      meteoraResult.status === "fulfilled"
        ? { state: "ok", message: `${meteora.length} vaults` }
        : {
            state: "error",
            message:
              meteoraResult.reason instanceof Error
                ? meteoraResult.reason.message
                : "Meteora did not respond",
          };
    this.sourceReport.lp =
      lpResult.status === "fulfilled"
        ? lpScan?.report ?? { state: "error", message: "No USDC/USDT LP pool returned" }
        : {
            state: "error",
            message:
              lpResult.reason instanceof Error ? lpResult.reason.message : "LP venues did not respond",
          };

    if (kaminoResult.status === "rejected") {
      logWarn("SCANNING", `Kamino read failed: ${this.sourceReport.kamino.message}`);
    }
    if (meteoraResult.status === "rejected") {
      logWarn("SCANNING", `Meteora read failed: ${this.sourceReport.meteora.message}`);
    }
    if (this.sourceReport.lp.state === "error") {
      logWarn("SCANNING", `LP read failed: ${this.sourceReport.lp.message}`);
    }

    this.lpPools = lp;
    this.pools = [...kamino, ...meteora, ...lp];
    this.deltas = this.computeDeltas(kamino, meteora);

    let above = 0;
    let suspect = 0;
    for (const delta of this.deltas) {
      if (delta.classification.status === "above") above += 1;
      if (delta.classification.status === "suspect" || delta.classification.status === "error") {
        suspect += 1;
        logWarn("SCANNING", `${delta.symbol}: ${delta.classification.reason ?? "Check data"}`, {
          data: { mint: delta.mint, status: delta.classification.status },
        });
      }
      if (delta.classification.unusual && delta.classification.unusualReason) {
        logWarn("SCANNING", `${delta.symbol}: ${delta.classification.unusualReason}`, {
          data: { mint: delta.mint, gapBps: delta.classification.gap },
        });
      }
    }
    logInfo(
      "SCANNING",
      `Compared ${this.deltas.length} lend assets and ${lp.length} LP pools. ${above} above trigger. ${suspect} need a data check.`,
    );
    return this.deltas;
  }

  startPolling(intervalMs?: number): void {
    if (this.timer) return;
    const env = getServerEnv();
    const ms = intervalMs ?? env.SCAN_INTERVAL_MS;
    this.polling = true;
    void this.pollOnce();
    this.timer = setInterval(() => {
      if (!this.polling || this.inflight) return;
      void this.pollOnce().catch((error: unknown) => {
        logError("SCANNING", error instanceof Error ? error.message : String(error));
      });
    }, ms);
  }

  stopPolling(): void {
    this.polling = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private rateBps(pool: YieldPool | null): number | null {
    if (!pool) return null;
    if (pool.rateQuality === "suspect" || pool.apyBps === 0) return 0;
    return pool.apyBps;
  }

  private computeDeltas(kamino: YieldPool[], meteora: YieldPool[]): YieldDelta[] {
    const env = getServerEnv();
    const threshold = triggerBps();
    const now = Date.now();
    const kaminoByMint = new Map(kamino.map((p) => [p.mint, p]));
    const meteoraByMint = new Map(meteora.map((p) => [p.mint, p]));
    const mints = new Set([...kaminoByMint.keys(), ...meteoraByMint.keys()]);
    const out: YieldDelta[] = [];

    for (const mint of mints) {
      const k = kaminoByMint.get(mint) ?? null;
      const m = meteoraByMint.get(mint) ?? null;
      const classification = classifyAsset(this.rateBps(m), this.rateBps(k), threshold, {
        ceilingBps: env.APY_SANITY_CEILING_BPS,
        ratio: env.APY_SANITY_RATIO,
      });
      const gapBps = classification.gap;
      out.push({
        mint,
        symbol: m?.symbol ?? k?.symbol ?? mint.slice(0, 4),
        kamino: k,
        meteora: m,
        deltaApy: gapBps === null ? 0 : gapBps / BPS_DENOMINATOR,
        deltaApyBps: gapBps,
        meetsTrigger: classification.status === "above" && gapBps !== null,
        classification,
        updatedAt: now,
      });
      const prior = this.history.get(mint) ?? [];
      prior.push({
        at: now,
        kaminoBps: k && k.rateQuality === "ok" ? k.apyBps : null,
        meteoraBps: m && m.rateQuality === "ok" ? m.apyBps : null,
      });
      if (prior.length > 24) prior.splice(0, prior.length - 24);
      this.history.set(mint, prior);
    }

    out.sort((a, b) => {
      const ag = a.classification.gap;
      const bg = b.classification.gap;
      if (ag === null && bg === null) return a.symbol.localeCompare(b.symbol);
      if (ag === null) return 1;
      if (bg === null) return -1;
      return Math.abs(bg) - Math.abs(ag);
    });
    return out;
  }

  private async pollKamino(): Promise<YieldPool[]> {
    const env = getServerEnv();
    const rpc = getKitRpc();
    try {
      if (!this.kaminoMarket) {
        this.kaminoMarket = await KaminoMarket.load(
          rpc,
          address(KAMINO_MAIN_MARKET),
          DEFAULT_RECENT_SLOT_DURATION_MS,
        );
      } else {
        await this.kaminoMarket.reload();
      }
    } catch (error) {
      logError("SCANNING", `Kamino market load failed: ${String(error)}`);
      this.kaminoMarket = null;
      throw error;
    }

    if (!this.kaminoMarket) {
      throw new Error("Kamino main market returned null");
    }

    const instant = await getCurrentLedgerInstant(rpc, env.SOLANA_COMMITMENT);
    const now = Date.now();
    const pools: YieldPool[] = [];

    for (const reserve of this.kaminoMarket.getReserves()) {
      const pool = this.fromKaminoReserve(reserve, instant, now);
      if (pool) pools.push(pool);
    }
    if (pools.length === 0) {
      const sample = this.kaminoMarket.getReserves()[0];
      logWarn(
        "SCANNING",
        `Kamino returned no watched reserves (SOL/USDC/USDT). Sample mint: ${
          sample ? String(sample.getLiquidityMint()) : "none"
        }`,
      );
    }
    return pools;
  }

  private fromKaminoReserve(
    reserve: KaminoReserve,
    instant: Parameters<KaminoReserve["totalSupplyAPY"]>[0],
    now: number,
  ): YieldPool | null {
    const mint = String(reserve.getLiquidityMint());
    const watched = WATCH_MINTS.find((w) => w.mint === mint);
    if (!watched) return null;
    const symbol = watched.symbol;
    const decimals = reserve.stats.decimals;
    const apy = reserve.totalSupplyAPY(instant);
    if (!Number.isFinite(apy) || apy < 0) return null;

    const supply = Number(reserve.stats.mintTotalSupply.toString());
    const tvlUsd = watched?.symbol === "SOL" ? 0 : supply / 10 ** decimals;

    return {
      id: `kamino:${mint}`,
      venue: "kamino",
      mint,
      symbol,
      decimals,
      ...ratesFromApy(apy),
      tvlUsd,
      liquidityAtomic: reserve.stats.mintTotalSupply.toFixed(0),
      venueAddress: String(reserve.address),
      updatedAt: now,
      rateQuality: apy === 0 ? "suspect" : "ok",
    };
  }

  private async pollMeteora(): Promise<YieldPool[]> {
    const connection = getConnection();
    const env = getServerEnv();
    const now = Date.now();
    const pools: YieldPool[] = [];
    let failures = 0;

    for (const asset of WATCH_MINTS) {
      try {
        const vault = await VaultImpl.create(connection, mintKey(asset.mint), {
          cluster: env.AGENT_CLUSTER,
        });
        await vault.refreshVaultState();
        const indexedApy = withTimeout(fetchMeteoraApy(asset.mint), 6_000, "Meteora APY index").catch(
          () => null,
        );
        const [lpSupply, withdrawable, indexed] = await Promise.all([
          vault.getVaultSupply(),
          vault.getWithdrawableAmount(),
          indexedApy,
        ]);

        const totalAmount = Number(vault.vaultState.totalAmount.toString());
        const locked = Number(
          vault.vaultState.lockedProfitTracker.lastUpdatedLockedProfit.toString(),
        );
        const fallbackApy = annualizeLockedProfit(totalAmount, locked);
        const apy = resolveIndexedApy(indexed, fallbackApy);
        const tvlUsd =
          asset.symbol === "SOL" ? 0 : totalAmount / 10 ** asset.decimals;

        pools.push({
          id: `meteora:${asset.mint}`,
          venue: "meteora",
          mint: asset.mint,
          symbol: asset.symbol,
          decimals: asset.decimals,
          ...ratesFromApy(apy),
          tvlUsd,
          liquidityAtomic: withdrawable.toString(),
          venueAddress: vault.vaultPda.toBase58(),
          updatedAt: now,
          rateQuality: apy === 0 ? "suspect" : "ok",
        });

        void lpSupply;
      } catch (error) {
        failures += 1;
        logWarn("SCANNING", `Meteora vault ${asset.symbol} unavailable: ${String(error)}`);
      }
    }

    if (pools.length === 0 && failures === WATCH_MINTS.length) {
      throw new Error("Meteora vaults did not respond");
    }
    return pools;
  }
}

export const yieldSensor = singleton("yieldSensor.aprApy", () => new YieldSensor());
