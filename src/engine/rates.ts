/**
 * APR is simple annualized (daily × 365).
 * APY compounds that same daily rate: (1 + daily)^365 − 1.
 */

const DAYS = 365;

export interface RatePair {
  apr: number;
  aprBps: number;
  apy: number;
  apyBps: number;
}

export function toBps(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 0) return 0;
  return Math.round(decimal * 10_000);
}

export function aprFromDaily(daily: number): number {
  if (!Number.isFinite(daily) || daily <= 0) return 0;
  return daily * DAYS;
}

export function apyFromDaily(daily: number): number {
  if (!Number.isFinite(daily) || daily <= 0) return 0;
  return (1 + daily) ** DAYS - 1;
}

export function apyFromApr(apr: number): number {
  if (!Number.isFinite(apr) || apr <= 0) return 0;
  return (1 + apr / DAYS) ** DAYS - 1;
}

export function aprFromApy(apy: number): number {
  if (!Number.isFinite(apy) || apy <= 0) return 0;
  return DAYS * ((1 + apy) ** (1 / DAYS) - 1);
}

export function ratesFromApr(apr: number): RatePair {
  const safe = Number.isFinite(apr) && apr > 0 ? apr : 0;
  const apy = apyFromApr(safe);
  return { apr: safe, aprBps: toBps(safe), apy, apyBps: toBps(apy) };
}

export function ratesFromApy(apy: number): RatePair {
  const safe = Number.isFinite(apy) && apy > 0 ? apy : 0;
  const apr = aprFromApy(safe);
  return { apr, aprBps: toBps(apr), apy: safe, apyBps: toBps(safe) };
}
