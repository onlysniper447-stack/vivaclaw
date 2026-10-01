"use client";

import { Lock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Hint } from "./Hint";
import { formatClock, shortenMint } from "@/lib/format";
import type { DashboardPayload } from "@/types/dashboard";

function txLabel(status: DashboardPayload["execution"]["lastTx"]["status"]): string {
  if (status === "quoted-dry-run") return "quoted (not broadcast)";
  if (status === "error") return "error";
  return "none this session";
}

export function ExecutionPanel({ data }: { data: DashboardPayload | undefined }) {
  const dryRun = data?.execution.dryRun ?? true;
  const quote = data?.execution.lastQuote ?? null;
  const lastTx = data?.execution.lastTx ?? { status: "none" as const, at: null };

  return (
    <Card id="execution">
      <CardHeader>
        <div>
          <CardTitle>Execution engine</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Jupiter quotes only. No on-chain send.</p>
        </div>
        {dryRun ? <StatusBadge kind="dry-run" /> : <StatusBadge kind="error" label="LIVE" />}
      </CardHeader>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-claw-amber/25 bg-claw-amber/8 px-3 py-2.5 text-sm text-claw-amber">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        {dryRun
          ? "Dry-run lock: sign, send, and broadcast stay disabled."
          : "Live signing is enabled. Guardrails still apply."}
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">State</dt>
          <dd className="font-mono text-zinc-100">{data?.execution.state ?? "idle"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Last tx</dt>
          <dd className="text-right font-mono text-zinc-300">{txLabel(lastTx.status)}</dd>
        </div>
        {lastTx.error ? <div className="text-xs text-claw-blood">{lastTx.error}</div> : null}
      </dl>

      <p className="mt-4 mb-2 text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Last quote</p>
      {!quote ? (
        <p className="text-sm text-zinc-500">
          No Jupiter quote this process. Dry-run quotes are not on-chain transactions.
        </p>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/2 p-3 font-mono text-xs text-zinc-300">
          <Hint label="Input mint and atomic amount from the last Jupiter quote.">
            <div className="flex justify-between gap-3 py-1">
              <span className="text-zinc-500">in</span>
              <span>
                {quote.inAmount} {shortenMint(quote.inputMint)}
              </span>
            </div>
          </Hint>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-zinc-500">out</span>
            <span>
              {quote.outAmount} {shortenMint(quote.outputMint)}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-zinc-500">jito tip</span>
            <span>{quote.jitoTipLamports} lamports (not sent)</span>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-zinc-500">at</span>
            <span>{formatClock(quote.at)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
