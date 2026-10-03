/**
 * HyperCore stablecoin borrow/lend rate model.
 * Official: borrow APY = 0.05 + 4.75 * max(0, utilization - 0.8),
 * compounded continuously and indexed hourly.
 * Protocol retains 10% of borrow interest → supply APY = borrow * util * 0.9.
 * Applies to stablecoins. HYPE and BTC collateral earn no interest.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-margin
 */

import type { SupplySimulation } from "./types";

export const STABLE_BASE_APY = 0.05;
export const STABLE_KINK = 0.8;
export const STABLE_KINK_SLOPE = 4.75;
export const PROTOCOL_RESERVE = 0.1;
export const KINK_BAND = 0.05;

export function borrowApy(utilization: number): number {
  if (!Number.isFinite(utilization) || utilization < 0) return STABLE_BASE_APY;
  return STABLE_BASE_APY + STABLE_KINK_SLOPE * Math.max(0, utilization - STABLE_KINK);
}

export function supplyApy(utilization: number): number {
  if (!Number.isFinite(utilization) || utilization <= 0) return 0;
  return borrowApy(utilization) * utilization * (1 - PROTOCOL_RESERVE);
}

export function nearKink(utilization: number): boolean {
  if (!Number.isFinite(utilization)) return false;
  return Math.abs(utilization - STABLE_KINK) <= KINK_BAND + 1e-12;
}

export function simulateSupplyApy(input: {
  totalSupplied: number;
  totalBorrowed: number;
  additionalSupply: number;
}): SupplySimulation {
  const supplied = Math.max(0, input.totalSupplied);
  const borrowed = Math.max(0, input.totalBorrowed);
  const add = Math.max(0, input.additionalSupply);
  const currentUtilization = supplied > 0 ? borrowed / supplied : 0;
  const nextSupplied = supplied + add;
  const nextUtilization = nextSupplied > 0 ? borrowed / nextSupplied : 0;
  const currentBorrowApy = borrowApy(currentUtilization);
  const currentSupplyApy = supplyApy(currentUtilization);
  const nextBorrowApy = borrowApy(nextUtilization);
  const nextSupplyApy = supplyApy(nextUtilization);
  const crossedKink =
    (currentUtilization - STABLE_KINK) * (nextUtilization - STABLE_KINK) < 0 ||
    currentUtilization === STABLE_KINK ||
    nextUtilization === STABLE_KINK;
  const near = nearKink(currentUtilization) || nearKink(nextUtilization);
  const warnings: string[] = [];
  if (near) {
    warnings.push(
      `Utilization ${pct(currentUtilization)} is within ${KINK_BAND * 100}pp of the ${STABLE_KINK * 100}% kink. Borrow APY steps from ${STABLE_BASE_APY * 100}% to ${STABLE_BASE_APY * 100}% + ${STABLE_KINK_SLOPE * 100}% × excess.`,
    );
  }
  if (crossedKink) {
    warnings.push(
      `This size crosses the ${STABLE_KINK * 100}% kink (${pct(currentUtilization)} → ${pct(nextUtilization)}).`,
    );
  }
  if (nextUtilization >= 1) {
    warnings.push("Simulated utilization reaches 100%. New borrows would be liquidity-constrained.");
  }
  return {
    currentUtilization,
    currentBorrowApy,
    currentSupplyApy,
    nextUtilization,
    nextBorrowApy,
    nextSupplyApy,
    crossedKink,
    nearKink: near,
    warnings,
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
