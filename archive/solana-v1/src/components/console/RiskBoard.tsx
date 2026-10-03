"use client";

import { Card } from "@/components/ui/card";
import { EmptyState, StatusDot } from "@/components/ui/kit";
import { cleanText, freshnessLabel, oracleAgeSeconds, pegReading, riskVerdict, utcStamp } from "@/lib/present";
import type { DashboardPayload } from "@/types/dashboard";

export function RiskBoard({ data }: { data: DashboardPayload }) {
  const risk = data.risk;
  if (!risk) {
    return (
      <div>
        <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em] md:text-[52px]">Risk</h1>
        <div className="mt-8">
          <EmptyState
            title="No risk print yet"
            body="Pyth has not been read in this process. Run a check. If Hermes is unreachable, the next attempt reports that failure instead of a clear verdict."
          />
        </div>
      </div>
    );
  }

  const verdict = riskVerdict(data);
  const word = verdict.word;
  const reason = verdict.reason;

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em] md:text-[52px]">Risk: {word}</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">{reason}</p>
        <p className="num mt-2 font-mono text-[12px] text-[#9CA3AF]" title={utcStamp(risk.evaluatedAt)}>
          Pyth · {freshnessLabel(risk.evaluatedAt)}
        </p>
      </div>

      <section className="grid gap-4">
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Pegs</h2>
        <p className="font-sans text-[16px] font-light text-[#9CA3AF]">
          Latest print only. This process does not keep a peg history, so there is no sparkline.
        </p>
        {risk.peg.length === 0 ? (
          <p className="font-sans text-[16px] font-light text-[#9CA3AF]">No peg was returned.</p>
        ) : (
          risk.peg.map((peg) => (
            <Card key={peg.symbol}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-[22px] font-semibold tracking-[-0.02em]">{cleanText(peg.symbol.replaceAll("_", "/"))}</p>
                  <p className="num mt-2 font-mono text-[14px]" title={utcStamp(peg.publishTime * 1000)}>
                    {peg.price.toFixed(4)} · {peg.deviationBps} bps vs ±{peg.maxDeviationBps} bps
                  </p>
                </div>
                <StatusDot {...pegReading(peg.healthy, oracleAgeSeconds(data.generatedAt, peg.publishTime), risk.thresholds.oracleMaxAgeSec)} />
              </div>
              <p className="mt-4 font-sans text-[14px] font-light text-[#9CA3AF]">
                Oracle age {oracleAgeSeconds(data.generatedAt, peg.publishTime)}s · judged against {risk.thresholds.oracleMaxAgeSec}s · confidence {peg.confidenceBps} bps · band ±{peg.maxDeviationBps} bps
              </p>

            </Card>
          ))
        )}
      </section>

      <section>
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Volatility</h2>
        <ul className="mt-3 divide-y divide-[#2B313B]">
          {risk.volatility.length === 0 ? (
            <li className="py-3 font-sans text-[16px] font-light text-[#9CA3AF]">No volatility window yet.</li>
          ) : (
            risk.volatility.map((vol) => (
              <li key={vol.symbol} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-sans text-[16px]">{cleanText(vol.symbol)}</p>
                  <p className="num font-mono text-[12px] text-[#9CA3AF]">
                    Realized {vol.realizedVolBps} bps · EMA deviation {vol.emaDeviationBps} bps · confidence {vol.confidenceBps} bps · judged against {vol.maxVolBps} bps volatility and {vol.maxConfBps} bps confidence
                  </p>
                </div>
                <StatusDot tone={vol.extreme ? "bad" : "ok"} label={vol.extreme ? "Outside band" : "Inside band"} />
              </li>
            ))
          )}
        </ul>
      </section>

      <Card>
        <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Circuit hold</h2>
        <p className="mt-3 font-sans text-[22px] font-semibold">{risk.circuitHold ? "Holding" : "Not holding"}</p>
        <p className="mt-2 font-sans text-[16px] font-light text-[#9CA3AF]">
          A hold starts when a stablecoin peg, oracle age, or volatility print crosses its configured threshold. It blocks the dry-run quote path.
        </p>
        <p className="num mt-3 font-mono text-[12px] text-[#9CA3AF]" title={utcStamp(risk.holdChangedAt)}>
          Last change {freshnessLabel(risk.holdChangedAt)}
        </p>
        {risk.reasons.length ? (
          <ul className="mt-4 space-y-2 font-sans text-[16px] font-light">
            {risk.reasons.map((reason) => (
              <li key={reason}>{cleanText(reason)}</li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
