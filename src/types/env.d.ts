declare namespace NodeJS {
  interface ProcessEnv {
    AGENT_DRY_RUN?: string;
    SCAN_INTERVAL_MS?: string;
    YIELD_DELTA_TRIGGER_BPS?: string;
    APY_SANITY_CEILING_BPS?: string;
    APY_SANITY_RATIO?: string;
    NEXT_PUBLIC_WS_PORT?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_CLUSTER?: string;
    HYPEREVM_RPC_URL?: string;
    HYPEREVM_TESTNET_RPC_URL?: string;
    HYPERCORE_INFO_URL?: string;
    HETTNET_SKIP_VERIFY?: string;
  }
}
