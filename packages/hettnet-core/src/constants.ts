/** Verified Hyperliquid / HyperEVM addresses and endpoints. Do not invent extras. */

export const HYPERCORE_INFO_URL = "https://api.hyperliquid.xyz/info";
export const HYPEREVM_RPC_URL = "https://rpc.hyperliquid.xyz/evm";
export const HYPEREVM_TESTNET_RPC_URL = "https://rpc.hyperliquid-testnet.xyz/evm";
export const HYPEREVM_CHAIN_ID = 999;
export const HYPEREVM_TESTNET_CHAIN_ID = 998;

export const LLAMA_POOLS_URL = "https://yields.llama.fi/pools";
export const LLAMA_CHAIN = "Hyperliquid L1";
export const DEXSCREENER_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";
export const DEXSCREENER_TOKEN_PAIRS_URL = "https://api.dexscreener.com/token-pairs/v1/hyperevm";
export const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";

export const HYPE_SYSTEM_ADDRESS = "0x2222222222222222222222222222222222222222";
export const WHYPE_ADDRESS = "0x5555555555555555555555555555555555555555";
/** Official CoreWriter system contract. Sends HyperEVM txs that HyperCore executes. */
export const CORE_WRITER_ADDRESS = "0x3333333333333333333333333333333333333333";
export const HYPERLIQUID_APP_URL = "https://app.hyperliquid.xyz";
export const HYPERLEND_APP_URL = "https://app.hyperlend.finance";
export const HYPERSWAP_APP_URL = "https://app.hyperswap.exchange";

/** HyperCore token 0, bridged to HyperEVM. Distinct from Circle USDC. */
export const HYPERCORE_USDC_EVM = "0x6b9e773128f453f5c2c60935ee2de2cbc5390a24";
/** Circle native USDC on HyperEVM. */
export const CIRCLE_USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f";
export const USDT0 = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
export const UBTC = "0x9fdbda0a5e284c32744d2f17ee5c74b284993463";
export const USDH = "0x111111a1a0667d36bd57c0a9f569b98057111111";
export const USDE = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
export const KHYPE = "0xfD739d4e423301CE9385c1fb8850539D657C296D";
export const WSTHYPE = "0x94e8396e0869c9F2200760aF0621aFd240E1CF38";
export const BEHYPE = "0xd8FC8F0b03eBA61F64D08B0bef69d80916E5DdA9";

export const HYPERCORE_TOKENS: Record<
  number,
  { symbol: string; evm: string | null; kind: "stable" | "collateral"; label: string }
> = {
  0: {
    symbol: "USDC",
    evm: HYPERCORE_USDC_EVM,
    kind: "stable",
    label: "USDC (HyperCore)",
  },
  150: { symbol: "HYPE", evm: null, kind: "collateral", label: "HYPE" },
  197: { symbol: "UBTC", evm: UBTC, kind: "collateral", label: "UBTC" },
  268: { symbol: "USDT0", evm: USDT0, kind: "stable", label: "USDT0" },
  360: { symbol: "USDH", evm: USDH, kind: "stable", label: "USDH" },
};

export const HYPERLEND = {
  pool: "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b",
  poolAddressesProvider: "0x72c98246a98bFe64022a3190e7710E157497170C",
  protocolDataProvider: "0x4f4d4cA1e0a8A21FE0B460613bEbe917f2eb4326",
  uiPoolDataProvider: "0xfc05a3fbf47094f53a8f98fda5dd8abdd336b9d4",
  wrappedTokenGateway: "0x49558c794ea2aC8974C9F27886DDfAa951E99171",
} as const;

export const MORPHO_BLUE = "0x68e37de8d93d3496ae143f2e900490f6280c57cd";

/** Felix Morpho vaults confirmed from Morpho API / explorers. */
export const FELIX_VAULTS = [
  { address: "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27", name: "Felix USDC" },
  { address: "0x808F72b6Ff632fba005C88b49C2a76AB01CAB545", name: "Felix USDC (Frontier)" },
  { address: "0xFc5126377F0efc0041C0969Ef9BA903Ce67d151e", name: "Felix USDT0" },
  { address: "0x9896a8605763106e57A51aa0a97Fe8099E806bb3", name: "Felix USDT0 (Frontier)" },
  { address: "0x835FEBF893c6DdDee5CF762B0f8e31C5B06938ab", name: "Felix USDe" },
  { address: "0x9c59a9389D8f72DE2CdAf1126F36EA4790E2275e", name: "Felix USDhl" },
  { address: "0x2900ABd73631b2f60747e687095537B673c06A76", name: "Felix HYPE" },
] as const;

export const HYPERSWAP = {
  v3Factory: "0xB1c0fa0B789320044A6F623cFe5eBda9562602E3",
  v3Npm: "0x6eDA206207c09e5428F281761DdC0D300851fBC8",
  swapRouter02: "0x6D99e7f6747AF2cDbB5164b6DD50e40D4fDe1e77",
  v2Factory: "0x724412C00059bf7d6ee7d4a1d0D5cd4de3ea1C48",
  v2Router: "0xb4a9C4e6Ea8E2191d2FA5B380452a634Fb21240A",
} as const;

export const KITTENSWAP = {
  algebraFactory: "0x5f95E92c338e6453111Fc55ee66D4AafccE661A7",
  npm: "0x9ea4459c8DefBF561495d95414b9CF1E2242a3E2",
  swapRouter: "0x4e73E421480a7E0C24fB3c11019254edE194f736",
} as const;

export const PROJECT_X = {
  factory: "0xFf7B3e8C00e57ea31477c32A5B52a58Eea47b072",
  npm: "0xeaD19AE861c29bBb2101E834922B2FEee69B9091",
  router: "0x1EbDFC75FfE3ba3de61E7138a3E8706aC841Af9B",
} as const;

export const LLAMA_P0_PROJECTS = new Set([
  "hyperlend-pooled",
  "hyperswap-v3",
  "hyperswap-v2",
  "project-x",
  "felix-cdp",
]);

export const CACHE_TTL = {
  hypercoreMs: 30_000,
  llamaMs: 5 * 60_000,
  morphoMs: 120_000,
  dexscreenerMs: 60_000,
  verifyMs: 60_000,
  aggregateMs: 45_000,
} as const;

export const VERIFY_TOP_N = 12;
export const STALE_AFTER_MS = 120_000;
