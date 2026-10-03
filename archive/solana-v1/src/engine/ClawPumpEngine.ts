import { singleton } from "@/engine/singleton";
import { getServerEnv } from "@/lib/env";
import { loadAgentKeypair, tryLoadAgentPubkey } from "@/lib/solana/wallet";
import { getConnection } from "@/lib/solana/connection";
import { LAMPORTS_PER_SOL, NATIVE_SOL_MINT } from "@/lib/constants";
import { executeJupiterSwap } from "@/engine/ExecutionRouter";
import { logError, logInfo, logWarn } from "@/engine/logger";
import type { ClawPumpRevenue, SwapExecution } from "@/types/vivaclaw";

const BUYBACK_BPS_DEFAULT = 3_000; // 30%
const SOL_RESERVE_LAMPORTS = 20_000_000n;

function buybackBps(): number {
  const n = getServerEnv().CLAWPUMP_BUYBACK_BPS;
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return BUYBACK_BPS_DEFAULT;
  return Math.floor(n);
}

function earningsUrl(): string {
  const env = getServerEnv();
  const base = env.CLAWPUMP_API_URL.replace(/\/$/, "");
  try {
    const origin = new URL(base).origin;
    return `${origin}/api/fees/earnings`;
  } catch {
    return `${base}/api/fees/earnings`;
  }
}

function asLamports(value: unknown): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 1_000) {
      return BigInt(Math.round(value * LAMPORTS_PER_SOL));
    }
    return BigInt(Math.round(value));
  }
  const text = String(value).trim();
  if (!text) return 0n;
  if (text.includes(".")) {
    const n = Number(text);
    if (!Number.isFinite(n)) return 0n;
    if (Math.abs(n) < 1_000_000) return BigInt(Math.round(n * LAMPORTS_PER_SOL));
    return BigInt(Math.round(n));
  }
  try {
    return BigInt(text);
  } catch {
    return 0n;
  }
}

function firstLamports(record: Record<string, unknown>, keys: string[]): bigint {
  for (const key of keys) {
    if (key in record) {
      const parsed = asLamports(record[key]);
      if (parsed > 0n) return parsed;
    }
  }
  return 0n;
}

function parseRevenue(body: unknown, wallet: string): ClawPumpRevenue {
  const rec =
    body && typeof body === "object"
      ? ((body as { data?: Record<string, unknown> }).data ??
          (body as Record<string, unknown>))
      : {};
  const record = rec as Record<string, unknown>;

  const claimedSolLamports = firstLamports(record, [
    "claimedSolLamports",
    "claimed_sol_lamports",
    "claimedLamports",
    "claimed_lamports",
    "claimedSol",
    "claimed_sol",
    "claimed",
  ]);
  const unclaimedSolLamports = firstLamports(record, [
    "unclaimedSolLamports",
    "unclaimed_sol_lamports",
    "unclaimedLamports",
    "unclaimed_lamports",
    "unclaimedSol",
    "unclaimed_sol",
    "unclaimed",
    "claimable",
    "pending",
  ]);
  const lifetimeSolLamports = firstLamports(record, [
    "lifetimeSolLamports",
    "lifetime_sol_lamports",
    "lifetimeSol",
    "lifetime_sol",
    "lifetime",
    "total",
  ]);

  const basis = claimedSolLamports > 0n ? claimedSolLamports : unclaimedSolLamports;
  const shareBps = buybackBps();
  const buybackShareLamports = (basis * BigInt(shareBps)) / 10_000n;

  return {
    wallet: String(record.wallet ?? record.creator ?? wallet),
    claimedSolLamports: claimedSolLamports.toString(),
    unclaimedSolLamports: unclaimedSolLamports.toString(),
    lifetimeSolLamports: lifetimeSolLamports.toString(),
    buybackShareLamports: buybackShareLamports.toString(),
    buybackShareBps: shareBps,
    updatedAt: Date.now(),
    raw: record,
  };
}

export class ClawPumpEngine {
  private lastRevenue: ClawPumpRevenue | null = null;
  private lastBuyback: SwapExecution | null = null;
  private lastBuybackAt: number | null = null;

  getLastRevenue(): ClawPumpRevenue | null {
    return this.lastRevenue;
  }

  getLastBuyback(): SwapExecution | null {
    return this.lastBuyback;
  }

  getLastBuybackAt(): number | null {
    return this.lastBuybackAt;
  }

  async fetchEarnings(): Promise<ClawPumpRevenue> {
    const env = getServerEnv();
    const wallet = tryLoadAgentPubkey() ?? "";
    const url = new URL(earningsUrl());
    if (wallet) url.searchParams.set("wallet", wallet);
    url.searchParams.set("cluster", env.AGENT_CLUSTER);

    const headers: Record<string, string> = { accept: "application/json" };
    if (env.CLAWPUMP_API_KEY) {
      headers.authorization = `Bearer ${env.CLAWPUMP_API_KEY}`;
      headers["x-api-key"] = env.CLAWPUMP_API_KEY;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /api/fees/earnings → HTTP ${res.status}: ${text.slice(0, 240)}`);
      }
      const body: unknown = await res.json();
      const revenue = parseRevenue(body, wallet);
      this.lastRevenue = revenue;
      logInfo(
        "SCANNING",
        `ClawPump earnings claimed=${revenue.claimedSolLamports} unclaimed=${revenue.unclaimedSolLamports} buyback(30%)=${revenue.buybackShareLamports}`,
        { data: { wallet: revenue.wallet, url: url.toString() } },
      );
      return revenue;
    } catch (error) {
      const message = `ClawPump earnings poll failed: ${error instanceof Error ? error.message : String(error)}`;
      logError("SCANNING", message);
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Route 30% of claimed SOL creator fees into a Jupiter buyback of $VIVACLAW.
   */
  async routeBuyback(riskHeld: boolean): Promise<SwapExecution | null> {
    if (riskHeld) {
      logWarn("CIRCUIT_HOLD", "ClawPump buyback blocked by circuit hold");
      return null;
    }

    const env = getServerEnv();
    const mint = env.VIVACLAW_MINT.trim();
    if (!mint) {
      logWarn("SCANNING", "VIVACLAW_MINT is unset — skip buyback");
      return null;
    }

    let revenue: ClawPumpRevenue;
    try {
      revenue = await this.fetchEarnings();
    } catch {
      return null;
    }

    const requested = BigInt(revenue.buybackShareLamports);
    if (requested <= 0n) {
      logInfo("SCANNING", "ClawPump claimed fees are 0 — no buyback this cycle");
      return null;
    }

    const spendable = await this.spendableSol(requested);
    if (spendable <= 0n) {
      logWarn("EXECUTING", "Insufficient SOL to fund 30% ClawPump buyback after rent reserve");
      return null;
    }

    const result = await executeJupiterSwap({
      inputMint: NATIVE_SOL_MINT,
      outputMint: mint,
      amountAtomic: spendable,
      slippageBps: env.MAX_SLIPPAGE_BPS,
      jitoTipLamports: env.JITO_TIP_LAMPORTS,
      status: "EXECUTING",
      label: `clawpump buyback ${spendable} lamports SOL → $VIVACLAW`,
    });

    this.lastBuyback = result;
    this.lastBuybackAt = Date.now();
    return result;
  }

  private async spendableSol(requested: bigint): Promise<bigint> {
    const env = getServerEnv();
    if (!env.AGENT_PRIVATE_KEY) {
      return requested;
    }
    const keypair = loadAgentKeypair();
    const lamports = BigInt(await getConnection().getBalance(keypair.publicKey));
    const available = lamports > SOL_RESERVE_LAMPORTS ? lamports - SOL_RESERVE_LAMPORTS : 0n;
    return available < requested ? available : requested;
  }
}

export const clawPumpEngine = singleton("clawPump", () => new ClawPumpEngine());
