export const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function earnedFromApr(principal: number, aprBps: number, elapsedMs: number): number {
  if (!(principal > 0) || !(aprBps > 0) || !(elapsedMs > 0)) return 0;
  return principal * (aprBps / 10_000) * (elapsedMs / YEAR_MS);
}

export function dailyEarn(principal: number, aprBps: number): number {
  return earnedFromApr(principal, aprBps, YEAR_MS / 365);
}
