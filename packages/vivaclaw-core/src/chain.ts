import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { HYPEREVM_CHAIN_ID, HYPEREVM_RPC_URL } from "./constants";

export const hyperEvm = defineChain({
  id: HYPEREVM_CHAIN_ID,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: [HYPEREVM_RPC_URL] },
  },
});

let client: PublicClient | null = null;

export function evmClient(): PublicClient {
  if (client) return client;
  const url = process.env.HYPEREVM_RPC_URL?.trim() || HYPEREVM_RPC_URL;
  client = createPublicClient({
    chain: hyperEvm,
    transport: http(url, { timeout: 8_000 }),
  });
  return client;
}
