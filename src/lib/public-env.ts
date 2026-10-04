import { z } from "zod";

function defaultAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_WS_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLUSTER: z.enum(["mainnet-beta", "devnet", "testnet"]).default("mainnet-beta"),
});

const cluster =
  process.env.NEXT_PUBLIC_CLUSTER === "mainnet-beta" ||
  process.env.NEXT_PUBLIC_CLUSTER === "devnet" ||
  process.env.NEXT_PUBLIC_CLUSTER === "testnet"
    ? process.env.NEXT_PUBLIC_CLUSTER
    : "mainnet-beta";

export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT,
  NEXT_PUBLIC_APP_URL: defaultAppUrl(),
  NEXT_PUBLIC_CLUSTER: cluster,
});

export function getWsBrowserUrl(): string {
  if (typeof window === "undefined") {
    return `ws://localhost:${publicEnv.NEXT_PUBLIC_WS_PORT}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${publicEnv.NEXT_PUBLIC_WS_PORT}`;
}
