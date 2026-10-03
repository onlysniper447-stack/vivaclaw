/**
 * Entry plans for Hyperliquid venues.
 * Encodes unsigned calldata. Never signs, sends, or holds keys.
 * Mainnet send stays off in this phase. HyperCore L1 borrowLend is unofficial —
 * the documented path is CoreWriter action 15 or the Hyperliquid app.
 */

import { concatHex, encodeAbiParameters, encodeFunctionData, numberToHex, type Address, type Hex } from "viem";
import {
  CORE_WRITER_ADDRESS,
  HYPERLEND,
  HYPERLEND_APP_URL,
  HYPERLIQUID_APP_URL,
  HYPERSWAP_APP_URL,
} from "./constants";
import { INDICATION_DISCLAIMER } from "./signal";
import type { Opportunity } from "./types";

export const erc20ApproveAbi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const hyperlendPoolAbi = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
] as const;

export const erc4626DepositAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
] as const;

export const coreWriterAbi = [
  {
    name: "sendRawAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [],
  },
] as const;

export interface PlannedTx {
  to: Address;
  data: Hex;
  value: "0";
  description: string;
}

export interface PlanStep {
  title: string;
  detail: string;
}

export interface EntryPlan {
  opportunityId: string;
  venue: Opportunity["venue"];
  layer: Opportunity["layer"];
  indication: "ENTER" | "WATCH" | "AVOID" | null;
  requiredToken: { symbol: string; id: string; layer: Opportunity["layer"] };
  /** Human-readable size used to encode calldata. */
  amountLabel: string;
  amountWei: string;
  steps: PlanStep[];
  txs: PlannedTx[];
  deepLink: string | null;
  /** HyperCore token wei uses 8 decimals unless the venue prints otherwise. */
  coreWeiDecimalsAssumed: number | null;
  signNetwork: "testnet" | "mainnet-blocked";
  risks: string[];
  disclaimer: string;
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export function defaultPlanAmountWei(symbol: string, decimals: number): bigint {
  const upper = symbol.toUpperCase();
  if (upper.includes("HYPE") && !upper.includes("USD")) {
    const shift = Math.max(decimals - 2, 0);
    return 10n ** BigInt(shift);
  }
  return 10n ** BigInt(Math.max(decimals, 0));
}

export function tokenDecimals(symbol: string, layer: Opportunity["layer"]): number {
  const upper = symbol.toUpperCase();
  if (layer === "core") return 8;
  if (upper.includes("HYPE") && !upper.includes("USD")) return 18;
  if (upper.includes("USDC") || upper.includes("USDT") || upper.includes("USDE") || upper.includes("USDH")) {
    return 6;
  }
  return 18;
}

/** CoreWriter action 15: version 1, action id 15, ABI (uint8 op, uint64 token, uint64 wei). */
export function encodeBorrowLendAction(op: 0 | 1, tokenIndex: number, wei: bigint): Hex {
  const payload = encodeAbiParameters(
    [{ type: "uint8" }, { type: "uint64" }, { type: "uint64" }],
    [op, BigInt(tokenIndex), wei],
  );
  return concatHex([numberToHex(1, { size: 1 }), numberToHex(15, { size: 3 }), payload]);
}

export function encodeCoreWriterSupply(tokenIndex: number, wei: bigint): PlannedTx {
  const action = encodeBorrowLendAction(0, tokenIndex, wei);
  return {
    to: CORE_WRITER_ADDRESS,
    data: encodeFunctionData({
      abi: coreWriterAbi,
      functionName: "sendRawAction",
      args: [action],
    }),
    value: "0",
    description: `CoreWriter action 15 supply token index ${tokenIndex}`,
  };
}

export function encodeHyperlendSupply(asset: Address, amount: bigint, onBehalfOf: Address): PlannedTx[] {
  const pool = HYPERLEND.pool as Address;
  return [
    {
      to: asset,
      data: encodeFunctionData({
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [pool, amount],
      }),
      value: "0",
      description: `Approve HyperLend Pool to spend the asset`,
    },
    {
      to: pool,
      data: encodeFunctionData({
        abi: hyperlendPoolAbi,
        functionName: "supply",
        args: [asset, amount, onBehalfOf, 0],
      }),
      value: "0",
      description: "HyperLend Pool.supply",
    },
  ];
}

export function encodeErc4626Deposit(vault: Address, asset: Address, amount: bigint, receiver: Address): PlannedTx[] {
  return [
    {
      to: asset,
      data: encodeFunctionData({
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [vault, amount],
      }),
      value: "0",
      description: "Approve the ERC-4626 vault to spend the asset",
    },
    {
      to: vault,
      data: encodeFunctionData({
        abi: erc4626DepositAbi,
        functionName: "deposit",
        args: [amount, receiver],
      }),
      value: "0",
      description: "ERC-4626 deposit",
    },
  ];
}

export function buildEntryPlan(
  opp: Opportunity,
  opts: { account?: Address | null; amountWei?: bigint } = {},
): EntryPlan {
  const account = (opts.account ?? ZERO) as Address;
  const symbol = opp.assets.map((a) => a.symbol).join("/") || opp.venue;
  const decimals = tokenDecimals(opp.assets[0]?.symbol ?? symbol, opp.layer);
  const amount = opts.amountWei ?? defaultPlanAmountWei(opp.assets[0]?.symbol ?? symbol, decimals);
  const indication = opp.signal?.indication ?? null;
  const risks = [
    ...opp.risks,
    ...(opp.signal?.reasons ?? []),
    "Indications are informational, not financial advice.",
    "Mainnet send is off. Connecting a wallet never signs.",
  ];

  const base: Omit<EntryPlan, "steps" | "txs" | "deepLink" | "coreWeiDecimalsAssumed" | "requiredToken"> = {
    opportunityId: opp.id,
    venue: opp.venue,
    layer: opp.layer,
    indication,
    amountLabel: formatAmount(amount, decimals, opp.assets[0]?.symbol ?? symbol),
    amountWei: amount.toString(),
    signNetwork: "mainnet-blocked",
    risks,
    disclaimer: INDICATION_DISCLAIMER,
  };

  if (opp.venue === "hypercore") {
    const index = Number(opp.id.split(":").at(-1));
    const txs =
      Number.isInteger(index) && index >= 0 ? [encodeCoreWriterSupply(index, amount)] : [];
    return {
      ...base,
      requiredToken: {
        symbol: opp.assets[0]?.symbol ?? "USDC (HyperCore)",
        id: opp.assets[0]?.id ?? `core:${index}`,
        layer: "core",
      },
      steps: [
        {
          title: "Required token",
          detail:
            "HyperCore USDC is not Circle USDC. Supply uses the HyperCore reserve, not the Circle token on HyperEVM.",
        },
        {
          title: "Layer",
          detail: "Funds must already sit on HyperCore. A CoreWriter call from HyperEVM supplies the linked Core token.",
        },
        {
          title: "Documented action",
          detail:
            "CoreWriter at 0x3333…3333, action 15, encodedOperation 0 (Supply). Signed L1 borrowLend is unofficial, so the app deep-link is the primary path.",
        },
        {
          title: "Decimals",
          detail: "HyperCore wei is encoded with 8 decimals (szDecimals). Confirm on the Hyperliquid app before any sign.",
        },
      ],
      txs,
      deepLink: opp.url ?? HYPERLIQUID_APP_URL,
      coreWeiDecimalsAssumed: 8,
    };
  }

  if (opp.venue === "hyperlend") {
    const asset = asAddress(opp.assets[0]?.id);
    const txs = asset ? encodeHyperlendSupply(asset, amount, account) : [];
    return {
      ...base,
      requiredToken: {
        symbol: opp.assets[0]?.symbol ?? "asset",
        id: opp.assets[0]?.id ?? "",
        layer: "evm",
      },
      steps: [
        { title: "Required token", detail: `${opp.assets[0]?.symbol ?? "Asset"} on HyperEVM (Circle USDC is not HyperCore USDC).` },
        { title: "Approve", detail: "ERC-20 approve the HyperLend Pool." },
        { title: "Supply", detail: "Pool.supply(asset, amount, onBehalfOf, 0) on the documented Core Pool." },
        {
          title: "Testnet",
          detail: "HyperLend Core Pool is documented on HyperEVM mainnet. Testnet deployments were not found. eth_call can still dry-run on mainnet. Send stays off.",
        },
      ],
      txs,
      deepLink: HYPERLEND_APP_URL,
      coreWeiDecimalsAssumed: null,
    };
  }

  if (opp.venue === "felix" || opp.venue === "morpho") {
    const vault = vaultAddress(opp.id);
    const asset = asAddress(opp.assets[0]?.id);
    const txs = vault && asset ? encodeErc4626Deposit(vault, asset, amount, account) : [];
    return {
      ...base,
      requiredToken: {
        symbol: opp.assets[0]?.symbol ?? "asset",
        id: opp.assets[0]?.id ?? "",
        layer: "evm",
      },
      steps: [
        { title: "Required token", detail: `${opp.assets[0]?.symbol ?? "Asset"} on HyperEVM, the vault's underlying.` },
        { title: "Approve", detail: "ERC-20 approve the ERC-4626 vault." },
        { title: "Deposit", detail: "vault.deposit(assets, receiver)." },
        {
          title: "Testnet",
          detail: "Felix/Morpho vaults in this list are mainnet addresses. Testnet deployments were not found. Send stays off.",
        },
      ],
      txs,
      deepLink: opp.url,
      coreWeiDecimalsAssumed: null,
    };
  }

  return {
    ...base,
    requiredToken: {
      symbol,
      id: opp.assets[0]?.id ?? opp.id,
      layer: "evm",
    },
    steps: [
      { title: "LP entry", detail: "In-app LP mint is not wired. Open the venue with the pair from this print." },
      {
        title: "Range",
        detail:
          opp.type === "lp"
            ? "Concentrated-liquidity fee APR assumes the position stays in range. Out of range, fee earnings stop."
            : "Follow the venue UI for the deposit.",
      },
    ],
    txs: [],
    deepLink: opp.url ?? venueAppUrl(opp.venue),
    coreWeiDecimalsAssumed: null,
  };
}

function venueAppUrl(venue: Opportunity["venue"]): string | null {
  if (venue === "hyperswap") return HYPERSWAP_APP_URL;
  if (venue === "hyperlend") return HYPERLEND_APP_URL;
  if (venue === "hypercore") return HYPERLIQUID_APP_URL;
  return null;
}

function asAddress(value: string | undefined): Address | null {
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as Address;
}

function vaultAddress(id: string): Address | null {
  const match = id.match(/morpho:vault:(0x[a-fA-F0-9]{40})$/i);
  return match?.[1] ? (match[1] as Address) : null;
}

function formatAmount(wei: bigint, decimals: number, symbol: string): string {
  if (decimals <= 0) return `${wei.toString()} ${symbol}`;
  const base = 10n ** BigInt(decimals);
  const whole = wei / base;
  const frac = wei % base;
  if (frac === 0n) return `${whole.toString()} ${symbol}`;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr} ${symbol}`;
}
