"use client";

import { Layers, Landmark, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ApyMeter } from "./ApyMeter";
import { useAgentStore } from "@/store/agent-store";
import type { ProtocolId } from "@/types";

const PROTOCOLS: { id: ProtocolId; label: string; hint: string; icon: typeof Landmark }[] = [
  { id: "kamino", label: "Kamino Lend", hint: "klend supply APY", icon: Landmark },
  { id: "meteora", label: "Meteora Vaults", hint: "dynamic vault APY", icon: Layers },
  { id: "jupiter", label: "Jupiter v6", hint: "route / ΔAPY rows", icon: Repeat },
];

function formatApy(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function ProtocolCards() {
  const opportunities = useAgentStore((s) => s.snapshot?.opportunities ?? []);
  const max = Math.max(...opportunities.map((row) => Math.abs(row.netApyBps ?? 0)), 1);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PROTOCOLS.map(({ id, label, hint, icon: Icon }) => {
        const rows = opportunities.filter((o) => o.protocol === id);
        const best = rows[0];
        return (
          <Card key={id} className="group flex flex-col gap-3 hover:border-claw-amber/25">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl border border-white/10 bg-white/4 p-2.5 text-claw-amber transition-colors group-hover:border-claw-amber/30">
                <Icon className="size-4" />
              </div>
              <p className="text-[11px] tracking-wider text-zinc-600 uppercase">{hint}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-300">{label}</p>
              <p className="mt-1 font-mono text-2xl tracking-tight text-white">
                {best && best.netApyBps !== null ? formatApy(best.netApyBps) : "—"}
              </p>
            </div>
            <ApyMeter bps={best?.netApyBps ?? null} maxBps={max} tone={id === "meteora" ? "cyan" : "amber"} />
            <p className="text-[11px] text-zinc-600">{rows.length} ranked venues</p>
          </Card>
        );
      })}
    </div>
  );
}
