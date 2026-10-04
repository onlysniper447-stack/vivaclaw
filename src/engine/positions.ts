/**
 * Simulated lend/LP positions.
 * ENTER, CLAIM, and WITHDRAW never sign, send, or broadcast.
 */

import { earnedFromApr } from "@/lib/accrual";
import { logInfo, logWarn } from "@/engine/logger";
import { singleton } from "@/engine/singleton";
import { getStoredOpportunity } from "@/engine/opportunity-store";
import { venueFamily } from "@/lib/venues";
import { aprFromApy, toBps } from "@/engine/rates";
import type { VenueFamily, VenueId } from "@/types/hettnet";

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export { dailyEarn, earnedFromApr, YEAR_MS } from "@/lib/accrual";
const MAX_ACTIONS = 80;

export interface StoredPosition {
  id: string;
  poolId: string;
  venue: VenueId;
  family: VenueFamily;
  symbol: string;
  mint: string;
  unit: string;
  venueAddress: string;
  aprBps: number;
  apyBps: number;
  principal: number;
  claimed: number;
  enteredAt: number;
  accruedAt: number;
  status: "open" | "closed";
  closedAt: number | null;
  exitAmount: number | null;
}

export interface PositionAction {
  id: string;
  kind: "enter" | "claim" | "withdraw";
  positionId: string;
  poolId: string;
  symbol: string;
  venue: VenueId;
  amount: number;
  unit: string;
  aprBps: number;
  apyBps: number;
  at: number;
  message: string;
}

export interface PositionActionResult {
  ok: boolean;
  dryRun: true;
  error?: string;
  position: StoredPosition | null;
  action: PositionAction | null;
}

const live = singleton("positions.enterClaim", () => ({
  positions: [] as StoredPosition[],
  actions: [] as PositionAction[],
}));

export function defaultPrincipal(symbol: string, mint: string): { amount: number; unit: string } {
  if (mint === NATIVE_SOL_MINT || symbol.startsWith("SOL")) {
    return { amount: 1, unit: "SOL" };
  }
  if (mint === USDC_MINT || symbol.startsWith("USDC")) {
    return { amount: 1_000, unit: "USDC" };
  }
  if (mint === USDT_MINT || symbol.startsWith("USDT")) {
    return { amount: 1_000, unit: "USDT" };
  }
  const unit = symbol.split("/")[0] ?? "USDC";
  return { amount: 1_000, unit };
}

export function earnedAmount(position: StoredPosition, now = Date.now()): number {
  if (position.status === "closed") return 0;
  return earnedFromApr(position.principal, position.aprBps, now - position.accruedAt);
}

export function listPositions(): StoredPosition[] {
  return live.positions;
}

export function listActions(): PositionAction[] {
  return live.actions;
}

function pushAction(action: PositionAction): void {
  live.actions.push(action);
  if (live.actions.length > MAX_ACTIONS) {
    live.actions.splice(0, live.actions.length - MAX_ACTIONS);
  }
}

function fail(error: string): PositionActionResult {
  logWarn("EXECUTING", error);
  return { ok: false, dryRun: true, error, position: null, action: null };
}

export function enterPool(poolId: string): PositionActionResult {
  const id = poolId.trim();
  if (!id) return fail("Pick a pool to enter.");

  const open = live.positions.find((row) => row.poolId === id && row.status === "open");
  if (open) return fail("Already in this pool. Claim or withdraw on Execution.");

  const hl = getStoredOpportunity(id);
  const apy = hl ? hl.apyTotal ?? hl.apyBase : null;
  if (hl?.signal?.indication === "AVOID") {
    return fail(hl.signal.reasons[0] ?? "This pool is marked AVOID.");
  }
  if (!hl || apy === null || !(apy > 0)) {
    return fail(hl ? "This pool does not have a usable APY." : "Load venue yields first, then ENTER a printed pool.");
  }
  const apyBps = toBps(apy);
  const aprBps = hl.apr !== null ? toBps(hl.apr) : toBps(aprFromApy(apy));
  const symbol = hl.assets.map((a) => a.symbol).join("/");
  const mint = hl.assets[0]?.id ?? hl.id;
  const venue = hl.venue as VenueId;
  const venueAddress = hl.assets[0]?.id ?? hl.id;

  const size = defaultPrincipal(symbol, mint);
  const now = Date.now();
  const position: StoredPosition = {
    id: `pos:${id}:${now}`,
    poolId: id,
    venue,
    family: venueFamily(venue),
    symbol,
    mint,
    unit: size.unit,
    venueAddress,
    aprBps,
    apyBps,
    principal: size.amount,
    claimed: 0,
    enteredAt: now,
    accruedAt: now,
    status: "open",
    closedAt: null,
    exitAmount: null,
  };
  const action: PositionAction = {
    id: `act:enter:${now}`,
    kind: "enter",
    positionId: position.id,
    poolId: position.poolId,
    symbol: position.symbol,
    venue: position.venue,
    amount: position.principal,
    unit: position.unit,
    aprBps: position.aprBps,
    apyBps: position.apyBps,
    at: now,
    message: `Entered ${position.symbol} on ${position.venue} · simulated ${size.amount} ${size.unit}`,
  };
  live.positions.push(position);
  pushAction(action);
  logInfo("EXECUTING", action.message, {
    data: { poolId: position.poolId, dryRun: true },
  });
  return { ok: true, dryRun: true, position, action };
}

export function claimPool(positionId: string): PositionActionResult {
  const position = live.positions.find((row) => row.id === positionId && row.status === "open");
  if (!position) return fail("That pool is not in Execution.");

  const now = Date.now();
  const earned = earnedAmount(position, now);
  if (earned <= 0) return fail("Nothing to claim yet.");

  position.claimed += earned;
  position.accruedAt = now;
  const action: PositionAction = {
    id: `act:claim:${now}`,
    kind: "claim",
    positionId: position.id,
    poolId: position.poolId,
    symbol: position.symbol,
    venue: position.venue,
    amount: earned,
    unit: position.unit,
    aprBps: position.aprBps,
    apyBps: position.apyBps,
    at: now,
    message: `Claimed ${earned} ${position.unit} from ${position.symbol} · simulated`,
  };
  pushAction(action);
  logInfo("EXECUTING", action.message, {
    data: { positionId: position.id, dryRun: true },
  });
  return { ok: true, dryRun: true, position, action };
}

export function withdrawPool(positionId: string): PositionActionResult {
  const position = live.positions.find((row) => row.id === positionId && row.status === "open");
  if (!position) return fail("That pool is not in Execution.");

  const now = Date.now();
  const earned = earnedAmount(position, now);
  const total = position.principal + earned;
  position.claimed += earned;
  position.accruedAt = now;
  position.status = "closed";
  position.closedAt = now;
  position.exitAmount = total;
  const action: PositionAction = {
    id: `act:withdraw:${now}`,
    kind: "withdraw",
    positionId: position.id,
    poolId: position.poolId,
    symbol: position.symbol,
    venue: position.venue,
    amount: total,
    unit: position.unit,
    aprBps: position.aprBps,
    apyBps: position.apyBps,
    at: now,
    message: `Withdrew ${total} ${position.unit} from ${position.symbol} · simulated`,
  };
  pushAction(action);
  logInfo("EXECUTING", action.message, {
    data: { positionId: position.id, dryRun: true },
  });
  return { ok: true, dryRun: true, position, action };
}
