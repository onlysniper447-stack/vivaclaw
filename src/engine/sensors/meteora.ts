import VaultImpl from "@meteora-ag/vault-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "@/lib/solana/connection";
import { getServerEnv } from "@/lib/env";
import { TOKEN_PUBKEYS, TOKENS } from "@/lib/constants";
import type { TokenRef, YieldOpportunity } from "@/types";

const VAULT_ASSETS: TokenRef[] = [TOKENS.SOL, TOKENS.USDC];

function mintFor(asset: TokenRef): PublicKey {
  if (asset.symbol === "SOL") return NATIVE_MINT;
  return TOKEN_PUBKEYS[asset.symbol as keyof typeof TOKEN_PUBKEYS] ?? new PublicKey(asset.mint);
}

function toBpsFromRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.round(rate * 10_000);
}

export async function scanMeteoraVaults(): Promise<YieldOpportunity[]> {
  const env = getServerEnv();
  const connection = getConnection();
  const now = Date.now();
  const results: YieldOpportunity[] = [];

  for (const asset of VAULT_ASSETS) {
    try {
      const vault = await VaultImpl.create(connection, mintFor(asset));
      await vault.refreshVaultState();

      const lpSupply = Number((await vault.getVaultSupply()).toString());
      const withdrawable = Number((await vault.getWithdrawableAmount()).toString());
      const totalAmount = Number(vault.vaultState.totalAmount.toString());
      const utilization = lpSupply > 0 ? withdrawable / lpSupply : 0;

      const grossApyBps = toBpsFromRate(Math.max(0, utilization * 0.08));
      const tvlUsd = totalAmount / 10 ** asset.decimals;

      results.push({
        id: `meteora:${asset.mint}`,
        protocol: "meteora",
        kind: "vault-yield",
        asset,
        grossApyBps,
        netApyBps: grossApyBps,
        tvlUsd,
        liquidityUsd: withdrawable / 10 ** asset.decimals,
        estimatedGasSol: 0.0012,
        priceImpactBps: null,
        protocolFeeBps: 0,
        venueLabel: `Meteora Dynamic Vault · ${asset.symbol}`,
        updatedAt: now,
      });
    } catch (error) {
      console.error("[meteora] vault scan failed", asset.symbol, error);
    }
  }

  return results;
}
