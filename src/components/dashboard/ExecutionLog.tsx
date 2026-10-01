"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { useAgentStore } from "@/store/agent-store";

export function ExecutionLog() {
  const last = useAgentStore((s) => s.snapshot?.lastExecution);

  return (
    <Card>
      <CardTitle>Last execution</CardTitle>
      {!last ? (
        <p className="mt-4 text-sm text-zinc-500">No fills this session.</p>
      ) : (
        <dl className="mt-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">status</dt>
            <dd className={last.ok ? "text-emerald-400" : "text-claw-blood"}>
              {last.ok ? "ok" : "failed"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">mode</dt>
            <dd>{last.dryRun ? "simulate" : "broadcast"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">sig</dt>
            <dd className="truncate">{last.signature ?? "—"}</dd>
          </div>
          {last.error ? (
            <div className="text-claw-blood">{last.error}</div>
          ) : null}
        </dl>
      )}
    </Card>
  );
}
