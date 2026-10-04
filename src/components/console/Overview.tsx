"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Bar, EmptyState, SortButton, Stat, StatusDot } from "@/components/ui/kit";
import { cleanText, formatPercentBps, formatSignedBps, freshnessLabel, indicationTone, riskVerdict, shortenMint, statusText, utcStamp } from "@/lib/present";
import type { DashboardPayload, YieldMonitorRow } from "@/types/dashboard";

type Key = "asset" | "hyperevm" | "hypercore" | "gap" | "status";

const PAGE = 25;

export function Overview({ data }: { data: DashboardPayload }) {
  const [sort, setSort] = useState<{ key: Key; dir: "asc" | "desc" }>({ key: "gap", dir: "desc" });
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const trigger = (data.yields.triggerBps / 100).toFixed(1);
  const observed = data.yields.rows.some((row) => row.observed);
  const above = data.yields.rows.filter((row) => row.observed && row.status === "above");
  const kink = data.alerts.filter((row) => row.kind === "kink-proximity");
  const kinkNames = [...new Set(kink.map((row) => cleanText(row.symbol)))];
  const enterCount = data.yields.enterCount;
  const headline =
    data.yields.venues.length === 0
      ? data.lastScanAt
        ? data.engine.reason ?? "The last check did not return a lend or LP print."
        : "No rates have been checked yet."
      : kinkNames.length > 0
        ? `Kink-proximity on ${kinkNames.join(", ").replace(/, ([^,]*)$/, " and $1")}. ${enterCount} ENTER ${enterCount === 1 ? "indication" : "indications"}.`
        : `${enterCount} ENTER ${enterCount === 1 ? "indication" : "indications"} across HyperCore and HyperEVM.`;
  const unusual =
    kink[0] ??
    data.alerts[0] ??
    data.yields.venues.find((row) => row.unusual && row.unusualReason);

  const rows = useMemo(() => {
    const copy = [...data.yields.rows];
    const dir = sort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av === null && bv === null) return a.symbol.localeCompare(b.symbol);
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return copy;
  }, [data.yields.rows, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages);
  const slice = rows.slice((safePage - 1) * PAGE, safePage * PAGE);
  const maxGap = Math.max(...above.map((row) => Math.abs(row.deltaApyBps ?? 0)), 1);
  const rated = data.yields.venues.filter((row) => row.apyBps !== null).length;
  const risk = riskVerdict(data);

  function toggle(key: Key) {
    setPage(1);
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="max-w-3xl break-words font-sans text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[38px] sm:leading-[1.05] md:text-[52px]">
          {headline}
        </h1>
        <p className="mt-4 max-w-xl font-sans text-[16px] leading-relaxed font-light text-[#9CA3AF]">
          {data.disclaimer} Dry run is on. Nothing on this page is signed or sent.
        </p>
        {unusual ? (
          <p className="mt-4 border-l-2 border-[#FFB81C] pl-4 font-sans text-[16px] font-light text-[#F5F5F5]">
            {"message" in unusual ? unusual.message : unusual.unusualReason}
          </p>
        ) : null}

        <div className="mt-8 grid border border-[#2B313B] sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="ENTER"
            value={data.yields.venues.length > 0 ? String(data.yields.enterCount) : "—"}
            source="Indication"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="WATCH"
            value={data.yields.venues.length > 0 ? String(data.yields.watchCount) : "—"}
            source="Indication"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="Risk"
            value={risk.word}
            source="Signals"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="Rates tracked"
            value={rated > 0 ? String(rated) : "—"}
            source="Lend and LP"
            time={freshnessLabel(data.lastScanAt)}
          />
        </div>

        {!observed ? (
          <div className="mt-8">
            <EmptyState
              title={data.lastScanAt ? "No comparable rates in the last check" : "No gap table yet"}
              body={
                data.lastScanAt
                  ? data.engine.reason ??
                    "HyperCore and HyperEVM lending did not return a usable pair. Missing rates stay blank."
                  : "Run a check. Missing venues stay blank. A missing rate is never turned into a number."
              }
            />
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <caption className="sr-only">Cross-venue gaps, HyperEVM lend minus HyperCore</caption>
              <thead>
                <tr className="border-b border-[#2B313B]">
                  <th className="py-3 pr-4" aria-sort={sort.key === "asset" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}><SortButton label="Asset" active={sort.key === "asset"} direction={sort.dir} onClick={() => toggle("asset")} /></th>
                  <th className="py-3 pr-4" aria-sort={sort.key === "hyperevm" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}><SortButton label="HyperEVM" active={sort.key === "hyperevm"} direction={sort.dir} onClick={() => toggle("hyperevm")} /></th>
                  <th className="py-3 pr-4" aria-sort={sort.key === "hypercore" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}><SortButton label="HyperCore" active={sort.key === "hypercore"} direction={sort.dir} onClick={() => toggle("hypercore")} /></th>
                  <th className="py-3 pr-4" aria-sort={sort.key === "gap" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}><SortButton label="Gap" active={sort.key === "gap"} direction={sort.dir} onClick={() => toggle("gap")} /></th>
                  <th className="py-3" aria-sort={sort.key === "status" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}><SortButton label="Status" active={sort.key === "status"} direction={sort.dir} onClick={() => toggle("status")} /></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const expanded = open === row.mint;
                  return (
                    <tr key={row.mint} className="border-b border-[#2B313B] align-top">
                      <td className="py-4 pr-4" colSpan={expanded ? 5 : 1}>
                        {expanded ? (
                          <Expanded row={row} onClose={() => setOpen(null)} />
                        ) : (
                          <button type="button" className="text-left" onClick={() => setOpen(row.mint)} aria-expanded={false}>
                            <span className="block font-sans text-[16px] font-semibold">{cleanText(row.symbol)}</span>
                            <span className="num font-mono text-[12px] text-[#9CA3AF]">{shortenMint(row.mint)}</span>
                          </button>
                        )}
                      </td>
                      {expanded ? null : (
                        <>
                          <td className="num py-4 pr-4 font-mono text-[14px]">{rateCell(row.hyperevmApyBps, row.status)}</td>
                          <td className="num py-4 pr-4 font-mono text-[14px]">{rateCell(row.hypercoreApyBps, row.status)}</td>
                          <td className="py-4 pr-4">
                            <span className="num font-mono text-[14px]">{row.deltaApyBps === null ? "Not comparable" : formatSignedBps(row.deltaApyBps)}</span>
                            {row.status === "above" && row.deltaApyBps !== null ? <Bar value={row.deltaApyBps} max={maxGap} /> : null}
                          </td>
                          <td className="py-4">
                            <StatusDot
                              tone={row.status === "above" ? "attention" : row.status === "suspect" || row.status === "error" ? "bad" : "idle"}
                              label={statusText(row.status)}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-center gap-4 font-mono text-[12px] text-[#9CA3AF]">
              <button type="button" className="min-h-10 uppercase tracking-[0.08em]" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </button>
              <span className="num">
                {safePage} / {pages} · {rows.length} assets
              </span>
              <button type="button" className="min-h-10 uppercase tracking-[0.08em]" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <aside className="grid gap-6">
        <Card>
          <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Risk</h2>
          <p className="mt-3 font-sans text-[22px] font-semibold tracking-[-0.02em]">{risk.word}</p>
          <p className="mt-2 font-sans text-[16px] font-light text-[#9CA3AF]">{risk.reason}</p>
          <ul className="mt-5 divide-y divide-[#2B313B]">
            {data.alerts.slice(0, 6).map((alert) => (
              <li key={`${alert.kind}:${alert.opportunityId}`} className="flex items-center justify-between gap-3 py-3">
                <span className="font-sans text-[16px]">{cleanText(alert.symbol)}</span>
                <StatusDot
                  tone={alert.kind === "kink-proximity" ? "attention" : "bad"}
                  label={alert.kind.replaceAll("-", " ")}
                />
              </li>
            ))}
            {data.yields.venues
              .filter((row) => row.indication === "ENTER")
              .slice(0, 3)
              .map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="font-sans text-[16px]">{cleanText(row.symbol)}</span>
                  <StatusDot tone={indicationTone(row.indication)} label={row.indication} />
                </li>
              ))}
            {data.alerts.length === 0 && data.yields.enterCount === 0 ? (
              <li className="py-3 font-sans text-[16px] font-light text-[#9CA3AF]">No kink-proximity or pause alerts on this scan.</li>
            ) : null}
          </ul>
        </Card>
        <Card>
          <h2 className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Connections</h2>
          <ul className="mt-4 space-y-4">
            <Connection name={data.probes.rpc.name} probe={data.probes.rpc} />
            <Connection name={data.probes.hyperevm.name} probe={data.probes.hyperevm} />
            <Connection name={data.probes.engine.name} probe={data.probes.engine} />
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function Connection({
  name,
  probe,
}: {
  name: string;
  probe: DashboardPayload["probes"]["rpc"];
}) {
  const tone = !probe.ok ? "bad" : probe.latencyMs === null ? "idle" : probe.latencyMs < 600 ? "ok" : probe.latencyMs <= 1500 ? "slow" : "bad";
  const label = !probe.ok ? "Failed" : probe.latencyMs === null ? "No sample" : `${probe.latencyMs} ms`;
  return (
    <li className="flex items-start justify-between gap-3">
      <div>
        <p className="font-sans text-[16px]">{name}</p>
        <p className="font-sans text-[14px] font-light text-[#9CA3AF]">{cleanText(probe.detail)}</p>
      </div>
      <StatusDot tone={tone} label={label} />
    </li>
  );
}

function Expanded({ row, onClose }: { row: YieldMonitorRow; onClose: () => void }) {
  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[16px] font-semibold">{cleanText(row.symbol)}</p>
          <p className="num font-mono text-[12px] text-[#9CA3AF]">{row.mint}</p>
        </div>
        <button type="button" className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="mt-4 grid gap-2 font-mono text-[13px] text-[#9CA3AF]">
        <div>HyperEVM raw: {row.hyperevmApyBps === null ? "no pool" : `${row.hyperevmApyBps} bps`}</div>
        <div>HyperCore raw: {row.hypercoreApyBps === null ? "no pool" : `${row.hypercoreApyBps} bps`}</div>
        <div>Gap raw: {row.deltaApyBps === null ? "not comparable" : `${row.deltaApyBps} bps`}</div>
        <div>Source: {cleanText(row.source)}</div>
        <div title={utcStamp(row.updatedAt)}>Read: {freshnessLabel(row.updatedAt)} · {utcStamp(row.updatedAt)}</div>
        {row.reason ? <div>{cleanText(row.reason)}</div> : null}
        {row.unusualReason ? <div className="text-[#FFB81C]">{row.unusualReason}</div> : null}
      </dl>
    </div>
  );
}

function rateCell(bps: number | null, status: YieldMonitorRow["status"]): ReactNode {
  if (bps === null) {
    return <span className="font-sans text-[16px] font-light text-[#9CA3AF] italic">no pool</span>;
  }
  if (bps === 0 || status === "error") return "Check data";
  return formatPercentBps(bps);
}

function sortValue(row: YieldMonitorRow, key: Key): string | number | null {
  if (key === "asset") return row.symbol;
  if (key === "status") return row.status;
  if (key === "hyperevm") return row.hyperevmApyBps;
  if (key === "hypercore") return row.hypercoreApyBps;
  return row.deltaApyBps === null ? null : Math.abs(row.deltaApyBps);
}
