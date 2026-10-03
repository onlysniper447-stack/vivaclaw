import { createJupiterApiClient, type QuoteResponse } from "@jup-ag/api";
import { getServerEnv } from "@/lib/env";
import { TOKENS } from "@/lib/constants";
import type { YieldOpportunity } from "@/types";

function jupiterClient() {
  const env = getServerEnv();
  return createJupiterApiClient({
    basePath: env.JUPITER_API_URL.replace(/\/$/, ""),
    headers: env.JUPITER_API_KEY
      ? { "x-api-key": env.JUPITER_API_KEY }
      : undefined,
  });
}

export async function quoteSwap(params: {
  inputMint: string;
  outputMint: string;
  amountAtomic: string;
  slippageBps?: number;
}): Promise<QuoteResponse> {
  const env = getServerEnv();
  const client = jupiterClient();
  return client.quoteGet({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: Number(params.amountAtomic),
    slippageBps: params.slippageBps ?? env.JUPITER_SLIPPAGE_BPS,
    restrictIntermediateTokens: true,
  });
}

function impactBps(quote: QuoteResponse): number {
  const impact = Number(quote.priceImpactPct ?? 0);
  return Math.round(Math.abs(impact) * 10_000);
}

export async function scanJupiterArb(): Promise<YieldOpportunity[]> {
  const env = getServerEnv();
  const amountAtomic = (1_000_000).toString();
  const now = Date.now();

  try {
    const [solToUsdc, usdcToSol] = await Promise.all([
      quoteSwap({
        inputMint: TOKENS.SOL.mint,
        outputMint: TOKENS.USDC.mint,
        amountAtomic: (1_000_000_000).toString(),
      }),
      quoteSwap({
        inputMint: TOKENS.USDC.mint,
        outputMint: TOKENS.SOL.mint,
        amountAtomic,
      }),
    ]);

    const roundTrip =
      Number(solToUsdc.outAmount) > 0 && Number(usdcToSol.outAmount) > 0
        ? Number(usdcToSol.outAmount) / Number(amountAtomic) - 1
        : 0;

    const grossApyBps = Math.max(0, Math.round(roundTrip * 10_000));

    return [
      {
        id: "jupiter:sol-usdc-roundtrip",
        protocol: "jupiter",
        kind: "cross-venue-arb",
        asset: TOKENS.SOL,
        grossApyBps,
        netApyBps: grossApyBps,
        tvlUsd: 0,
        liquidityUsd: 0,
        estimatedGasSol: 0.002,
        priceImpactBps: Math.max(impactBps(solToUsdc), impactBps(usdcToSol)),
        protocolFeeBps: 0,
        venueLabel: "Jupiter Swap API v6 · SOL/USDC",
        updatedAt: now,
      },
    ];
  } catch (error) {
    console.error("[jupiter] quote scan failed", error);
    return [];
  }
}
