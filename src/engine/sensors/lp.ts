/**
 * Read-only LP fee yields.
 * VivaClaw keeps a short list of high-return pools that also clear quality gates.
 * This is not every Solana pool — only watched SOL/stable books on Meteora, Raydium, and Orca.
 * This module never signs or sends.
 */

import { NATIVE_SOL_MINT, USDC_MINT, USDT_MINT } from "@/lib/constants";
import { withTimeout } from "@/engine/retry";
import { logWarn } from "@/engine/logger";
import { ratesFromApr, toBps } from "@/engine/rates";
import type { SourceProgress, VenueId, YieldPool } from "@/types/vivaclaw";

export const LP_MIN_TVL_USD = 250_000;
export const LP_MIN_VOLUME_24H_USD = 50_000;
/** 3.00% fee APR. Below this is not a high-return LP. */
export const LP_MIN_APR_BPS = 300;
/** 80.00%. Above this is a spike or farm print, not a good LP. */
export const LP_MAX_APR_BPS = 8_000;
export const LP_MAX_RESULTS = 5;
export const LP_MAX_PER_VENUE = 2;

const WATCH_MINTS = [NATIVE_SOL_MINT, USDC_MINT, USDT_MINT] as const;
const MINT_SYMBOL: Record<string, string> = {
  [NATIVE_SOL_MINT]: "SOL",
  [USDC_MINT]: "USDC",
  [USDT_MINT]: "USDT",
};

const PAIRS = [
  { query: "SOL-USDC", mint1: NATIVE_SOL_MINT, mint2: USDC_MINT },
  { query: "SOL-USDT", mint1: NATIVE_SOL_MINT, mint2: USDT_MINT },
  { query: "USDC-USDT", mint1: USDC_MINT, mint2: USDT_MINT },
] as const;

const METEORA_DLMM = "https://dlmm.datapi.meteora.ag/pools";
const METEORA_DAMM = "https://damm-v2.datapi.meteora.ag/pools";
const RAYDIUM_POOLS = "https://api-v3.raydium.io/pools/info/mint";
const ORCA_POOLS = "https://api.orca.so/v2/solana/pools/search";

export type LpVenue = Extract<VenueId, "meteora-dlmm" | "meteora-damm" | "raydium" | "orca">;

export interface LpCandidate {
  venue: LpVenue;
  address: string;
  mintA: string;
  mintB: string;
  /** Simple annualized fee rate (daily × 365). */
  apr: number;
  tvlUsd: number;
  volume24h: number;
}

export interface LpScanResult {
  pools: YieldPool[];
  report: SourceProgress;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isWatchedPair(mintA: string | null | undefined, mintB: string | null | undefined): boolean {
  if (!mintA || !mintB || mintA === mintB) return false;
  const watch = new Set<string>(WATCH_MINTS);
  return watch.has(mintA) && watch.has(mintB);
}

export function isUsdcUsdtPair(mintA: string | null | undefined, mintB: string | null | undefined): boolean {
  if (!mintA || !mintB) return false;
  const set = new Set([mintA, mintB]);
  return set.has(USDC_MINT) && set.has(USDT_MINT);
}

function orderMints(mintA: string, mintB: string): [string, string] {
  const rank = (mint: string) => {
    const index = (WATCH_MINTS as readonly string[]).indexOf(mint);
    return index === -1 ? 99 : index;
  };
  return rank(mintA) <= rank(mintB) ? [mintA, mintB] : [mintB, mintA];
}

export function pairSymbol(mintA: string, mintB: string): string {
  const [left, right] = orderMints(mintA, mintB);
  return `${MINT_SYMBOL[left] ?? "TOKEN"}/${MINT_SYMBOL[right] ?? "TOKEN"}`;
}

export function primaryMint(mintA: string, mintB: string): string {
  return orderMints(mintA, mintB)[0];
}

/** 24h fee / TVL as a decimal, simple-annualized (APR). */
export function meteoraDecimalApy(fees24h: number | null, tvlUsd: number | null): number {
  if (fees24h === null || tvlUsd === null || tvlUsd <= 0 || fees24h < 0) return 0;
  return (fees24h / tvlUsd) * 365;
}

/** Raydium `apr` fields are percents: 1.52 → 1.52%. */
export function percentToDecimal(percent: number | null): number {
  if (percent === null || !Number.isFinite(percent) || percent <= 0) return 0;
  return percent / 100;
}

/** Orca `yieldOverTvl` is fee/TVL for the window. */
export function annualizeDailyRatio(daily: number | null): number {
  if (daily === null || !Number.isFinite(daily) || daily <= 0) return 0;
  return daily * 365;
}

export function annualizeWindowRatio(ratio: number | null, days: number): number {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0 || days <= 0) return 0;
  return ratio * (365 / days);
}

export function isGoodHighReturn(candidate: LpCandidate): boolean {
  if (!isWatchedPair(candidate.mintA, candidate.mintB)) return false;
  if (!(candidate.tvlUsd >= LP_MIN_TVL_USD)) return false;
  if (!(candidate.volume24h >= LP_MIN_VOLUME_24H_USD)) return false;
  const bps = toBps(candidate.apr);
  if (bps < LP_MIN_APR_BPS) return false;
  if (bps > LP_MAX_APR_BPS) return false;
  return true;
}

export function selectBestLps(candidates: LpCandidate[]): LpCandidate[] {
  const seen = new Set<string>();
  const perVenue = new Map<string, number>();
  const ranked = candidates.filter(isGoodHighReturn).sort((a, b) => b.apr - a.apr);
  const picked: LpCandidate[] = [];

  for (const candidate of ranked) {
    if (seen.has(candidate.address)) continue;
    const used = perVenue.get(candidate.venue) ?? 0;
    if (used >= LP_MAX_PER_VENUE) continue;
    seen.add(candidate.address);
    perVenue.set(candidate.venue, used + 1);
    picked.push(candidate);
    if (picked.length >= LP_MAX_RESULTS) break;
  }
  return picked;
}

function asPool(candidate: LpCandidate): YieldPool {
  const rates = ratesFromApr(candidate.apr);
  return {
    id: `${candidate.venue}:${candidate.address}`,
    venue: candidate.venue,
    mint: primaryMint(candidate.mintA, candidate.mintB),
    symbol: pairSymbol(candidate.mintA, candidate.mintB),
    decimals: 6,
    ...rates,
    tvlUsd: candidate.tvlUsd,
    liquidityAtomic: Math.round(candidate.tvlUsd * 1_000_000).toString(),
    venueAddress: candidate.address,
    updatedAt: Date.now(),
    rateQuality: rates.apr > 0 ? "ok" : "suspect",
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const err = new Error(`${url} → HTTP ${res.status}`) as Error & { noRetry?: boolean };
    if (res.status >= 400 && res.status < 500) err.noRetry = true;
    throw err;
  }
  return res.json();
}

function readMeteoraRows(body: unknown, venue: Extract<LpVenue, "meteora-dlmm" | "meteora-damm">): LpCandidate[] {
  const payload = record(body);
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const candidates: LpCandidate[] = [];
  for (const item of rows) {
    const pool = record(item);
    if (!pool || pool.is_blacklisted === true) continue;
    const mintA = str(record(pool.token_x)?.address);
    const mintB = str(record(pool.token_y)?.address);
    if (!isWatchedPair(mintA, mintB) || !mintA || !mintB) continue;
    const address = str(pool.address);
    if (!address) continue;
    const tvlUsd = num(pool.tvl) ?? 0;
    const volume = record(pool.volume);
    const fees = record(pool.fees);
    candidates.push({
      venue,
      address,
      mintA,
      mintB,
      tvlUsd,
      volume24h: num(volume?.["24h"]) ?? 0,
      apr: meteoraDecimalApy(num(fees?.["24h"]), tvlUsd),
    });
  }
  return candidates;
}

function readRaydiumRows(body: unknown): LpCandidate[] {
  const root = record(body);
  const payload = record(root?.data);
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(root?.data) ? root.data : [];
  const candidates: LpCandidate[] = [];
  for (const item of rows) {
    const pool = record(item);
    if (!pool) continue;
    const mintA = str(record(pool.mintA)?.address);
    const mintB = str(record(pool.mintB)?.address);
    if (!isWatchedPair(mintA, mintB) || !mintA || !mintB) continue;
    const address = str(pool.id);
    if (!address) continue;
    const week = record(pool.week);
    const day = record(pool.day);
    const month = record(pool.month);
    candidates.push({
      venue: "raydium",
      address,
      mintA,
      mintB,
      tvlUsd: num(pool.tvl) ?? 0,
      volume24h: num(day?.volume) ?? 0,
      apr: percentToDecimal(num(week?.apr) ?? num(day?.apr) ?? num(month?.apr)),
    });
  }
  return candidates;
}

function readOrcaRows(body: unknown): LpCandidate[] {
  const payload = record(body);
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const candidates: LpCandidate[] = [];
  for (const item of rows) {
    const pool = record(item);
    if (!pool || pool.hasWarning === true) continue;
    const mintA = str(pool.tokenMintA);
    const mintB = str(pool.tokenMintB);
    if (!isWatchedPair(mintA, mintB) || !mintA || !mintB) continue;
    const address = str(pool.address);
    if (!address) continue;
    const stats = record(pool.stats);
    const day = record(stats?.["24h"]);
    const week = record(stats?.["7d"]);
    candidates.push({
      venue: "orca",
      address,
      mintA,
      mintB,
      tvlUsd: num(pool.tvlUsdc) ?? 0,
      volume24h: num(day?.volume) ?? 0,
      apr:
        annualizeWindowRatio(num(week?.yieldOverTvl), 7) ||
        annualizeDailyRatio(num(day?.yieldOverTvl) ?? num(pool.yieldOverTvl)),
    });
  }
  return candidates;
}

async function scanMeteoraDlmm(): Promise<LpCandidate[]> {
  const pages = await Promise.all(
    PAIRS.map((pair) =>
      fetchJson(`${METEORA_DLMM}?page=1&page_size=8&sort_by=tvl:desc&query=${pair.query}`),
    ),
  );
  return pages.flatMap((body) => readMeteoraRows(body, "meteora-dlmm"));
}

async function scanMeteoraDamm(): Promise<LpCandidate[]> {
  const pages = await Promise.all(
    PAIRS.map((pair) =>
      fetchJson(`${METEORA_DAMM}?page=1&page_size=8&sort_by=tvl:desc&query=${pair.query}`),
    ),
  );
  return pages.flatMap((body) => readMeteoraRows(body, "meteora-damm"));
}

async function scanRaydium(): Promise<LpCandidate[]> {
  const pages = await Promise.all(
    PAIRS.map((pair) =>
      fetchJson(
        `${RAYDIUM_POOLS}?mint1=${pair.mint1}&mint2=${pair.mint2}` +
          `&poolType=all&poolSortField=apr7d&sortType=desc&pageSize=8&page=1`,
      ),
    ),
  );
  return pages.flatMap(readRaydiumRows);
}

async function scanOrca(): Promise<LpCandidate[]> {
  const pages = await Promise.all(
    PAIRS.map((pair) =>
      fetchJson(
        `${ORCA_POOLS}?q=${pair.query}&minTvl=${LP_MIN_TVL_USD}&sortBy=yieldovertvl&sortDirection=desc&size=8&stats=24h,7d`,
      ),
    ),
  );
  return pages.flatMap(readOrcaRows);
}

export async function scanLpPools(): Promise<LpScanResult> {
  if (process.env.AGENT_CLUSTER && process.env.AGENT_CLUSTER !== "mainnet-beta") {
    return { pools: [], report: { state: "ok", message: "LP indexes run on mainnet-beta" } };
  }

  const settled = await Promise.allSettled([
    withTimeout(scanMeteoraDlmm(), 16_000, "Meteora DLMM"),
    withTimeout(scanMeteoraDamm(), 16_000, "Meteora DAMM"),
    withTimeout(scanRaydium(), 16_000, "Raydium"),
    withTimeout(scanOrca(), 16_000, "Orca"),
  ]);
  const names = ["Meteora DLMM", "Meteora DAMM", "Raydium", "Orca"] as const;
  const candidates: LpCandidate[] = [];
  const failed: string[] = [];

  settled.forEach((result, index) => {
    const name = names[index] ?? "LP";
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
      return;
    }
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    failed.push(`${name}: ${message}`);
    logWarn("SCANNING", `LP ${name} read failed: ${message}`);
  });

  const picked = selectBestLps(candidates);
  const pools = picked.map(asPool);

  if (pools.length === 0) {
    return {
      pools: [],
      report: {
        state: failed.length && candidates.length === 0 ? "error" : "ok",
        message:
          failed[0] ??
          "No LP cleared the return and quality bar (3%+ fee APR, deep book, real volume).",
      },
    };
  }

  return {
    pools,
    report: {
      state: "ok",
      message: failed.length
        ? `${pools.length} high-return LPs · ${failed[0]}`
        : `${pools.length} high-return LPs`,
    },
  };
}
