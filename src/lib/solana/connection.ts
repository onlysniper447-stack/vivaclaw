import { Connection, type Commitment } from "@solana/web3.js";
import { createSolanaRpc } from "@solana/kit";
import { getServerEnv } from "@/lib/env";

let web3Connection: Connection | null = null;

/** @solana/web3.js v1 connection — Meteora vault-sdk, Jupiter tx send, SPL. */
export function getConnection(): Connection {
  if (web3Connection) return web3Connection;
  const env = getServerEnv();
  web3Connection = new Connection(env.SOLANA_RPC_URL, {
    commitment: env.SOLANA_COMMITMENT as Commitment,
    wsEndpoint: env.SOLANA_WS_URL,
    confirmTransactionInitialTimeout: 60_000,
  });
  return web3Connection;
}

/** @solana/kit RPC — Kamino klend-sdk v12. */
export function getKitRpc() {
  const env = getServerEnv();
  return createSolanaRpc(env.SOLANA_RPC_URL);
}

export async function getLatestSlot(): Promise<number> {
  return getConnection().getSlot(getServerEnv().SOLANA_COMMITMENT as Commitment);
}
