declare namespace NodeJS {
  interface ProcessEnv {
    SOLANA_RPC_URL?: string;
    SOLANA_WS_URL?: string;
    SOLANA_COMMITMENT?: string;
    AGENT_PRIVATE_KEY?: string;
    AGENT_CLUSTER?: string;
    AGENT_DRY_RUN?: string;
    JUPITER_API_URL?: string;
    JUPITER_API_KEY?: string;
    JUPITER_SLIPPAGE_BPS?: string;
    CLAWPUMP_API_URL?: string;
    CLAWPUMP_API_KEY?: string;
    CLAWPUMP_FEE_BPS?: string;
    PYTH_HERMES_URL?: string;
    PYTH_API_KEY?: string;
    ORACLE_MAX_STALENESS_MS?: string;
    MAX_SLIPPAGE_BPS?: string;
    MAX_LTV_BPS?: string;
    MAX_POSITION_SOL?: string;
    MIN_NET_APY_BPS?: string;
    MAX_PRICE_IMPACT_BPS?: string;
    SCAN_INTERVAL_MS?: string;
    VIVACLAW_MINT?: string;
    YIELD_DELTA_TRIGGER_BPS?: string;
    APY_SANITY_CEILING_BPS?: string;
    APY_SANITY_RATIO?: string;
    PEG_MAX_DEVIATION_BPS?: string;
    VOLATILITY_MAX_BPS?: string;
    JITO_TIP_LAMPORTS?: string;
    JITO_RPC_URL?: string;
    CLAWPUMP_BUYBACK_BPS?: string;
    EXECUTION_COOLDOWN_MS?: string;
    NEXT_PUBLIC_WS_PORT?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_CLUSTER?: string;
  }
}
