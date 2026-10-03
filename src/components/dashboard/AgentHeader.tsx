"use client";

import { Activity, Wifi, WifiOff } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/cn";
import { StatusBadge } from "./StatusBadge";
import { Hint } from "./Hint";

export function AgentHeader() {
  const snapshot = useAgentStore((s) => s.snapshot);
  const dashboard = useAgentStore((s) => s.dashboard);
  const connected = useAgentStore((s) => s.connected);
  const dryRun = dashboard?.dryRun ?? snapshot?.dryRun ?? true;
  const circuit =
    dashboard?.engineStatus === "CIRCUIT_HOLD" || Boolean(dashboard?.risk?.circuitHold);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-claw-amber/35 bg-gradient-to-br from-claw-amber/20 to-transparent font-display text-lg tracking-[0.12em] text-claw-amber shadow-[0_0_32px_rgb(240_180_41/16%)]">
          H
        </div>
        <div>
          <p className="font-display text-[1.65rem] leading-none tracking-[0.22em] text-white">
            HETTNET
          </p>
          <p className="mt-1.5 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">
            Solana yield operator · {publicEnv.NEXT_PUBLIC_CLUSTER}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dryRun ? (
          <Hint label="AGENT_DRY_RUN is true. Quotes may run; nothing is signed or broadcast.">
            <StatusBadge kind="dry-run" />
          </Hint>
        ) : (
          <StatusBadge kind="error" label="LIVE" />
        )}
        {circuit ? (
          <Hint label="Oracle or risk guardrail tripped. Execution stays blocked.">
            <StatusBadge kind="circuit-hold" />
          </Hint>
        ) : (
          <Hint label="Peg, freshness, and volatility checks are currently clear.">
            <StatusBadge kind="safe" />
          </Hint>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-3 py-1 text-[11px] tracking-wide text-zinc-300">
          <Activity className="size-3.5 text-claw-amber" />
          {dashboard?.engineStatus ?? snapshot?.mode ?? "idle"}
        </span>
        <Hint
          label={
            connected
              ? "Live yield feed websocket is connected."
              : "Yield feed websocket is offline. Dashboard still polls over HTTP."
          }
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]",
              connected
                ? "border-claw-safe/30 bg-claw-safe/8 text-claw-safe"
                : "border-white/10 text-zinc-500",
            )}
          >
            {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            feed
          </span>
        </Hint>
      </div>
    </header>
  );
}
