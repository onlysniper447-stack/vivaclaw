"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ApyMeter } from "./ApyMeter";
import { Hint } from "./Hint";
import { formatApyBps, formatClock, formatSignedApyBps } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DashboardPayload } from "@/types/dashboard";

export function YieldMonitor({ data }: { data: DashboardPayload | undefined }) {
  const triggerBps = data?.yields.triggerBps ?? 350;
  const rows = data?.yields.rows ?? [];
  const anyObserved = rows.some((row) => row.observed);
  const maxApy = Math.max(
    triggerBps,
    ...rows.flatMap((row) => [row.kaminoApyBps ?? 0, row.meteoraApyBps ?? 0, Math.abs(row.deltaApyBps ?? 0)]),
    1,
  );

  return (
    <Card id="yield" className="overflow-hidden p-0">
      <div className="px-5 pt-5 pb-4">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Yield monitoring</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              ΔAPY = Meteora − Kamino. Trigger fires at |Δ| ≥ {(triggerBps / 100).toFixed(1)}%.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
            <Hint label="Execution is only considered when absolute delta meets this band. Dry-run still will not broadcast.">
              <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono">
                |ΔAPY| ≥ {(triggerBps / 100).toFixed(1)}%
              </span>
            </Hint>
            <span className="font-mono">scan {formatClock(data?.lastScanAt)}</span>
          </div>
        </CardHeader>
      </div>
      {!anyObserved ? (
        <p className="border-t border-white/8 px-5 py-3 text-xs text-zinc-500">
          No live observation yet. Placeholders stay empty until a dry-run sweep. No demo APYs are invented.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-t border-white/8 text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
            <tr>
              <th className="px-5 py-2.5 font-medium">Asset</th>
              <th className="px-5 py-2.5 font-medium">Meteora</th>
              <th className="px-5 py-2.5 font-medium">Kamino</th>
              <th className="px-5 py-2.5 font-medium">ΔAPY</th>
              <th className="px-5 py-2.5 font-medium">Trigger</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.mint}
                className="border-t border-white/5 transition-colors hover:bg-white/3"
              >
                <td className="px-5 py-3.5">
                  <p className="font-mono text-sm text-white">{row.symbol}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{row.mint.slice(0, 4)}…</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-mono text-claw-cyan">{formatApyBps(row.meteoraApyBps)}</p>
                  <div className="mt-1.5 w-28">
                    <ApyMeter bps={row.meteoraApyBps} maxBps={maxApy} tone="cyan" />
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-mono text-zinc-200">{formatApyBps(row.kaminoApyBps)}</p>
                  <div className="mt-1.5 w-28">
                    <ApyMeter bps={row.kaminoApyBps} maxBps={maxApy} tone="muted" />
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p
                    className={cn(
                      "font-mono text-base",
                      row.meetsTrigger ? "text-claw-amber" : "text-zinc-300",
                    )}
                  >
                    {formatSignedApyBps(row.deltaApyBps)}
                  </p>
                  <div className="mt-1.5 w-28">
                    <ApyMeter
                      bps={row.deltaApyBps}
                      maxBps={maxApy}
                      tone={row.meetsTrigger ? "amber" : "muted"}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {row.meetsTrigger ? (
                    <StatusBadge kind="dry-run" label="cleared" />
                  ) : (
                    <span className="text-xs text-zinc-500">below</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
