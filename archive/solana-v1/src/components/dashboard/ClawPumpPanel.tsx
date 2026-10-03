"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Hint } from "./Hint";
import { formatLamportsAsSol, shortenMint } from "@/lib/format";
import type { DashboardPayload } from "@/types/dashboard";

export function ClawPumpPanel({ data }: { data: DashboardPayload | undefined }) {
  const claw = data?.clawpump;
  const buyback = claw?.lastBuyback.status ?? "none";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>ClawPump</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Creator fees and configured buyback share.</p>
        </div>
        {claw?.mintConfigured ? (
          <StatusBadge kind="safe" label="mint set" />
        ) : (
          <StatusBadge kind="dry-run" label="mint unset" />
        )}
      </CardHeader>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Claimed SOL</dt>
          <dd className="font-mono text-zinc-100">
            {formatLamportsAsSol(claw?.claimedSolLamports ?? null)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Unclaimed SOL</dt>
          <dd className="font-mono text-zinc-100">
            {formatLamportsAsSol(claw?.unclaimedSolLamports ?? null)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Buyback share</dt>
          <dd className="font-mono text-zinc-100">
            {formatLamportsAsSol(claw?.buybackShareLamports ?? null)}
            <span className="ml-1 text-zinc-500">
              ({((claw?.buybackShareBps ?? 3000) / 100).toFixed(0)}%)
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">VIVACLAW_MINT</dt>
          <dd className="font-mono text-zinc-300">
            <Hint label={claw?.vivaclawMint || "VIVACLAW_MINT is not configured."}>
              <span>{shortenMint(claw?.vivaclawMint || null)}</span>
            </Hint>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Last buyback</dt>
          <dd className="text-right font-mono text-zinc-300">
            {buyback === "quoted-dry-run"
              ? "quoted (not broadcast)"
              : buyback === "error"
                ? "error"
                : "none this session"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
