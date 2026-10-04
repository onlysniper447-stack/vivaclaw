import { isAddress, type Address } from "viem";

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
