import {
  HYPERCORE_INFO_URL,
  HYPERCORE_TESTNET_INFO_URL,
  HYPEREVM_RPC_URL,
  HYPEREVM_TESTNET_RPC_URL,
  HYPERLIQUID_APP_URL,
  HYPERLIQUID_TESTNET_APP_URL,
} from "./constants";

export type HettnetNetwork = "testnet" | "mainnet";

/** Locked to testnet unless HETTNET_NETWORK=mainnet. */
export function hettnetNetwork(): HettnetNetwork {
  return process.env.HETTNET_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

export function hypercoreInfoUrl(): string {
  if (hettnetNetwork() === "testnet") {
    const fromEnv = process.env.HYPERCORE_INFO_URL?.trim();
    if (fromEnv && fromEnv.includes("testnet")) return fromEnv;
    return HYPERCORE_TESTNET_INFO_URL;
  }
  return process.env.HYPERCORE_INFO_URL?.trim() || HYPERCORE_INFO_URL;
}

export function hyperevmRpcUrl(): string {
  if (hettnetNetwork() === "testnet") {
    const fromEnv = process.env.HYPEREVM_TESTNET_RPC_URL?.trim();
    return fromEnv || HYPEREVM_TESTNET_RPC_URL;
  }
  return process.env.HYPEREVM_RPC_URL?.trim() || HYPEREVM_RPC_URL;
}

export function hyperliquidAppUrl(): string {
  return hettnetNetwork() === "testnet" ? HYPERLIQUID_TESTNET_APP_URL : HYPERLIQUID_APP_URL;
}
