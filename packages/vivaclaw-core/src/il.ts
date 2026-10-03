import type { IlClass } from "./types";

const STABLES = new Set(
  [
    "USDC",
    "USDT",
    "USDT0",
    "USD₮0",
    "USDH",
    "USDE",
    "USDhl",
    "USDHL",
    "USDM",
    "USR",
    "USH",
    "FEUSDC",
    "FEUSDCV2",
    "FEUSDT0",
    "FEUSDT0V2",
    "FEUSDE",
    "FEUSDHL",
  ].map(norm),
);

const HYPE_CORRELATED = new Set(
  [
    "HYPE",
    "WHYPE",
    "KHYPE",
    "WSTHYPE",
    "BEHYPE",
    "LHYPE",
    "AHYPE",
    "ΑHYPE",
    "FEHYPE",
    "FEHYPEV2",
    "MCHYPE",
    "LIQUIDHYPE",
  ].map(norm),
);

function norm(symbol: string): string {
  return symbol.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function ilClass(symbols: string[]): IlClass {
  const names = symbols.map(norm).filter(Boolean);
  if (names.length < 2) return "volatile";
  if (names.every((n) => STABLES.has(n))) return "stable-stable";
  if (names.every((n) => HYPE_CORRELATED.has(n))) return "correlated";
  return "volatile";
}

export function isStableSymbol(symbol: string): boolean {
  return STABLES.has(norm(symbol));
}

export const CL_RANGE_CAVEAT =
  "Concentrated-liquidity fee APR assumes the position stays in range. Out of range, fee earnings stop.";
