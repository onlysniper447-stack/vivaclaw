"use client";

import { create } from "zustand";
import { detectWallets, findWallet, type WalletName } from "@/lib/wallet/injected";

export type WalletStatus = "idle" | "connecting" | "connected" | "unavailable" | "error";

interface WalletState {
  status: WalletStatus;
  provider: WalletName | null;
  publicKey: string | null;
  error: string | null;
  available: WalletName[];
  connect: (name: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  restore: () => Promise<void>;
  refreshAvailable: () => void;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The wallet did not connect.";
}

export const useWalletStore = create<WalletState>((set, get) => ({
  status: "idle",
  provider: null,
  publicKey: null,
  error: null,
  available: [],
  refreshAvailable() {
    const names = detectWallets().map((wallet) => wallet.name);
    set({
      available: names,
      status: names.length === 0 && get().status !== "connected" ? "unavailable" : get().status,
    });
  },
  async restore() {
    get().refreshAvailable();
    for (const name of get().available) {
      const wallet = findWallet(name);
      if (!wallet) continue;
      try {
        const key = await wallet.connect(true);
        if (key) {
          set({ status: "connected", provider: name, publicKey: key, error: null });
          return;
        }
      } catch {
        // onlyIfTrusted fails quietly when the site is not already approved
      }
    }
  },
  async connect(name) {
    const wallet = findWallet(name);
    if (!wallet) {
      set({ status: "unavailable", error: `${name} is not installed in this browser.` });
      return;
    }
    set({ status: "connecting", error: null, provider: name });
    try {
      const key = await wallet.connect(false);
      if (!key) {
        set({ status: "error", publicKey: null, error: "The wallet did not share a public key." });
        return;
      }
      set({ status: "connected", publicKey: key, error: null, provider: name });
    } catch (error) {
      set({ status: "error", publicKey: null, error: messageOf(error) });
    }
  },
  async disconnect() {
    const name = get().provider;
    if (name) {
      try {
        await findWallet(name)?.disconnect();
      } catch {
        // drop the local session even if the injected wallet errors
      }
    }
    set({ status: get().available.length ? "idle" : "unavailable", publicKey: null, provider: null, error: null });
  },
}));
