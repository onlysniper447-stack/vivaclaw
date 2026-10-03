"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import type { DashboardPayload } from "@/types/dashboard";

export function ActivityLog({ data }: { data: DashboardPayload | undefined }) {
  const logs = data?.logs ?? [];

  return (
    <Card id="activity" className="overflow-hidden p-0">
      <div className="border-b border-white/8 px-5 py-4">
        <CardTitle>Activity</CardTitle>
        <p className="mt-1 text-sm text-zinc-500">Engine events from this process only.</p>
      </div>
      {logs.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-zinc-500">
          No engine events yet. A dry-run sweep records APY observations, risk decisions, and
          quote attempts. On-chain fills are never faked.
        </p>
      ) : (
        <ol className="max-h-[28rem] overflow-y-auto px-5 py-3">
          {[...logs].reverse().map((log, index) => (
            <li key={`${log.ts}-${index}`} className="flex gap-3 py-2.5">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  log.level === "error" && "bg-claw-blood",
                  log.level === "warn" && "bg-claw-amber",
                  log.level === "info" && "bg-zinc-500",
                )}
              />
              <div className="min-w-0 flex-1 border-b border-white/5 pb-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-[0.14em] uppercase",
                      log.level === "error" && "text-claw-blood",
                      log.level === "warn" && "text-claw-amber",
                      log.level === "info" && "text-zinc-500",
                    )}
                  >
                    {log.status} · {log.level}
                  </span>
                  <time className="font-mono text-[11px] text-zinc-600">{formatClock(log.ts)}</time>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-200">{log.message}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
