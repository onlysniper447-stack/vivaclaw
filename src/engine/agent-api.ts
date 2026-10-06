import { formatEther, type Address, type Hex } from "viem";
import {
  INDICATION_DISCLAIMER,
  buildEntryPlan,
  discoverOpportunities,
  evmClient,
  scoreOpportunity,
  simulateSupplyApy,
  type Indication,
  type Opportunity,
  type OpportunityLayer,
  type OpportunityType,
  type SignalOptions,
  type VenueSlug,
} from "hettnet-core";
import { createAlertRule, listAlertRules, type AlertRule } from "@/engine/alert-store";
import {
  getStoredOpportunity,
  lastOpportunityFetchAt,
  listStoredOpportunities,
  setOpportunitySnapshot,
} from "@/engine/opportunity-store";
import { parseEvmAddress } from "@/lib/wallet/evm";

export const AGENT_DISCLAIMER = INDICATION_DISCLAIMER;
export const AGENT_CAPABILITIES = {
  sign: false,
  send: false,
  custody: false,
  keys: false,
} as const;

const FRESH_MS = 60_000;

export interface OpportunityFilter {
  venue?: VenueSlug;
  indication?: Indication;
  layer?: OpportunityLayer;
  type?: OpportunityType;
  asset?: string;
  minApy?: number;
  minTvl?: number;
  limit?: number;
  refresh?: boolean;
}

export async function ensureOpportunities(refresh = false): Promise<Opportunity[]> {
  const fetchedAt = lastOpportunityFetchAt();
  const stored = listStoredOpportunities();
  if (!refresh && stored.length > 0 && fetchedAt !== null && Date.now() - fetchedAt < FRESH_MS) {
    return stored;
  }
  const result = await discoverOpportunities();
  setOpportunitySnapshot(result.opportunities, result.fetchedAt, result.errors);
  return result.opportunities;
}

export function filterOpportunities(items: Opportunity[], filter: OpportunityFilter): Opportunity[] {
  const asset = filter.asset?.trim().toLowerCase();
  const limit = Math.min(Math.max(filter.limit ?? 25, 1), 100);
  return items
    .filter((row) => (filter.venue ? row.venue === filter.venue : true))
    .filter((row) => (filter.layer ? row.layer === filter.layer : true))
    .filter((row) => (filter.type ? row.type === filter.type : true))
    .filter((row) => (filter.indication ? row.signal?.indication === filter.indication : true))
    .filter((row) => {
      if (!asset) return true;
      const symbols = row.assets.map((a) => a.symbol.toLowerCase()).join(" ");
      return symbols.includes(asset) || row.id.toLowerCase().includes(asset);
    })
    .filter((row) => {
      if (filter.minApy === undefined) return true;
      const apy = row.apyTotal ?? row.apyBase;
      return apy !== null && apy >= filter.minApy;
    })
    .filter((row) => {
      if (filter.minTvl === undefined) return true;
      return row.tvl !== null && row.tvl >= filter.minTvl;
    })
    .slice(0, limit);
}

export async function listOpportunities(filter: OpportunityFilter = {}) {
  const items = await ensureOpportunities(filter.refresh === true);
  const opportunities = filterOpportunities(items, filter);
  return {
    opportunities,
    count: opportunities.length,
    fetchedAt: lastOpportunityFetchAt(),
    disclaimer: AGENT_DISCLAIMER,
    capabilities: AGENT_CAPABILITIES,
  };
}

export async function getOpportunity(id: string) {
  await ensureOpportunities();
  const opportunity = getStoredOpportunity(id);
  if (!opportunity) return null;
  return {
    opportunity,
    disclaimer: AGENT_DISCLAIMER,
    capabilities: AGENT_CAPABILITIES,
  };
}

export function simulateRate(input: {
  opportunityId?: string;
  totalSupplied?: number;
  totalBorrowed?: number;
  additionalSupply?: number;
}) {
  const additionalSupply = Number(input.additionalSupply ?? 0);
  let totalSupplied = input.totalSupplied;
  let totalBorrowed = input.totalBorrowed;
  let assumed = false;

  if (input.opportunityId) {
    const opp = getStoredOpportunity(input.opportunityId);
    if (!opp) {
      return { error: "Unknown opportunity. Call list_opportunities first.", status: 404 as const };
    }
    if (opp.venue !== "hypercore") {
      return {
        error: "simulate_rate uses the HyperCore stablecoin model. Pick a hypercore:lend opportunity or pass totals.",
        status: 400 as const,
      };
    }
    if (totalSupplied === undefined) totalSupplied = opp.supplied ?? undefined;
    if (totalBorrowed === undefined) totalBorrowed = opp.borrowed ?? undefined;
    if (
      (totalSupplied === undefined || totalBorrowed === undefined) &&
      opp.tvl !== null &&
      opp.oraclePx &&
      opp.oraclePx > 0 &&
      opp.utilization !== null
    ) {
      totalSupplied = opp.tvl / opp.oraclePx;
      totalBorrowed = totalSupplied * opp.utilization;
      assumed = true;
    }
  }

  if (
    totalSupplied === undefined ||
    totalBorrowed === undefined ||
    !Number.isFinite(totalSupplied) ||
    !Number.isFinite(totalBorrowed) ||
    !Number.isFinite(additionalSupply)
  ) {
    return {
      error: "totalSupplied, totalBorrowed, and additionalSupply are required numbers.",
      status: 400 as const,
    };
  }

  const simulation = simulateSupplyApy({ totalSupplied, totalBorrowed, additionalSupply });
  return {
    simulation,
    assumed,
    disclaimer: AGENT_DISCLAIMER,
    note: assumed
      ? "supplied/borrowed were derived from TVL, oraclePx, and utilization."
      : "HyperCore stablecoin model: borrow APY = 0.05 + 4.75 * max(0, util - 0.8).",
  };
}

export async function evaluateEntry(input: { id: string } & SignalOptions) {
  await ensureOpportunities();
  const opportunity = getStoredOpportunity(input.id);
  if (!opportunity) return { error: "Unknown opportunity. Call list_opportunities first.", status: 404 as const };
  const options: SignalOptions = {};
  if (input.ceilingApy !== undefined) options.ceilingApy = input.ceilingApy;
  if (input.outlierApy !== undefined) options.outlierApy = input.outlierApy;
  if (input.thinTvlUsd !== undefined) options.thinTvlUsd = input.thinTvlUsd;
  if (input.minTvlEnterLendUsd !== undefined) options.minTvlEnterLendUsd = input.minTvlEnterLendUsd;
  if (input.minTvlEnterLpUsd !== undefined) options.minTvlEnterLpUsd = input.minTvlEnterLpUsd;
  if (input.incentiveShareWatch !== undefined) options.incentiveShareWatch = input.incentiveShareWatch;
  if (input.highUtil !== undefined) options.highUtil = input.highUtil;
  const signal = scoreOpportunity(opportunity, options);
  return {
    id: opportunity.id,
    venue: opportunity.venue,
    signal,
    opportunity: { ...opportunity, signal },
    disclaimer: AGENT_DISCLAIMER,
    capabilities: AGENT_CAPABILITIES,
  };
}

export function opportunityMatchesRule(opp: Opportunity, rule: AlertRule): boolean {
  if (rule.venue && opp.venue !== rule.venue) return false;
  if (rule.indication && opp.signal?.indication !== rule.indication) return false;
  if (rule.asset) {
    const needle = rule.asset.toLowerCase();
    const symbols = opp.assets.map((a) => a.symbol.toLowerCase()).join(" ");
    if (!symbols.includes(needle) && !opp.id.toLowerCase().includes(needle)) return false;
  }
  if (rule.minApy !== null) {
    const apy = opp.apyTotal ?? opp.apyBase;
    if (apy === null || apy < rule.minApy) return false;
  }
  if (rule.minTvl !== null) {
    if (opp.tvl === null || opp.tvl < rule.minTvl) return false;
  }
  return true;
}

export async function createAlert(input: {
  name?: string;
  venue?: VenueSlug | null;
  indication?: Indication | null;
  asset?: string | null;
  minApy?: number | null;
  minTvl?: number | null;
  webhookUrl?: string | null;
}) {
  const items = await ensureOpportunities();
  const rule = createAlertRule(input);
  const matches = items.filter((row) => opportunityMatchesRule(row, rule)).map((row) => row.id);
  let webhook: { ok: boolean; detail: string } | null = null;
  if (rule.webhookUrl && matches.length > 0) {
    webhook = await pingWebhook(rule.webhookUrl, {
      rule,
      matches,
      disclaimer: AGENT_DISCLAIMER,
    });
  }
  return {
    rule,
    matches,
    fired: matches.length > 0,
    webhook,
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function listAlerts() {
  return {
    rules: listAlertRules(),
    disclaimer: AGENT_DISCLAIMER,
  };
}

export async function proposeEntry(input: { id: string; account?: string | null; amountWei?: string | null }) {
  await ensureOpportunities();
  const opportunity = getStoredOpportunity(input.id);
  if (!opportunity) {
    return { error: "Load opportunities first, then propose an entry.", status: 404 as const };
  }
  if (opportunity.signal?.indication === "AVOID") {
    return {
      error: opportunity.signal.reasons[0] ?? "This print is marked AVOID.",
      indication: "AVOID" as const,
      status: 400 as const,
    };
  }
  const account = parseEvmAddress(input.account ?? null);
  const amountWei =
    input.amountWei && /^\d+$/.test(input.amountWei) ? BigInt(input.amountWei) : undefined;
  const plan = buildEntryPlan(opportunity, { account, amountWei });
  const simulation = await simulatePlan(plan.txs, account);
  return {
    ...plan,
    simulation,
    capabilities: AGENT_CAPABILITIES,
  };
}

async function simulatePlan(
  txs: { to: Address; data: Hex; value: "0"; description: string }[],
  account: Address | null,
): Promise<{ ok: boolean; message: string; gasHype: string | null }> {
  if (txs.length === 0) {
    return { ok: true, message: "No in-app calldata. Open the venue to enter.", gasHype: null };
  }
  if (!account) {
    return {
      ok: true,
      message: "Calldata is encoded. Pass account to estimate gas. Testnet only. Mainnet send is off.",
      gasHype: null,
    };
  }
  const client = evmClient();
  try {
    let gas = 0n;
    for (const tx of txs) {
      gas += await client.estimateGas({ account, to: tx.to, data: tx.data });
    }
    const price = await client.getGasPrice();
    const hype = formatEther(gas * price);
    return {
      ok: true,
      message: `eth_call estimate succeeded (~${hype} HYPE at current gas price). Testnet only. Mainnet send is off.`,
      gasHype: hype,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `eth_call reverted: ${error.message}. Calldata is still encoded.`
          : "eth_call reverted. Calldata is still encoded.",
      gasHype: null,
    };
  }
}

async function pingWebhook(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, detail: "webhookUrl must be http or https." };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    return { ok: res.ok, detail: `webhook HTTP ${res.status}` };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "webhook failed",
    };
  }
}

export const VENUES: VenueSlug[] = [
  "hypercore",
  "hyperlend",
  "felix",
  "morpho",
  "hyperswap",
  "kittenswap",
  "projectx",
];

export const INDICATIONS: Indication[] = ["ENTER", "WATCH", "AVOID"];
