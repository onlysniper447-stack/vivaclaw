"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { createQueryClient } from "@/lib/query-client";
import { findWallet } from "@/lib/wallet/injected";
import { useWalletStore } from "@/store/wallet-store";

function WalletSession() {
  const restore = useWalletStore((s) => s.restore);
  const refreshAvailable = useWalletStore((s) => s.refreshAvailable);
  const provider = useWalletStore((s) => s.provider);
  const disconnect = useWalletStore((s) => s.disconnect);

  useEffect(() => {
    refreshAvailable();
    void restore();
  }, [refreshAvailable, restore]);

  useEffect(() => {
    if (!provider) return;
    const wallet = findWallet(provider);
    if (!wallet) return;
    return wallet.subscribe((key) => {
      if (!key) void disconnect();
      else useWalletStore.setState({ publicKey: key, status: "connected" });
    });
  }, [provider, disconnect]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <WalletSession />
      {children}
    </QueryClientProvider>
  );
}
