import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getServerEnv } from "@/lib/env";

if (typeof window !== "undefined") {
  throw new Error("src/lib/solana/wallet.ts is server-only");
}

function decodeSecret(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("AGENT_PRIVATE_KEY is empty");
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as number[];
    return Uint8Array.from(parsed);
  }

  return bs58.decode(trimmed);
}

export function loadAgentKeypair(): Keypair {
  const env = getServerEnv();
  const secret = decodeSecret(env.AGENT_PRIVATE_KEY);
  if (secret.length !== 64 && secret.length !== 32) {
    throw new Error("AGENT_PRIVATE_KEY must be a 32-byte seed or 64-byte secret key");
  }
  return secret.length === 64
    ? Keypair.fromSecretKey(secret)
    : Keypair.fromSeed(secret);
}

export function tryLoadAgentPubkey(): string | null {
  const env = getServerEnv();
  if (!env.AGENT_PRIVATE_KEY) return null;
  try {
    return loadAgentKeypair().publicKey.toBase58();
  } catch {
    return null;
  }
}
