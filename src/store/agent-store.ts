"use client";

import { create } from "zustand";
import type { AgentSnapshot, DashboardPayload, ExecutionResult, YieldOpportunity } from "@/types";

interface AgentStore {
  snapshot: AgentSnapshot | null;
  dashboard: DashboardPayload | null;
  connected: boolean;
  setSnapshot: (snapshot: AgentSnapshot) => void;
  setDashboard: (dashboard: DashboardPayload) => void;
  setOpportunities: (opportunities: YieldOpportunity[]) => void;
  setExecution: (result: ExecutionResult) => void;
  setConnected: (connected: boolean) => void;
}

const emptySnapshot = (): AgentSnapshot => ({
  mode: "idle",
  dryRun: true,
  cluster: "mainnet-beta",
  pubkey: null,
  lastScanAt: null,
  opportunities: [],
  lastExecution: null,
  haltReason: null,
  engine: {
    phase: "idle",
    reason: null,
    lastSuccessAt: null,
    sources: {
      hypercore: { state: "idle", message: null },
      llama: { state: "idle", message: null },
      morpho: { state: "idle", message: null },
      dexscreener: { state: "idle", message: null },
      hyperlend: { state: "idle", message: null },
    },
  },
});

export const useAgentStore = create<AgentStore>((set) => ({
  snapshot: emptySnapshot(),
  dashboard: null,
  connected: false,
  setSnapshot: (snapshot) => set({ snapshot }),
  setDashboard: (dashboard) => set({ dashboard }),
  setOpportunities: (opportunities) =>
    set((state) => ({
      snapshot: state.snapshot
        ? { ...state.snapshot, opportunities, lastScanAt: Date.now() }
        : { ...emptySnapshot(), opportunities, lastScanAt: Date.now() },
    })),
  setExecution: (result) =>
    set((state) => ({
      snapshot: state.snapshot
        ? { ...state.snapshot, lastExecution: result }
        : { ...emptySnapshot(), lastExecution: result },
    })),
  setConnected: (connected) => set({ connected }),
}));
