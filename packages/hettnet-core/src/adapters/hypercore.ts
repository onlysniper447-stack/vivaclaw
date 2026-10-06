import { cached } from "../cache";
import { CACHE_TTL, HYPERCORE_TOKENS } from "../constants";
import { hettnetNetwork, hypercoreInfoUrl, hyperliquidAppUrl } from "../network";
import { parseFinite, postJson } from "../http";
import { nearKink, supplyApy as modelSupplyApy } from "../rate-model";
import type { Opportunity } from "../types";

export type ReserveTuple = [
  number,
  {
    borrowYearlyRate?: string;
    supplyYearlyRate?: string;
    utilization?: string;
    oraclePx?: string;
    ltv?: string;
    totalSupplied?: string;
    totalBorrowed?: string;
    balance?: string;
  },
];

export interface SpotToken {
  name?: string;
  index?: number;
  evmContract?: { address?: string } | null;
}

interface SpotMeta {
  tokens?: SpotToken[];
}

const STABLE_SYMBOLS = new Set(["USDC", "USDT0", "USDH"]);
const COLLATERAL_SYMBOLS = new Set(["HYPE", "UBTC"]);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function fetchHyperCoreOpportunities(): Promise<Opportunity[]> {
  return cached(`hypercore:reserves:${hettnetNetwork()}`, CACHE_TTL.hypercoreMs, loadHyperCore);
}

async function loadHyperCore(): Promise<Opportunity[]> {
  const url = hypercoreInfoUrl();
  const [rows, meta] = await Promise.all([
    postJson<ReserveTuple[]>(url, { type: "allBorrowLendReserveStates" }),
    postJson<SpotMeta>(url, { type: "spotMeta" }).catch(() => null),
  ]);
  const fetchedAt = Date.now();
  if (!Array.isArray(rows)) return [];
  const tokens = Array.isArray(meta?.tokens) ? meta.tokens : [];
  return rows
    .map((row) => mapHyperCoreReserve(row, fetchedAt, tokens))
    .filter((row): row is Opportunity => row !== null);
}

export function resolveHyperCoreToken(
  index: number,
  spotTokens: SpotToken[] = [],
): { symbol: string; label: string; evm: string | null; kind: "stable" | "collateral" | undefined } {
  const spot = spotTokens.find((token) => token.index === index);
  const catalog = hettnetNetwork() === "mainnet" ? HYPERCORE_TOKENS[index] : undefined;
  const symbol = spot?.name ?? catalog?.symbol ?? `TOKEN-${index}`;
  const evm = cleanEvm(spot?.evmContract?.address) ?? cleanEvm(catalog?.evm);
  const kind = catalog?.kind ?? kindFromSymbol(symbol);
  const label = symbol === "USDC" ? "USDC (HyperCore)" : (catalog?.label ?? symbol);
  return { symbol, label, evm, kind };
}

export function mapHyperCoreReserve(
  row: ReserveTuple,
  fetchedAt: number,
  spotTokens: SpotToken[] = [],
): Opportunity | null {
  const index = row[0];
  const state = row[1];
  if (typeof index !== "number" || !state) return null;
  const meta = resolveHyperCoreToken(index, spotTokens);
  const supply = parseFinite(state.supplyYearlyRate);
  const util = parseFinite(state.utilization);
  const supplied = parseFinite(state.totalSupplied);
  const borrowed = parseFinite(state.totalBorrowed);
  const tvl = supplied;
  const risks: string[] = [];

  if (meta.kind === "collateral") {
    risks.push("collateral-no-interest");
  }
  if (meta.symbol === "USDC") {
    risks.push("hypercore-usdc-is-not-circle-usdc");
  }
  if (util !== null && meta.kind === "stable" && nearKink(util)) {
    risks.push("kink-proximity");
  }
  if (meta.kind === "stable" && supply !== null && util !== null) {
    const modeled = modelSupplyApy(util);
    if (Math.abs(modeled - supply) > 0.0005) {
      risks.push("rate-model-divergence");
    }
  }
  if (supply === 0) risks.push("zero-print");

  const oracle = parseFinite(state.oraclePx);
  const tvlUsd = tvl !== null && oracle !== null ? tvl * oracle : tvl;

  return {
    id: `hypercore:lend:${index}`,
    type: "lending",
    venue: "hypercore",
    layer: "core",
    assets: [{ symbol: meta.label, id: meta.evm ?? `core:${index}` }],
    apyTotal: supply,
    apyBase: supply,
    apyIncentive: 0,
    apr: null,
    tvl: tvlUsd,
    supplied,
    borrowed,
    utilization: util,
    volume24h: null,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: null,
    depthUsd: null,
    oraclePx: oracle,
    ilClass: null,
    risks,
    source: "hypercore:allBorrowLendReserveStates",
    url: hyperliquidAppUrl(),
    verified: true,
    fetchedAt,
    stale: false,
  };
}

function cleanEvm(address: string | null | undefined): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS) return null;
  return lower;
}

function kindFromSymbol(symbol: string): "stable" | "collateral" | undefined {
  const upper = symbol.toUpperCase();
  if (STABLE_SYMBOLS.has(upper)) return "stable";
  if (COLLATERAL_SYMBOLS.has(upper)) return "collateral";
  return undefined;
}
