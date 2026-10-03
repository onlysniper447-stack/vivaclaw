import { cached } from "../cache";
import { CACHE_TTL, HYPEREVM_CHAIN_ID, MORPHO_GRAPHQL_URL } from "../constants";
import { parseFinite, postJson } from "../http";
import type { Opportunity, VenueSlug } from "../types";

interface MorphoVaultItem {
  address?: string;
  name?: string;
  symbol?: string;
  listed?: boolean;
  asset?: { address?: string; symbol?: string; decimals?: number };
  state?: { apy?: number; netApy?: number; fee?: number; totalAssetsUsd?: number };
}

interface MorphoResponse {
  data?: { vaults?: { items?: MorphoVaultItem[] } };
  errors?: { message?: string }[];
}

const QUERY = `query {
  vaults(first: 80, where: { chainId_in: [${HYPEREVM_CHAIN_ID}] }) {
    items {
      address
      name
      symbol
      listed
      asset { address symbol decimals }
      state { apy netApy fee totalAssetsUsd }
    }
  }
}`;

export async function fetchMorphoOpportunities(): Promise<Opportunity[]> {
  return cached("morpho:vaults:999", CACHE_TTL.morphoMs, loadMorpho);
}

async function loadMorpho(): Promise<Opportunity[]> {
  const body = await postJson<MorphoResponse>(MORPHO_GRAPHQL_URL, { query: QUERY });
  if (body.errors?.length) {
    throw new Error(body.errors[0]?.message ?? "Morpho GraphQL error");
  }
  const items = body.data?.vaults?.items ?? [];
  const fetchedAt = Date.now();
  return items
    .map((item) => mapVault(item, fetchedAt))
    .filter((row): row is Opportunity => row !== null);
}

function mapVault(item: MorphoVaultItem, fetchedAt: number): Opportunity | null {
  const address = item.address;
  if (!address) return null;
  const name = item.name ?? item.symbol ?? "Morpho vault";
  const venue: VenueSlug = /^felix/i.test(name) ? "felix" : "morpho";
  const assetSymbol = item.asset?.symbol ?? item.symbol ?? "UNKNOWN";
  const assetId = (item.asset?.address ?? address).toLowerCase();
  const net = parseFinite(item.state?.netApy);
  const gross = parseFinite(item.state?.apy);
  const tvl = parseFinite(item.state?.totalAssetsUsd);
  const print = net ?? gross;
  if (print !== null && print > 2) return null;
  if (venue !== "felix" && (tvl === null || tvl < 10_000)) return null;
  const risks: string[] = [];
  if (item.listed === false) risks.push("morpho-unlisted");
  if (net === 0 || gross === 0) risks.push("zero-print");
  if (print !== null && print > 1) risks.push("apy-outlier");

  return {
    id: `morpho:vault:${address.toLowerCase()}`,
    type: "vault",
    venue,
    layer: "evm",
    assets: [{ symbol: assetSymbol, id: assetId }],
    apyTotal: net ?? gross,
    apyBase: net ?? gross,
    apyIncentive: 0,
    apr: null,
    tvl,
    utilization: null,
    volume24h: null,
    volume7d: null,
    feeTier: parseFinite(item.state?.fee),
    capRemaining: null,
    paused: null,
    depthUsd: null,
    oraclePx: null,
    ilClass: null,
    risks,
    source: "morpho-blue-api",
    url: `https://app.morpho.org/hyperevm/vault/${address}`,
    verified: false,
    fetchedAt,
    stale: false,
  };
}
