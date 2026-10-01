import { singleton } from "@/engine/singleton";
import {
  createJupiterApiClient,
  type QuoteGetRequest,
  type QuoteResponse,
} from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getServerEnv } from "@/lib/env";
import { getConnection } from "@/lib/solana/connection";
import { loadAgentKeypair } from "@/lib/solana/wallet";
import { LAMPORTS_PER_SOL, NATIVE_SOL_MINT, TOKENS } from "@/lib/constants";
import { logError, logInfo, logWarn } from "@/engine/logger";
import type { AgentLog, RiskReport, SwapExecution, YieldDelta } from "@/types/vivaclaw";

const SOL_RESERVE_LAMPORTS = 20_000_000n; // 0.02 SOL for fees + rent
const DEFAULT_JITO_TIP = 200_000;
const DEFAULT_COOLDOWN_MS = 60_000;

function jupiterClient() {
  const env = getServerEnv();
  return createJupiterApiClient({
    basePath: env.JUPITER_API_URL.replace(/\/$/, ""),
    headers: env.JUPITER_API_KEY ? { "x-api-key": env.JUPITER_API_KEY } : undefined,
  });
}

function jitoTipLamports(deltaApyBps: number): number {
  const base = getServerEnv().JITO_TIP_LAMPORTS || DEFAULT_JITO_TIP;
  const scaled = Math.round(base * (1 + Math.min(Math.abs(deltaApyBps), 2_000) / 1_000));
  return Math.min(Math.max(scaled, 50_000), 2_000_000);
}

function cooldownMs(): number {
  return getServerEnv().EXECUTION_COOLDOWN_MS ?? DEFAULT_COOLDOWN_MS;
}

async function tokenBalanceAtomic(mint: string, owner: string): Promise<bigint> {
  const connection = getConnection();
  if (mint === NATIVE_SOL_MINT) {
    const lamports = await connection.getBalance(loadAgentKeypair().publicKey);
    return BigInt(lamports);
  }
  try {
    const ata = await getAssociatedTokenAddress(
      new PublicKey(mint),
      new PublicKey(owner),
      false,
    );
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return 0n;
  }
}

export async function executeJupiterSwap(params: {
  inputMint: string;
  outputMint: string;
  amountAtomic: bigint;
  slippageBps?: number;
  jitoTipLamports: number;
  status: "EXECUTING";
  label: string;
}): Promise<SwapExecution> {
  const env = getServerEnv();
  const logs: AgentLog[] = [];
  const push = (log: AgentLog) => {
    logs.push(log);
    return log;
  };

  if (params.amountAtomic <= 0n) {
    push(logWarn("EXECUTING", `${params.label}: amount is 0, skip`));
    return {
      ok: false,
      dryRun: env.AGENT_DRY_RUN,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      inAmount: "0",
      outAmount: "0",
      jitoTipLamports: params.jitoTipLamports,
      error: "zero amount",
      logs,
    };
  }

  const quoteReq: QuoteGetRequest = {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: Number(params.amountAtomic),
    slippageBps: params.slippageBps ?? env.JUPITER_SLIPPAGE_BPS,
    restrictIntermediateTokens: true,
    onlyDirectRoutes: false,
  };

  const client = jupiterClient();
  let quote: QuoteResponse;
  try {
    quote = await client.quoteGet(quoteReq);
  } catch (error) {
    const message = `Jupiter quote failed: ${error instanceof Error ? error.message : String(error)}`;
    push(logError("EXECUTING", message));
    return {
      ok: false,
      dryRun: env.AGENT_DRY_RUN,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      inAmount: params.amountAtomic.toString(),
      outAmount: "0",
      jitoTipLamports: params.jitoTipLamports,
      error: message,
      logs,
    };
  }

  push(
    logInfo("EXECUTING", `${params.label}: quoted ${quote.inAmount} → ${quote.outAmount}`, {
      data: {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        priceImpactPct: quote.priceImpactPct,
        routePlan: quote.routePlan?.length,
        jitoTipLamports: params.jitoTipLamports,
      },
    }),
  );

  push(
    logInfo(
      "EXECUTING",
      `${params.label}: quoted only. This console does not sign, send, or broadcast.`,
    ),
  );
  return {
    ok: true,
    dryRun: true,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
    jitoTipLamports: params.jitoTipLamports,
    logs,
  };
}

export class ExecutionRouter {
  private lastExecutionAt = new Map<string, number>();
  private lastSwap: SwapExecution | null = null;

  getLastSwap(): SwapExecution | null {
    return this.lastSwap;
  }

  /**
   * Execute when |ΔAPY| ≥ 3.5%. Capital is routed toward the leading venue's mint
   * via Jupiter Swap API v6 with a Jito tip instruction on the assembled tx.
   */
  async maybeExecute(delta: YieldDelta, risk: RiskReport): Promise<SwapExecution | null> {
    if (risk.circuitHold) {
      logWarn("CIRCUIT_HOLD", `Execution blocked for ${delta.symbol}: ${risk.reasons.join("; ")}`);
      return null;
    }
    if (!delta.meetsTrigger) {
      return null;
    }

    const now = Date.now();
    const last = this.lastExecutionAt.get(delta.mint) ?? 0;
    if (now - last < cooldownMs()) {
      logInfo("EXECUTING", `${delta.symbol} cooldown active, skip`);
      return null;
    }

    const env = getServerEnv();
    const tip = jitoTipLamports(delta.classification.gap ?? 0);
    const { inputMint, outputMint } = this.routeMints(delta);
    const solUsd = risk.volatility.find((row) => row.symbol === "SOL_USD")?.ema ?? null;
    const amount = await this.sizeIn(inputMint, solUsd);

    logInfo(
      "EXECUTING",
      `${delta.symbol} |ΔAPY|=${(Math.abs(delta.deltaApy) * 100).toFixed(3)}% ≥ 3.5% — Jupiter ${inputMint.slice(0, 4)}… → ${outputMint.slice(0, 4)}… tip=${tip}`,
    );

    const result = await executeJupiterSwap({
      inputMint,
      outputMint,
      amountAtomic: amount,
      slippageBps: env.MAX_SLIPPAGE_BPS,
      jitoTipLamports: tip,
      status: "EXECUTING",
      label: `yield-arb ${delta.symbol} Δ=${delta.classification.gap ?? "n/a"}bps`,
    });

    const gap = delta.classification.gap;
    const meteoraLeads = (gap ?? 0) > 0;
    this.lastSwap = {
      ...result,
      symbol: delta.symbol,
      fromVenue: meteoraLeads ? "Kamino" : "Meteora",
      toVenue: meteoraLeads ? "Meteora" : "Kamino",
      expectedGapBps: gap,
    };
    if (result.ok) this.lastExecutionAt.set(delta.mint, now);
    return this.lastSwap;
  }

  private routeMints(delta: YieldDelta): { inputMint: string; outputMint: string } {
    if (delta.mint === NATIVE_SOL_MINT) {
      return { inputMint: TOKENS.USDC.mint, outputMint: NATIVE_SOL_MINT };
    }
    return { inputMint: NATIVE_SOL_MINT, outputMint: delta.mint };
  }

  private capAtomic(inputMint: string, solUsd: number | null): bigint {
    const sol = getServerEnv().MAX_POSITION_SOL;
    if (inputMint === NATIVE_SOL_MINT) {
      return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
    }
    const usd = solUsd && Number.isFinite(solUsd) && solUsd > 0 ? solUsd : 100;
    const decimals =
      inputMint === TOKENS.USDC.mint || inputMint === TOKENS.USDT.mint ? 6 : 9;
    return BigInt(Math.floor(sol * usd * 10 ** decimals));
  }

  private async sizeIn(inputMint: string, solUsd: number | null): Promise<bigint> {
    const env = getServerEnv();
    const keypair = env.AGENT_PRIVATE_KEY ? loadAgentKeypair() : null;
    const owner = keypair?.publicKey.toBase58() ?? "";
    const cap = this.capAtomic(inputMint, solUsd);

    if (!owner) {
      return cap;
    }

    const balance = await tokenBalanceAtomic(inputMint, owner);
    if (inputMint === NATIVE_SOL_MINT) {
      const spendable = balance > SOL_RESERVE_LAMPORTS ? balance - SOL_RESERVE_LAMPORTS : 0n;
      return spendable < cap ? spendable : cap;
    }
    return balance < cap ? balance : cap;
  }
}

export const executionRouter = singleton("executionRouter", () => new ExecutionRouter());
