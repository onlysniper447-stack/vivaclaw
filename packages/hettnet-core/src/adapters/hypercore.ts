import { cached } from "../cache";
import { CACHE_TTL, HYPERCORE_INFO_URL, HYPERCORE_TOKENS } from "../constants";
import { parseFinite, postJson } from "../http";
import { nearKink, supplyApy as modelSupplyApy } from "../rate-model";
import type { Opportunity } from "../types";

type ReserveTuple = [
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

export async function fetchHyperCoreOpportunities(): Promise<Opportunity[]> {
  return cached("hypercore:reserves", CACHE_TTL.hypercoreMs, loadHyperCore);
}

async function loadHyperCore(): Promise<Opportunity[]> {
  const rows = await postJson<ReserveTuple[]>(HYPERCORE_INFO_URL, {
    type: "allBorrowLendReserveStates",
  });
  const fetchedAt = Date.now();
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => mapReserve(row, fetchedAt)).filter((row): row is Opportunity => row !== null);
}

function mapReserve(row: ReserveTuple, fetchedAt: number): Opportunity | null {
  const index = row[0];
  const state = row[1];
  if (typeof index !== "number" || !state) return null;
  const meta = HYPERCORE_TOKENS[index];
  const symbol = meta?.symbol ?? `TOKEN-${index}`;
  const label = meta?.label ?? symbol;
  const supply = parseFinite(state.supplyYearlyRate);
  const util = parseFinite(state.utilization);
  const tvl = parseFinite(state.totalSupplied);
  const risks: string[] = [];

  if (meta?.kind === "collateral") {
    risks.push("collateral-no-interest");
  }
  if (symbol === "USDC") {
    risks.push("hypercore-usdc-is-not-circle-usdc");
  }
  if (util !== null && meta?.kind === "stable" && nearKink(util)) {
    risks.push("kink-proximity");
  }
  if (meta?.kind === "stable" && supply !== null && util !== null) {
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
    assets: [{ symbol: label, id: meta?.evm ?? `core:${index}` }],
    apyTotal: supply,
    apyBase: supply,
    apyIncentive: 0,
    apr: null,
    tvl: tvlUsd,
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
    url: "https://app.hyperliquid.xyz",
    verified: true,
    fetchedAt,
    stale: false,
  };
}
