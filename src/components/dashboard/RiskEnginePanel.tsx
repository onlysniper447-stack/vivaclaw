"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Hint } from "./Hint";
import { formatBps } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DashboardPayload } from "@/types/dashboard";
import type { PegCheck } from "@/types/hettnet";

function PegMeter({ peg }: { peg: PegCheck }) {
  const signedBps = Math.round(((peg.price - peg.target) / peg.target) * 10_000);
  const span = Math.max(peg.maxDeviationBps, 1);
  const clamped = Math.max(-span * 2, Math.min(span * 2, signedBps));
  const leftPct = 50 + (clamped / (span * 2)) * 50;
  const bandPct = (span / (span * 2)) * 100;

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-white">
          {peg.symbol.replace("_", "/")}{" "}
          <span className="text-zinc-400">{peg.price.toFixed(4)}</span>
        </p>
        <StatusBadge kind={peg.healthy ? "safe" : "circuit-hold"} label={peg.healthy ? "pegged" : "de-peg"} />
      </div>
      <Hint label={`Deviation ${formatBps(peg.deviationBps)} vs ±${peg.maxDeviationBps} bps band around $1.00.`}>
        <div className="relative h-2 rounded-full bg-white/6">
          <div
            className="absolute inset-y-0 rounded-full bg-claw-safe/25"
            style={{ left: `${50 - bandPct / 2}%`, width: `${bandPct}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
          <div
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40",
              peg.healthy ? "bg-claw-safe" : "bg-claw-blood",
            )}
            style={{ left: `${leftPct}%` }}
          />
        </div>
      </Hint>
      <p className="mt-2 font-mono text-[11px] text-zinc-500">Δ {formatBps(peg.deviationBps)}</p>
    </div>
  );
}

export function RiskEnginePanel({ data }: { data: DashboardPayload | undefined }) {
  const risk = data?.risk ?? null;
  const hold = Boolean(risk?.circuitHold) || data?.engineStatus === "CIRCUIT_HOLD";
  const pegs = risk?.peg ?? [];
  const vols = risk?.volatility ?? [];

  return (
    <Card id="risk">
      <CardHeader>
        <div>
          <CardTitle>Risk engine</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">Pyth peg, confidence, and circuit state.</p>
        </div>
        {hold ? <StatusBadge kind="circuit-hold" /> : <StatusBadge kind="safe" label="clear" />}
      </CardHeader>

      <div
        className={cn(
          "mb-4 rounded-xl border px-3 py-2.5 text-sm",
          hold
            ? "border-claw-blood/30 bg-claw-blood/10 text-claw-blood"
            : "border-claw-safe/25 bg-claw-safe/8 text-claw-safe",
        )}
      >
        CIRCUIT_HOLD is {hold ? "active — execution blocked" : "inactive"}
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-white/8 px-3 py-2">
          <dt className="text-[11px] text-zinc-500">Status</dt>
          <dd className="font-mono">{risk?.status ?? data?.engineStatus ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-white/8 px-3 py-2">
          <dt className="text-[11px] text-zinc-500">Oracle stale</dt>
          <dd className="font-mono">{risk ? String(risk.oracleStale) : "—"}</dd>
        </div>
      </dl>

      <p className="mb-2 text-[11px] tracking-[0.16em] text-zinc-500 uppercase">USDC / USDT peg</p>
      {pegs.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No Pyth peg print in this process. Awaiting scan.</p>
      ) : (
        <div className="mb-4 grid gap-2">
          {pegs.map((peg) => (
            <PegMeter key={peg.symbol} peg={peg} />
          ))}
        </div>
      )}

      <p className="mb-2 text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
        Volatility / confidence
      </p>
      {vols.length === 0 ? (
        <p className="text-sm text-zinc-500">No volatility window yet.</p>
      ) : (
        <ul className="space-y-2">
          {vols.map((vol) => (
            <li
              key={vol.symbol}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm"
            >
              <span className="font-mono text-zinc-300">
                {vol.symbol.replace("_", "/")} · σ {formatBps(vol.realizedVolBps)} · conf{" "}
                {formatBps(vol.confidenceBps)}
              </span>
              <StatusBadge
                kind={vol.extreme ? "circuit-hold" : "safe"}
                label={vol.extreme ? "extreme" : "ok"}
              />
            </li>
          ))}
        </ul>
      )}

      {risk?.reasons.length ? (
        <ul className="mt-4 space-y-1 text-xs text-claw-blood">
          {risk.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
