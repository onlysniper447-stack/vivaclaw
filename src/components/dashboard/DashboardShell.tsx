"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AgentHeader } from "./AgentHeader";
import { AgentStatus } from "./AgentStatus";
import { ActivityLog } from "./ActivityLog";
import { ExecutionPanel } from "./ExecutionPanel";
import { ProtocolCards } from "./ProtocolCards";
import { RiskEnginePanel } from "./RiskEnginePanel";
import { ScanDialog } from "./ScanDialog";
import { StatusBadge } from "./StatusBadge";
import { SystemStatus } from "./SystemStatus";
import { YieldMonitor } from "./YieldMonitor";
import { YieldTable } from "./YieldTable";
import { useAgentStore } from "@/store/agent-store";
import { getWsBrowserUrl } from "@/lib/public-env";
import { cn } from "@/lib/cn";
import type { AgentSnapshot, DashboardPayload, WsFeedEvent } from "@/types";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#yield", label: "Yield" },
  { href: "#risk", label: "Risk" },
  { href: "#execution", label: "Execution" },
  { href: "#activity", label: "Activity" },
] as const;

async function fetchStatus(): Promise<AgentSnapshot> {
  const res = await fetch("/api/agent/status");
  if (!res.ok) throw new Error("status unavailable");
  return (await res.json()) as AgentSnapshot;
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error ?? "dashboard unavailable");
  }
  return (await res.json()) as DashboardPayload;
}

export function DashboardShell() {
  const setSnapshot = useAgentStore((s) => s.setSnapshot);
  const setDashboard = useAgentStore((s) => s.setDashboard);
  const setOpportunities = useAgentStore((s) => s.setOpportunities);
  const setExecution = useAgentStore((s) => s.setExecution);
  const setConnected = useAgentStore((s) => s.setConnected);

  const status = useQuery({
    queryKey: ["agent-status"],
    queryFn: fetchStatus,
  });

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (status.data) setSnapshot(status.data);
  }, [status.data, setSnapshot]);

  useEffect(() => {
    if (dashboard.data) setDashboard(dashboard.data);
  }, [dashboard.data, setDashboard]);

  useEffect(() => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(getWsBrowserUrl());
    } catch {
      setConnected(false);
      return;
    }
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      let parsed: WsFeedEvent;
      try {
        parsed = JSON.parse(String(event.data)) as WsFeedEvent;
      } catch {
        return;
      }
      if (parsed.type === "snapshot" || parsed.type === "heartbeat") {
        setSnapshot(parsed.payload as AgentSnapshot);
      }
      if (parsed.type === "scan") {
        setOpportunities(parsed.payload as AgentSnapshot["opportunities"]);
      }
      if (parsed.type === "execution") {
        setExecution(parsed.payload as NonNullable<AgentSnapshot["lastExecution"]>);
      }
    };
    return () => socket.close();
  }, [setConnected, setExecution, setOpportunities, setSnapshot]);

  const payload = dashboard.data;
  const banners = payload?.banners ?? ["dry-run"];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b border-white/8 bg-claw-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex max-w-full gap-1 overflow-x-auto text-[12px] tracking-[0.12em] uppercase">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <ScanDialog />
        </div>
      </div>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
      >
        <AgentHeader />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {banners.map((kind) => (
                <StatusBadge key={kind} kind={kind} />
              ))}
              {dashboard.isError ? <StatusBadge kind="error" /> : null}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              Read-only operator console. Dry-run stays on — this page never signs, sends, or
              broadcasts Solana transactions.
            </p>
          </div>
        </div>

        {dashboard.isError ? (
          <p
            className={cn(
              "rounded-xl border border-claw-blood/30 bg-claw-blood/10 px-4 py-3 text-sm text-claw-blood",
            )}
          >
            Dashboard API error:{" "}
            {dashboard.error instanceof Error ? dashboard.error.message : "unknown"}
          </p>
        ) : null}

        <SystemStatus data={payload} />
        <YieldMonitor data={payload} />
        <ProtocolCards />

        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <YieldTable />
            <ActivityLog data={payload} />
          </div>
          <div className="flex flex-col gap-5">
            <RiskEnginePanel data={payload} />
            <ExecutionPanel data={payload} />
            <AgentStatus />
          </div>
        </div>
      </motion.main>
    </div>
  );
}
