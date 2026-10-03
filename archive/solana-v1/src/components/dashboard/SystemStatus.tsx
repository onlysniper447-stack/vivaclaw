"use client";

import { Activity, Radio, Shield, Wifi } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Hint } from "./Hint";
import { cn } from "@/lib/cn";
import type { DashboardPayload, ServiceProbe } from "@/types/dashboard";

function ProbeCard({ probe, icon: Icon }: { probe: ServiceProbe; icon: typeof Wifi }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/2 p-3.5 transition-colors",
        probe.ok ? "border-white/8 hover:border-claw-safe/30" : "border-claw-blood/25 hover:border-claw-blood/40",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-white">
          <Icon className={cn("size-4", probe.ok ? "text-claw-safe" : "text-claw-blood")} />
          {probe.name}
        </div>
        <StatusBadge kind={probe.ok ? "safe" : "error"} label={probe.ok ? "up" : "down"} />
      </div>
      <p className="font-mono text-[11px] leading-relaxed break-all text-zinc-500">{probe.detail}</p>
      {probe.latencyMs !== null ? (
        <p className="mt-2 font-mono text-[11px] text-zinc-600">{probe.latencyMs} ms</p>
      ) : null}
    </div>
  );
}

export function SystemStatus({ data }: { data: DashboardPayload | undefined }) {
  const dryRun = data?.dryRun ?? true;
  const circuit = data?.engineStatus === "CIRCUIT_HOLD" || Boolean(data?.risk?.circuitHold);

  return (
    <Card id="overview">
      <CardHeader>
        <div>
          <CardTitle>System status</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Connectivity and operator mode at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dryRun ? <StatusBadge kind="dry-run" /> : <StatusBadge kind="error" label="LIVE" />}
          {circuit ? <StatusBadge kind="circuit-hold" /> : <StatusBadge kind="safe" />}
        </div>
      </CardHeader>
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Hint label="Server-side AGENT_DRY_RUN. True means no sign/send.">
          <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2.5">
            <dt className="text-[11px] tracking-wider text-zinc-500 uppercase">Dry-run</dt>
            <dd className="mt-1 font-mono text-sm text-claw-amber">{dryRun ? "true" : "false"}</dd>
          </div>
        </Hint>
        <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2.5">
          <dt className="text-[11px] tracking-wider text-zinc-500 uppercase">Engine</dt>
          <dd className="mt-1 font-mono text-sm text-zinc-100">{data?.engineStatus ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2.5">
          <dt className="text-[11px] tracking-wider text-zinc-500 uppercase">Mode</dt>
          <dd className="mt-1 font-mono text-sm text-zinc-100">{data?.mode ?? "idle"}</dd>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/2 px-3 py-2.5">
          <dt className="text-[11px] tracking-wider text-zinc-500 uppercase">Cluster</dt>
          <dd className="mt-1 font-mono text-sm text-zinc-100">{data?.cluster ?? "—"}</dd>
        </div>
      </dl>
      <div className="grid gap-3 md:grid-cols-3">
        <ProbeCard probe={data?.probes.rpc ?? idleProbe("Solana RPC")} icon={Radio} />
        <ProbeCard probe={data?.probes.jupiter ?? idleProbe("Jupiter API")} icon={Wifi} />
        <ProbeCard probe={data?.probes.engine ?? idleProbe("Engine")} icon={Activity} />
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
        <Shield className="size-3.5 text-claw-amber" />
        Signing is disabled while dry-run is true. Private keys are never shown.
      </p>
    </Card>
  );
}

function idleProbe(name: string): ServiceProbe {
  return {
    name,
    ok: false,
    configured: false,
    latencyMs: null,
    detail: "awaiting dashboard payload",
  };
}
