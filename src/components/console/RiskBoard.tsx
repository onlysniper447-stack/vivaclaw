"use client";

import { Card } from "@/components/ui/card";
import { EmptyState, StatusDot } from "@/components/ui/kit";
import { cleanText, freshnessLabel, indicationTone, riskVerdict, utcStamp } from "@/lib/present";
import { venueLabel } from "@/lib/venues";
import type { DashboardPayload } from "@/types/dashboard";

export function RiskBoard({ data }: { data: DashboardPayload }) {
  const verdict = riskVerdict(data);
  const kink = data.alerts.filter((row) => row.kind === "kink-proximity");
  const paused = data.alerts.filter((row) => row.kind === "paused");
  const outliers = data.alerts.filter((row) => row.kind === "apy-outlier");
  const avoids = data.yields.venues.filter((row) => row.indication === "AVOID").slice(0, 12);
  const watches = data.yields.venues.filter((row) => row.alerts.includes("kink-proximity"));

  if (data.yields.venues.length === 0 && data.alerts.length === 0) {
    return (
      <div>
        <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em] md:text-[52px]">Risk</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">{data.disclaimer}</p>
        <div className="mt-8">
          <EmptyState
            title="No risk print yet"
            body="A check scores HyperCore utilization, paused reserves, outlier APYs, and IL class. Missing numbers stay unavailable."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em] md:text-[52px]">Risk: {verdict.word}</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">{verdict.reason}</p>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">{data.disclaimer}</p>
        <p className="num mt-2 font-mono text-[12px] text-[#9CA3AF]" title={utcStamp(data.lastScanAt)}>
          Signals · {freshnessLabel(data.lastScanAt)}
        </p>
      </div>

      <section className="grid gap-4">
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Kink-proximity</h2>
        <p className="font-sans text-[16px] font-light text-[#9CA3AF]">
          HyperCore stablecoin borrow APY stays at 5% until 80% utilization, then steps up. A print inside 5pp of that kink is WATCH.
        </p>
        {kink.length === 0 && watches.length === 0 ? (
          <p className="font-sans text-[16px] font-light text-[#9CA3AF]">No reserve is inside the 5pp kink band on this scan.</p>
        ) : (
          (kink.length > 0
            ? kink.map((row) => ({ id: row.opportunityId, symbol: row.symbol, message: row.message }))
            : watches.map((row) => ({
                id: row.id,
                symbol: row.symbol,
                message: row.unusualReason ?? row.reasons[0] ?? "Utilization is near the 80% kink.",
              }))
          ).map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-[22px] font-semibold tracking-[-0.02em]">{cleanText(row.symbol)}</p>
                  <p className="mt-2 font-sans text-[16px] font-light text-[#9CA3AF]">{cleanText(row.message)}</p>
                </div>
                <StatusDot tone="attention" label="WATCH" />
              </div>
            </Card>
          ))
        )}
      </section>

      <section>
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Alerts</h2>
        <ul className="mt-3 divide-y divide-[#2B313B]">
          {paused.length === 0 && outliers.length === 0 && kink.length === 0 ? (
            <li className="py-3 font-sans text-[16px] font-light text-[#9CA3AF]">No pause or outlier alerts on this scan.</li>
          ) : (
            [...paused, ...outliers, ...kink].map((row) => (
              <li key={`${row.kind}:${row.opportunityId}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-sans text-[16px]">{cleanText(row.symbol)}</p>
                  <p className="font-sans text-[14px] font-light text-[#9CA3AF]">{cleanText(row.message)}</p>
                </div>
                <StatusDot tone={row.kind === "kink-proximity" ? "attention" : "bad"} label={row.kind.replaceAll("-", " ")} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">AVOID</h2>
        <p className="mt-2 font-sans text-[16px] font-light text-[#9CA3AF]">
          AVOID rows stay off the simulate path. Indications are informational, not financial advice.
        </p>
        {avoids.length === 0 ? (
          <p className="mt-3 font-sans text-[16px] font-light text-[#9CA3AF]">No AVOID indications on this scan.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#2B313B]">
            {avoids.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <p className="font-sans text-[16px]">{cleanText(row.symbol)}</p>
                  <p className="font-sans text-[14px] font-light text-[#9CA3AF]">
                    {venueLabel(row.venue)} · {row.reasons[0] ?? "AVOID"}
                  </p>
                </div>
                <StatusDot tone={indicationTone(row.indication)} label={row.indication} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
