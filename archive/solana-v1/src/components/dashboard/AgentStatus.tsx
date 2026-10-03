"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint } from "./Hint";
import { useAgentStore } from "@/store/agent-store";
import { formatClock } from "@/lib/format";

function truncate(key: string | null): string {
  if (!key) return "no signer loaded";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function AgentStatus() {
  const snapshot = useAgentStore((s) => s.snapshot);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Agent</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Public identity only. Keys stay off-screen.</p>
        </div>
      </CardHeader>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Hint label="Truncated public key if a signer is configured. The secret is never displayed.">
          <div>
            <dt className="text-[11px] text-zinc-500">Signer</dt>
            <dd className="mt-1 font-mono text-zinc-200">{truncate(snapshot?.pubkey ?? null)}</dd>
          </div>
        </Hint>
        <div>
          <dt className="text-[11px] text-zinc-500">Last scan</dt>
          <dd className="mt-1 font-mono text-zinc-200">{formatClock(snapshot?.lastScanAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] text-zinc-500">Halt</dt>
          <dd className="mt-1 text-zinc-300">{snapshot?.haltReason ?? "none"}</dd>
        </div>
      </dl>
    </Card>
  );
}
