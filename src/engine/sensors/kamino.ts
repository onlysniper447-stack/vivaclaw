import { address } from "@solana/kit";
import {
  DEFAULT_RECENT_SLOT_DURATION_MS,
  getCurrentLedgerInstant,
  KaminoMarket,
} from "@kamino-finance/klend-sdk";
import { getKitRpc } from "@/lib/solana/connection";
import { KAMINO_MAIN_MARKET, TOKENS } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import type { YieldOpportunity } from "@/types";

function toBps(apy: number): number {
  if (!Number.isFinite(apy)) return 0;
  return Math.round(apy * 10_000);
}

export async function scanKaminoYields(): Promise<YieldOpportunity[]> {
  const env = getServerEnv();
  const rpc = getKitRpc();
  const market = await KaminoMarket.load(
    rpc,
    address(KAMINO_MAIN_MARKET),
    DEFAULT_RECENT_SLOT_DURATION_MS,
  );

  const now = Date.now();
  if (!market) {
    return [
      {
        id: `kamino:${TOKENS.USDC.mint}`,
        protocol: "kamino",
        kind: "lend-supply",
        asset: TOKENS.USDC,
        grossApyBps: 0,
        netApyBps: 0,
        tvlUsd: 0,
        liquidityUsd: 0,
        estimatedGasSol: 0.0008,
        priceImpactBps: null,
        clawpumpFeeBps: env.CLAWPUMP_FEE_BPS,
        venueLabel: "Kamino Lend · market unavailable",
        updatedAt: now,
      },
    ];
  }

  await market.reload();
  const instant = await getCurrentLedgerInstant(rpc, env.SOLANA_COMMITMENT);
  const opportunities: YieldOpportunity[] = [];

  for (const reserve of market.getReserves()) {
    const mint = String(reserve.getLiquidityMint());
    const symbol = reserve.symbol || reserve.stats.symbol || "UNKNOWN";
    const decimals = reserve.stats.decimals;
    const supplyApy = reserve.totalSupplyAPY(instant);
    const grossApyBps = toBps(supplyApy);
    const tvlUsd = Number(reserve.stats.mintTotalSupply.toString());

    if (!mint || grossApyBps <= 0) continue;

    opportunities.push({
      id: `kamino:${mint}`,
      protocol: "kamino",
      kind: "lend-supply",
      asset: { symbol, mint, decimals },
      grossApyBps,
      netApyBps: Math.max(0, grossApyBps - env.CLAWPUMP_FEE_BPS),
      tvlUsd,
      liquidityUsd: tvlUsd,
      estimatedGasSol: 0.0008,
      priceImpactBps: 0,
      clawpumpFeeBps: env.CLAWPUMP_FEE_BPS,
      venueLabel: `Kamino Lend · ${symbol}`,
      updatedAt: now,
    });
  }

  return opportunities;
}
