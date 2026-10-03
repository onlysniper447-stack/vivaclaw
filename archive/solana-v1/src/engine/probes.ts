import { getServerEnv } from "@/lib/env";
import { NATIVE_SOL_MINT, TOKENS } from "@/lib/constants";
import { getConnection } from "@/lib/solana/connection";
import { withTimeout } from "@/engine/retry";
import type { ServiceProbe } from "@/types/dashboard";

export async function probeRpc(): Promise<ServiceProbe> {
  const env = getServerEnv();
  const configured = Boolean(env.SOLANA_RPC_URL);
  const started = Date.now();
  try {
    const slot = await withTimeout(getConnection().getSlot(env.SOLANA_COMMITMENT), 4_000, "Solana RPC");
    return {
      name: "Solana RPC",
      ok: true,
      configured,
      latencyMs: Date.now() - started,
      detail: `slot ${slot} · ${env.SOLANA_COMMITMENT}`,
    };
  } catch (error) {
    return {
      name: "Solana RPC",
      ok: false,
      configured,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Solana RPC did not respond",
    };
  }
}

export async function probeJupiter(): Promise<ServiceProbe> {
  const env = getServerEnv();
  const configured = Boolean(env.JUPITER_API_URL);
  const started = Date.now();
  const url = new URL("quote", `${env.JUPITER_API_URL.replace(/\/$/, "")}/`);
  url.searchParams.set("inputMint", NATIVE_SOL_MINT);
  url.searchParams.set("outputMint", TOKENS.USDC.mint);
  url.searchParams.set("amount", "1000");
  url.searchParams.set("slippageBps", "50");

  const headers: Record<string, string> = { accept: "application/json" };
  if (env.JUPITER_API_KEY) headers["x-api-key"] = env.JUPITER_API_KEY;

  try {
    const res = await withTimeout(
      fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(4_000) }),
      4_000,
      "Jupiter",
    );
    return {
      name: "Jupiter API",
      ok: res.ok,
      configured,
      latencyMs: Date.now() - started,
      detail: res.ok ? `quote HTTP ${res.status}` : `Jupiter returned HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      name: "Jupiter API",
      ok: false,
      configured,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Jupiter did not respond",
    };
  }
}
