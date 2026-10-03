/**
 * Browser wallets are used for public-key access only.
 * This module never calls sign, send, or signMessage.
 */

export const WALLET_CAPABILITIES = {
  connect: true,
  disconnect: true,
  readPublicKey: true,
  signTransaction: false,
  sendTransaction: false,
  signMessage: false,
} as const;

export type WalletName = "phantom" | "solflare";

type InjectedProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toBase58: () => string } | null;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toBase58: () => string } } | void>;
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (key: { toBase58?: () => string } | null) => void) => void;
  off?: (event: string, handler: (key: { toBase58?: () => string } | null) => void) => void;
};

export type ReadOnlyWallet = {
  name: WalletName;
  label: string;
  connect: (onlyIfTrusted?: boolean) => Promise<string | null>;
  disconnect: () => Promise<void>;
  publicKey: () => string | null;
  subscribe: (onChange: (publicKey: string | null) => void) => () => void;
};

declare global {
  interface Window {
    solana?: InjectedProvider;
    phantom?: { solana?: InjectedProvider };
    solflare?: InjectedProvider;
  }
}

function pubkeyOf(provider: InjectedProvider): string | null {
  try {
    return provider.publicKey?.toBase58() ?? null;
  } catch {
    return null;
  }
}

function withLimit<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} did not respond in time.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function wrap(name: WalletName, label: string, provider: InjectedProvider): ReadOnlyWallet {
  return {
    name,
    label,
    async connect(onlyIfTrusted = false) {
      const result = await withLimit(
        provider.connect({ onlyIfTrusted }),
        onlyIfTrusted ? 1_500 : 30_000,
        label,
      );
      if (result && result.publicKey) return result.publicKey.toBase58();
      return pubkeyOf(provider);
    },
    async disconnect() {
      if (provider.disconnect) await provider.disconnect();
    },
    publicKey() {
      return pubkeyOf(provider);
    },
    subscribe(onChange) {
      const onAccount = (key: { toBase58?: () => string } | null) => {
        onChange(key && typeof key.toBase58 === "function" ? key.toBase58() : pubkeyOf(provider));
      };
      const onDisconnect = () => onChange(null);
      provider.on?.("accountChanged", onAccount);
      provider.on?.("disconnect", onDisconnect);
      return () => {
        provider.off?.("accountChanged", onAccount);
        provider.off?.("disconnect", onDisconnect);
      };
    },
  };
}

export function detectWallets(): ReadOnlyWallet[] {
  if (typeof window === "undefined") return [];
  const found: ReadOnlyWallet[] = [];
  const phantom = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined);
  if (phantom) found.push(wrap("phantom", "Phantom", phantom));
  if (window.solflare) found.push(wrap("solflare", "Solflare", window.solflare));
  return found;
}

export function findWallet(name: WalletName): ReadOnlyWallet | null {
  return detectWallets().find((wallet) => wallet.name === name) ?? null;
}
