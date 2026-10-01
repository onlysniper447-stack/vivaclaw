"use client";

import { useEffect, useState } from "react";
import { usePoolAction } from "@/components/console/usePoolAction";
import { EmptyState } from "@/components/ui/kit";
import { cleanText, formatAmount, formatPercentBps, formatSignedBps, freshnessLabel, utcStamp } from "@/lib/present";
import { earnedFromApr } from "@/lib/accrual";
import { venueLabel } from "@/lib/venues";
import type { DashboardPayload, PositionView } from "@/types/dashboard";

function liveEarned(row: PositionView, now: number): number {
  if (row.status !== "open") return 0;
  return earnedFromApr(row.principal, row.aprBps, now - row.accruedAt);
}

export function ExecutionBoard({ data }: { data: DashboardPayload }) {
  const quote = data.execution.lastQuote;
  const tx = data.execution.lastTx;
  const positions = data.execution.positions ?? [];
  const actions = data.execution.actions ?? [];
  const open = positions.filter((row) => row.status === "open");
  const closed = positions.filter((row) => row.status === "closed");
  const act = usePoolAction();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grid gap-16">
      <section>
        <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em]">Execution</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          ENTER on Venue yields simulates a deposit. Earned yield accrues from that pool&apos;s APR. CLAIM harvests it. WITHDRAW exits. Nothing is signed or sent.
        </p>
        {act.isError ? (
          <p className="mt-4 font-sans text-[16px] font-light text-[#EF4444]">
            {act.error instanceof Error ? act.error.message : "The action did not finish."}
          </p>
        ) : act.isSuccess && act.variables?.action === "claim" ? (
          <p className="mt-4 font-sans text-[16px] font-light text-[#34D399]">Claim recorded. Simulated.</p>
        ) : act.isSuccess && act.variables?.action === "withdraw" ? (
          <p className="mt-4 font-sans text-[16px] font-light text-[#34D399]">Withdraw recorded. Simulated.</p>
        ) : null}
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Claim</h2>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          One click claims earned yield from a pool. Withdraw returns the simulated size plus unclaimed yield.
        </p>
        {open.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No open pool"
              body="ENTER a lend or LP row on Venue yields. A simulated size is used (1 SOL or 1,000 stables)."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                  <th className="py-3 pr-4 font-medium">Pool</th>
                  <th className="py-3 pr-4 font-medium">Size</th>
                  <th className="py-3 pr-4 font-medium">Earned</th>
                  <th className="py-3 pr-4 font-medium">Est. / day</th>
                  <th className="py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {open.map((row) => {
                  const earned = liveEarned(row, now);
                  const claiming = act.isPending && act.variables?.action === "claim" && act.variables.positionId === row.id;
                  const exiting = act.isPending && act.variables?.action === "withdraw" && act.variables.positionId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-[#2B313B]">
                      <td className="py-4 pr-4">
                        <span className="block font-sans text-[16px] font-semibold">{cleanText(row.symbol)}</span>
                        <span className="font-sans text-[14px] font-light text-[#9CA3AF]">
                          {venueLabel(row.venue)} · {formatPercentBps(row.aprBps)} APR · {formatPercentBps(row.apyBps)} APY
                        </span>
                      </td>
                      <td className="num py-4 pr-4 font-mono text-[14px]">{formatAmount(row.principal, row.unit)}</td>
                      <td className="num py-4 pr-4 font-mono text-[14px]">{formatAmount(earned, row.unit)}</td>
                      <td className="num py-4 pr-4 font-mono text-[14px]">{formatAmount(row.daily, row.unit)}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            className="font-mono text-[12px] tracking-[0.08em] text-[#FFB81C] uppercase disabled:text-[#9CA3AF]"
                            disabled={earned <= 0 || claiming || exiting}
                            onClick={() => act.mutate({ action: "claim", positionId: row.id })}
                          >
                            {claiming ? "CLAIMING…" : "CLAIM"}
                          </button>
                          <button
                            type="button"
                            className="font-mono text-[12px] tracking-[0.08em] text-[#F5F5F5] uppercase disabled:text-[#9CA3AF]"
                            disabled={exiting || claiming}
                            onClick={() => act.mutate({ action: "withdraw", positionId: row.id })}
                          >
                            {exiting ? "EXITING…" : "WITHDRAW"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Triggers</h2>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          Every ENTER, CLAIM, and WITHDRAW lands here with the amount for that pool.
        </p>
        {actions.length === 0 && !quote && tx.status === "none" ? (
          <div className="mt-8">
            <EmptyState title="No trigger yet" body="ENTER a pool on Venue yields. The simulated action appears here." />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                  <th className="py-3 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                  <th className="py-3 pr-4 font-medium">Pool</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((row) => (
                  <tr key={row.id} className="border-b border-[#2B313B]">
                    <td className="num py-4 pr-4 font-mono text-[13px]" title={utcStamp(row.at)}>
                      {freshnessLabel(row.at)}
                    </td>
                    <td className="py-4 pr-4 font-mono text-[12px] tracking-[0.08em] uppercase">{row.kind}</td>
                    <td className="py-4 pr-4 font-sans text-[16px]">
                      {cleanText(row.symbol)}
                      <span className="mt-1 block font-sans text-[14px] font-light text-[#9CA3AF]">
                        {venueLabel(row.venue)} · {formatPercentBps(row.aprBps)} APR · {formatPercentBps(row.apyBps)} APY
                      </span>
                    </td>
                    <td className="num py-4 pr-4 font-mono text-[14px]">{formatAmount(row.amount, row.unit)}</td>
                    <td className="py-4 font-mono text-[12px] tracking-[0.08em] uppercase">Simulated</td>
                  </tr>
                ))}
                {quote || tx.status !== "none" ? (
                  <tr className="border-b border-[#2B313B]">
                    <td className="num py-4 pr-4 font-mono text-[13px]" title={utcStamp(quote?.at ?? tx.at)}>
                      {freshnessLabel(quote?.at ?? tx.at)}
                    </td>
                    <td className="py-4 pr-4 font-mono text-[12px] tracking-[0.08em] uppercase">Gap quote</td>
                    <td className="py-4 pr-4 font-sans text-[16px]">
                      {quote?.symbol ? cleanText(quote.symbol) : "—"}
                      <span className="mt-1 block font-sans text-[14px] font-light text-[#9CA3AF]">
                        {quote?.fromVenue && quote.toVenue ? `${quote.fromVenue} → ${quote.toVenue}` : "Jupiter quote"}
                      </span>
                    </td>
                    <td className="num py-4 pr-4 font-mono text-[14px]">
                      {quote ? formatSignedBps(quote.expectedGapBps) : "—"}
                    </td>
                    <td className="py-4 font-mono text-[12px] tracking-[0.08em] uppercase">
                      {tx.status === "error" ? "Quote failed" : "Simulated"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {tx.error ? (
              <p className="mt-4 font-sans text-[16px] font-light text-[#EF4444]">{cleanText(tx.error)}</p>
            ) : null}
          </div>
        )}
      </section>

      {closed.length > 0 ? (
        <section>
          <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Closed</h2>
          <ul className="mt-4 grid gap-3">
            {closed.map((row) => (
              <li key={row.id} className="font-sans text-[16px] font-light text-[#9CA3AF]">
                {cleanText(row.symbol)} · {venueLabel(row.venue)} · claimed {formatAmount(row.claimed, row.unit)}
                {row.exitAmount !== null ? ` · withdrew ${formatAmount(row.exitAmount, row.unit)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Fee share</h2>
        {data.clawpump.claimedSolLamports === null ? (
          <p className="mt-3 font-sans text-[16px] font-light text-[#9CA3AF]">
            ClawPump has not reported claimed fees in this process.
          </p>
        ) : (
          <p className="num mt-3 font-mono text-[14px]" title={utcStamp(data.clawpump.lastBuyback.at)}>
            Claimed {data.clawpump.claimedSolLamports} lamports · buyback share {data.clawpump.buybackShareBps} bps ·{" "}
            {freshnessLabel(data.clawpump.lastBuyback.at)}
          </p>
        )}
      </section>
    </div>
  );
}
