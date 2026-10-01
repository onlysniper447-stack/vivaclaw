"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { ApyMeter } from "./ApyMeter";
import { cn } from "@/lib/cn";
import { useAgentStore } from "@/store/agent-store";

function formatApy(bps: number | null): string {
  if (bps === null) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

function protocolTone(protocol: string): string {
  if (protocol === "kamino") return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
  if (protocol === "meteora") return "border-claw-cyan/30 bg-claw-cyan/10 text-claw-cyan";
  if (protocol === "jupiter") return "border-claw-amber/30 bg-claw-amber/10 text-claw-amber";
  return "border-white/10 text-zinc-400";
}

export function YieldTable() {
  const rows = useAgentStore((s) => s.snapshot?.opportunities ?? []);
  const maxNet = Math.max(...rows.map((row) => Math.abs(row.netApyBps ?? 0)), 1);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/8 px-5 py-4">
        <div>
          <CardTitle>Ranked opportunities</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Sorted by net APY from the latest scan. Empty until a sweep runs.
          </p>
        </div>
        <p className="font-mono text-[11px] text-zinc-600">{rows.length} rows</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
            <tr>
              <th className="px-5 py-2.5 font-medium">#</th>
              <th className="px-5 py-2.5 font-medium">Venue</th>
              <th className="px-5 py-2.5 font-medium">Asset</th>
              <th className="px-5 py-2.5 font-medium">Net APY</th>
              <th className="px-5 py-2.5 font-medium">Gross</th>
              <th className="px-5 py-2.5 font-medium">Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No scan yet. Check yields now to rank venues.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-t border-white/5 transition-colors hover:bg-white/3"
                >
                  <td className="px-5 py-3.5 font-mono text-zinc-600">{index + 1}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-zinc-100">{row.venueLabel}</p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase",
                        protocolTone(row.protocol),
                      )}
                    >
                      {row.protocol}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-200">{row.asset.symbol}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-base text-claw-amber">{formatApy(row.netApyBps)}</p>
                    <div className="mt-1.5 w-32">
                      <ApyMeter bps={row.netApyBps} maxBps={maxNet} tone="amber" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-400">
                    {formatApy(row.grossApyBps)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-500">
                    {row.priceImpactBps === null ? "—" : `${(row.priceImpactBps / 100).toFixed(2)}%`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
