import { isAddress, type Address } from "viem";
import {
  CIRCLE_USDC,
  HYPERCORE_TESTNET_USDC_EVM,
  HYPERCORE_USDC_EVM,
  USDT0,
  WHYPE_ADDRESS,
  hettnetNetwork,
} from "hettnet-core";

export const WALLET_CAPABILITIES = {
  connect: true,
  disconnect: true,
  readAddress: true,
  signTransaction: false,
  sendTransaction: false,
  signMessage: false,
} as const;

export function parseEvmAddress(raw: string | null | undefined): Address | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!isAddress(trimmed)) return null;
  return trimmed;
}

export function chainLabel(chainId: number | undefined): string {
  if (chainId === 998) return "HyperEVM testnet";
  if (chainId === 999) return "HyperEVM";
  if (!chainId) return "No chain";
  return `Chain ${chainId}`;
}

export function evmHoldingsWatchlist(): { symbol: string; address: Address; decimals: number }[] {
  if (hettnetNetwork() === "testnet") {
    return [
      { symbol: "USDC (HyperCore)", address: HYPERCORE_TESTNET_USDC_EVM as Address, decimals: 8 },
      { symbol: "WHYPE", address: WHYPE_ADDRESS as Address, decimals: 18 },
    ];
  }
  return [
    { symbol: "USDC (Circle)", address: CIRCLE_USDC as Address, decimals: 6 },
    { symbol: "USDC (HyperCore)", address: HYPERCORE_USDC_EVM as Address, decimals: 8 },
    { symbol: "USDT0", address: USDT0 as Address, decimals: 6 },
    { symbol: "WHYPE", address: WHYPE_ADDRESS as Address, decimals: 18 },
  ];
}
