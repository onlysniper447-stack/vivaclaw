export type {
  DiscoverResult,
  IlClass,
  Indication,
  Opportunity,
  OpportunityAsset,
  OpportunityLayer,
  OpportunityType,
  Signal,
  SignalAlert,
  SupplySimulation,
  VenueSlug,
} from "./types";

export {
  BEHYPE,
  CACHE_TTL,
  CIRCLE_USDC,
  CORE_WRITER_ADDRESS,
  FELIX_VAULTS,
  HYPERCORE_INFO_URL,
  HYPERCORE_TESTNET_INFO_URL,
  HYPERCORE_TOKENS,
  HYPERCORE_USDC_EVM,
  HYPEREVM_CHAIN_ID,
  HYPEREVM_RPC_URL,
  HYPEREVM_TESTNET_CHAIN_ID,
  HYPEREVM_TESTNET_RPC_URL,
  HYPERLEND,
  HYPERLEND_APP_URL,
  HYPERLIQUID_APP_URL,
  HYPERLIQUID_TESTNET_APP_URL,
  HYPERSWAP_APP_URL,
  HYPERSWAP,
  HYPE_SYSTEM_ADDRESS,
  KHYPE,
  KITTENSWAP,
  MORPHO_BLUE,
  PROJECT_X,
  UBTC,
  USDH,
  USDT0,
  VERIFY_TOP_N,
  WHYPE_ADDRESS,
  WSTHYPE,
} from "./constants";

export {
  collectAlerts,
  indicationRank,
  INDICATION_DISCLAIMER,
  scoreOpportunities,
  scoreOpportunity,
  type SignalOptions,
} from "./signal";
export {
  buildEntryPlan,
  defaultPlanAmountWei,
  encodeBorrowLendAction,
  encodeCoreWriterSupply,
  encodeErc4626Deposit,
  encodeHyperlendSupply,
  tokenDecimals,
  type EntryPlan,
  type PlannedTx,
  type PlanStep,
} from "./entry";
export { hyperEvm, hyperEvmTestnet, evmClient } from "./chain";
export { hettnetNetwork, hypercoreInfoUrl, hyperevmRpcUrl, hyperliquidAppUrl } from "./network";
export { discoverOpportunities } from "./aggregator";
export { fetchHyperCoreOpportunities } from "./adapters/hypercore";
export { fetchLlamaOpportunities } from "./adapters/llama";
export { fetchMorphoOpportunities } from "./adapters/morpho";
export { fetchKittenswapOpportunities } from "./adapters/dexscreener";
export { llamaPercentToDecimal, mapLlamaPool, parseFeeTier } from "./llama";
export { borrowApy, nearKink, simulateSupplyApy, supplyApy } from "./rate-model";
export { CL_RANGE_CAVEAT, ilClass } from "./il";
export { cached } from "./cache";
