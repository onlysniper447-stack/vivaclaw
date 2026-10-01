import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error("src/lib/env.ts is server-only and must not be imported in the browser");
}

const CommitmentSchema = z.enum(["processed", "confirmed", "finalized"]);

const ServerEnvSchema = z.object({
  SOLANA_RPC_URL: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
  SOLANA_WS_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  SOLANA_COMMITMENT: CommitmentSchema.default("confirmed"),
  AGENT_CLUSTER: z.enum(["mainnet-beta", "devnet", "testnet"]).default("mainnet-beta"),
  AGENT_PRIVATE_KEY: z.string().optional().default(""),
  AGENT_DRY_RUN: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  JUPITER_API_URL: z.string().url().default("https://lite-api.jup.ag/swap/v1"),
  JUPITER_API_KEY: z.string().optional().default(""),
  JUPITER_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(1_000).default(50),
  CLAWPUMP_API_URL: z.string().url().default("https://api.clawpump.io/v1"),
  CLAWPUMP_API_KEY: z.string().default(""),
  CLAWPUMP_FEE_BPS: z.coerce.number().int().min(0).max(1_000).default(30),
  PYTH_HERMES_URL: z.string().url().default("https://hermes.pyth.network"),
  PYTH_API_KEY: z.string().optional().default(""),
  ORACLE_MAX_STALENESS_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(1_000).default(50),
  MAX_LTV_BPS: z.coerce.number().int().min(1_000).max(9_000).default(6_500),
  MAX_POSITION_SOL: z.coerce.number().positive().max(10_000).default(10),
  MIN_NET_APY_BPS: z.coerce.number().int().min(0).max(100_000).default(150),
  MAX_PRICE_IMPACT_BPS: z.coerce.number().int().min(1).max(2_000).default(80),
  SCAN_INTERVAL_MS: z.coerce.number().int().min(3_000).max(300_000).default(15_000),
  VIVACLAW_MINT: z.string().default(""),
  YIELD_DELTA_TRIGGER_BPS: z.coerce.number().int().min(1).max(10_000).default(350),
  APY_SANITY_CEILING_BPS: z.coerce.number().int().min(100).max(100_000).default(3_000),
  APY_SANITY_RATIO: z.coerce.number().positive().max(100).default(5),
  PEG_MAX_DEVIATION_BPS: z.coerce.number().int().min(1).max(2_000).default(50),
  VOLATILITY_MAX_BPS: z.coerce.number().int().min(1).max(10_000).default(150),
  JITO_TIP_LAMPORTS: z.coerce.number().int().min(0).max(50_000_000).default(200_000),
  JITO_RPC_URL: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  CLAWPUMP_BUYBACK_BPS: z.coerce.number().int().min(0).max(10_000).default(3_000),
  EXECUTION_COOLDOWN_MS: z.coerce.number().int().min(0).max(3_600_000).default(60_000),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  cached = ServerEnvSchema.parse({
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    SOLANA_WS_URL: process.env.SOLANA_WS_URL,
    SOLANA_COMMITMENT: process.env.SOLANA_COMMITMENT,
    AGENT_CLUSTER: process.env.AGENT_CLUSTER,
    AGENT_PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY,
    AGENT_DRY_RUN: process.env.AGENT_DRY_RUN,
    JUPITER_API_URL: process.env.JUPITER_API_URL,
    JUPITER_API_KEY: process.env.JUPITER_API_KEY,
    JUPITER_SLIPPAGE_BPS: process.env.JUPITER_SLIPPAGE_BPS,
    CLAWPUMP_API_URL: process.env.CLAWPUMP_API_URL,
    CLAWPUMP_API_KEY: process.env.CLAWPUMP_API_KEY,
    CLAWPUMP_FEE_BPS: process.env.CLAWPUMP_FEE_BPS,
    PYTH_HERMES_URL: process.env.PYTH_HERMES_URL,
    PYTH_API_KEY: process.env.PYTH_API_KEY,
    ORACLE_MAX_STALENESS_MS: process.env.ORACLE_MAX_STALENESS_MS,
    MAX_SLIPPAGE_BPS: process.env.MAX_SLIPPAGE_BPS,
    MAX_LTV_BPS: process.env.MAX_LTV_BPS,
    MAX_POSITION_SOL: process.env.MAX_POSITION_SOL,
    MIN_NET_APY_BPS: process.env.MIN_NET_APY_BPS,
    MAX_PRICE_IMPACT_BPS: process.env.MAX_PRICE_IMPACT_BPS,
    SCAN_INTERVAL_MS: process.env.SCAN_INTERVAL_MS,
    VIVACLAW_MINT: process.env.VIVACLAW_MINT,
    YIELD_DELTA_TRIGGER_BPS: process.env.YIELD_DELTA_TRIGGER_BPS,
    APY_SANITY_CEILING_BPS: process.env.APY_SANITY_CEILING_BPS,
    APY_SANITY_RATIO: process.env.APY_SANITY_RATIO,
    PEG_MAX_DEVIATION_BPS: process.env.PEG_MAX_DEVIATION_BPS,
    VOLATILITY_MAX_BPS: process.env.VOLATILITY_MAX_BPS,
    JITO_TIP_LAMPORTS: process.env.JITO_TIP_LAMPORTS,
    JITO_RPC_URL: process.env.JITO_RPC_URL,
    CLAWPUMP_BUYBACK_BPS: process.env.CLAWPUMP_BUYBACK_BPS,
    EXECUTION_COOLDOWN_MS: process.env.EXECUTION_COOLDOWN_MS,
  });
  return cached;
}

export function assertLiveSigner(env: ServerEnv = getServerEnv()): void {
  if (!env.AGENT_DRY_RUN && !env.AGENT_PRIVATE_KEY) {
    throw new Error("AGENT_PRIVATE_KEY is required when AGENT_DRY_RUN=false");
  }
}
