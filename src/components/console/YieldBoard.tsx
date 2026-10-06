"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntryPlanPanel } from "@/components/console/EntryPlan";
import { Drawer, EmptyState, Field, Segmented, Sparkline, Stat, StatusDot } from "@/components/ui/kit";
import { cleanText, downloadCsv, formatPercentBps, formatSignedBps, freshnessLabel, indicationTone, statusText, utcStamp } from "@/lib/present";
import { venueLabel } from "@/lib/venues";
import type { DashboardPayload, VenueYieldRow, YieldMonitorRow } from "@/types/dashboard";
import type { VenueFamily } from "@/types/hettnet";
import { canEnterYield, planColumnAction } from "@/lib/yield-plan";
import type { Indication } from "hettnet-core";

const INDICATION_ORDER: Record<Indication, number> = { ENTER: 0, WATCH: 1, AVOID: 2 };

const PAGE = 25;

const COVERAGE =
  "HyperCore native lend, HyperLend, Felix/Morpho vaults, HyperSwap, Kittenswap, and Project X. Missing numbers stay unavailable.";

const RATE_COPY =
  "APY is the venue print. APR is shown only when the venue publishes a simple rate — it is never invented from APY.";

function bestBy(rows: VenueYieldRow[], key: "aprBps" | "apyBps"): VenueYieldRow | null {
  return rows.reduce<VenueYieldRow | null>((best, row) => {
    const value = row[key];
    if (value === null) return best;
    if (!best || value > (best[key] ?? -1)) return row;
    return best;
  }, null);
}

function RateCell({ bps, quality }: { bps: number | null; quality: VenueYieldRow["quality"] }) {
  if (quality === "suspect" || bps === 0) {
    return (
      <span className="font-sans text-[16px] font-light text-[#9CA3AF] italic">Check data</span>
    );
  }
  if (quality === "missing" || bps === null) {
    return (
      <span className="font-sans text-[16px] font-light text-[#9CA3AF] italic">
        {quality === "ok" || bps === null ? "unavailable" : "no pool"}
      </span>
    );
  }
  return <>{formatPercentBps(bps)}</>;
}

export function YieldBoard({ data }: { data: DashboardPayload }) {
  const [venue, setVenue] = useState<"all" | VenueFamily>("all");
  const [indication, setIndication] = useState<"all" | Indication>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"signal" | "apy" | "asset">("signal");
  const [open, setOpen] = useState<VenueYieldRow | null>(null);
  const [gapPage, setGapPage] = useState(1);
  const trigger = (data.yields.triggerBps / 100).toFixed(1);
  const openPools = new Set(
    (data.execution.positions ?? []).filter((row) => row.status === "open").map((row) => row.poolId),
  );
  const kinkAlerts = data.alerts.filter((row) => row.kind === "kink-proximity");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.yields.venues
      .filter((row) => (venue === "all" ? true : row.family === venue))
      .filter((row) => (indication === "all" ? true : row.indication === indication))
      .filter((row) => (q ? `${row.symbol} ${row.mint}`.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (sort === "asset") return a.symbol.localeCompare(b.symbol);
        if (sort === "apy") return (b.apyBps ?? -1) - (a.apyBps ?? -1);
        const d = INDICATION_ORDER[a.indication] - INDICATION_ORDER[b.indication];
        if (d !== 0) return d;
        return (b.apyBps ?? -1) - (a.apyBps ?? -1);
      });
  }, [data.yields.venues, indication, query, sort, venue]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  const gaps = data.yields.rows.filter((row) => row.observed);
  const gapPages = Math.max(1, Math.ceil(gaps.length / PAGE));
  const safeGap = Math.min(gapPage, gapPages);
  const gapSlice = gaps.slice((safeGap - 1) * PAGE, safeGap * PAGE);
  const bestApy = bestBy(filtered, "apyBps");

  function exportVenues() {
    downloadCsv("hettnet-venue-yields.csv", [
      ["asset", "mint", "venue", "apr", "apy", "indication", "reasons", "quality", "source", "updated"],
      ...slice.map((row) => [
        cleanText(row.symbol),
        row.mint,
        venueLabel(row.venue),
        row.aprBps === null ? "" : (row.aprBps / 100).toFixed(2),
        row.apyBps === null ? "" : (row.apyBps / 100).toFixed(2),
        row.indication,
        row.reasons.join(" | "),
        row.quality,
        row.source,
        row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
      ]),
    ]);
  }

  if (!data.yields.rows.some((row) => row.observed) && data.yields.venues.length === 0) {
    return (
      <div>
        <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Venue yields</h1>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          One row is one venue with an ENTER, WATCH, or AVOID indication. {data.disclaimer}
        </p>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          {RATE_COPY} {COVERAGE}
        </p>
        <div className="mt-8">
          <EmptyState
            title="No venue yields yet"
            body={
              data.lastScanAt
                ? data.engine.reason ??
                  "The last check did not return a lend print or a high-return LP."
                : "A check reads HyperCore lend, HyperLend, Felix/Morpho, HyperSwap, Kittenswap, and Project X. Missing rates stay unavailable."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-16">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Venue yields</h1>
            <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
              One row is one venue with an ENTER, WATCH, or AVOID indication and reasons. ENTER opens an entry plan. Claim or withdraw on Execution.
            </p>
          </div>
          <p className="num font-mono text-[12px] text-[#9CA3AF]">{filtered.length} rates</p>
        </div>
        <div className="mt-8 grid border border-[#2B313B] sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="ENTER"
            value={String(data.yields.enterCount)}
            source="Indication"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="WATCH"
            value={String(data.yields.watchCount)}
            source="Indication"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="AVOID"
            value={String(data.yields.avoidCount)}
            source="Indication"
            time={freshnessLabel(data.lastScanAt)}
          />
          <Stat
            label="Best APY"
            value={bestApy ? formatPercentBps(bestApy.apyBps) : "—"}
            source={bestApy ? `${venueLabel(bestApy.venue)} ${cleanText(bestApy.symbol)}` : "Daily compound"}
            time={freshnessLabel(bestApy?.updatedAt ?? data.lastScanAt)}
          />
        </div>
        <p className="mt-4 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          {data.disclaimer} {RATE_COPY} {COVERAGE}
        </p>
        {kinkAlerts.length > 0 ? (
          <p className="mt-4 border-l-2 border-[#FFB81C] pl-4 font-sans text-[16px] font-light text-[#F5F5F5]">
            Kink-proximity: {kinkAlerts.map((row) => cleanText(row.symbol)).join(", ")}. Borrow APY steps up above 80% utilization.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented
            label="Venue"
            value={venue}
            onChange={(next) => {
              setVenue(next);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "lend", label: "Lend" },
              { value: "lp", label: "LP" },
            ]}
          />
          <Field
            aria-label="Search assets"
            placeholder="Search asset or mint"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="w-full max-w-full sm:max-w-xs"
          />
          <Segmented
            label="Indication"
            value={indication}
            onChange={(next) => {
              setIndication(next);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "ENTER", label: "ENTER" },
              { value: "WATCH", label: "WATCH" },
              { value: "AVOID", label: "AVOID" },
            ]}
          />
          <button
            type="button"
            className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase"
            onClick={() => setSort(sort === "signal" ? "apy" : sort === "apy" ? "asset" : "signal")}
          >
            Sort {sort === "signal" ? "by indication" : sort === "apy" ? "by APY" : "by asset"}
          </button>
          <Button variant="link" onClick={exportVenues}>Export visible rows</Button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                <th className="py-3 pr-4 font-medium">Asset</th>
                <th className="py-3 pr-4 font-medium">Venue</th>
                <th className="py-3 pr-4 font-medium">APR</th>
                <th className="py-3 pr-4 font-medium">APY</th>
                <th className="py-3 pr-4 font-medium">Indication</th>
                <th className="py-3 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 font-sans text-[16px] font-light text-[#9CA3AF]">
                    Nothing matches that search.
                  </td>
                </tr>
              ) : (
                slice.map((row) => (
                  <tr key={row.id} className="border-b border-[#2B313B]">
                    <td className="py-4 pr-4">
                      <button type="button" className="text-left" onClick={() => setOpen(row)}>
                        <span className="block font-sans text-[16px] font-semibold">{cleanText(row.symbol)}</span>
                        <span className="num font-mono text-[12px] text-[#9CA3AF]">{row.mint.slice(0, 4)}…{row.mint.slice(-4)}</span>
                      </button>
                    </td>
                    <td className="py-4 pr-4 font-sans text-[16px]">{venueLabel(row.venue)}</td>
                    <td className="num py-4 pr-4 font-mono text-[14px]" title={utcStamp(row.updatedAt)}>
                      <RateCell bps={row.aprBps} quality={row.quality} />
                    </td>
                    <td className="num py-4 pr-4 font-mono text-[14px]" title={utcStamp(row.updatedAt)}>
                      <RateCell bps={row.apyBps} quality={row.quality} />
                    </td>
                    <td className="py-4 pr-4">
                      <StatusDot tone={indicationTone(row.indication)} label={row.indication} />
                    </td>
                    <td className="py-4">
                      <EnterButton
                        row={row}
                        alreadyOpen={openPools.has(row.id)}
                        onEnter={() => setOpen(row)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager page={safePage} pages={pages} onPage={setPage} />
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Cross-venue gaps</h2>
        <p className="mt-2 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          A gap is HyperEVM lend minus HyperCore for the same token. It is a spread, not an investable yield. HyperCore USDC and Circle USDC stay separate. The trigger is {trigger}% and is set in server config.
        </p>
        <div className="mt-4">
          <Button
            variant="link"
            onClick={() =>
              downloadCsv("hettnet-gaps.csv", [
                ["asset", "mint", "gap_percent", "status", "updated"],
                ...gapSlice.map((row) => [
                  cleanText(row.symbol),
                  row.mint,
                  row.deltaApyBps === null ? "" : (row.deltaApyBps / 100).toFixed(2),
                  statusText(row.status),
                  row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
                ]),
              ])
            }
          >
            Export visible rows
          </Button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                <th className="py-3 pr-4 font-medium">Asset</th>
                <th className="py-3 pr-4 font-medium">Gap</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {gapSlice.map((row) => (
                <GapLine key={row.mint} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={safeGap} pages={gapPages} onPage={setGapPage} />
      </section>

      <Drawer
        open={open !== null}
        title={open ? `${cleanText(open.symbol)} · ${open.indication}` : "Entry plan"}
        onClose={() => setOpen(null)}
      >
        {open ? (
          <VenueDetail row={open} feeLabel={`${open.feeBps} bps fee assumption`} alreadyOpen={openPools.has(open.id)} />
        ) : null}
      </Drawer>
    </div>
  );
}

function GapLine({ row }: { row: YieldMonitorRow }) {
  return (
    <tr className="border-b border-[#2B313B]">
      <td className="py-4 pr-4 font-sans text-[16px]">{cleanText(row.symbol)}</td>
      <td className="num py-4 pr-4 font-mono text-[14px]">{formatSignedBps(row.deltaApyBps)}</td>
      <td className="py-4">
        <StatusDot
          tone={row.status === "above" ? "attention" : row.status === "suspect" || row.status === "error" ? "bad" : "idle"}
          label={statusText(row.status)}
        />
      </td>
    </tr>
  );
}

function EnterButton({
  row,
  alreadyOpen,
  onEnter,
}: {
  row: VenueYieldRow;
  alreadyOpen: boolean;
  onEnter: () => void;
}) {
  const action = planColumnAction(row, alreadyOpen);
  if (action === "open") {
    return (
      <Button variant="link" asChild>
        <a href="/dashboard?tab=execution">OPEN</a>
      </Button>
    );
  }
  if (action === "none") {
    return <span className="font-mono text-[12px] text-[#9CA3AF]">—</span>;
  }
  return (
    <button
      type="button"
      className="font-mono text-[12px] tracking-[0.08em] text-[#FFB81C] uppercase disabled:text-[#9CA3AF]"
      disabled={!canEnterYield(row)}
      onClick={onEnter}
    >
      ENTER
    </button>
  );
}

function VenueDetail({
  row,
  feeLabel,
  alreadyOpen,
}: {
  row: VenueYieldRow;
  feeLabel: string;
  alreadyOpen: boolean;
}) {
  const net = row.grossApyBps === null ? null : row.grossApyBps - row.feeBps;
  const showPlan = planColumnAction(row, false) !== "none";
  return (
    <div className="grid gap-5 font-sans text-[16px] font-light">
      <p>{venueLabel(row.venue)}</p>
      <Sparkline points={row.history.map((point) => point.bps)} label={`${row.symbol} recent scans`} />
      <p>APR {row.aprBps === null ? "not a usable print" : formatPercentBps(row.aprBps)} · simple annualized</p>
      <p>APY {row.apyBps === null ? "not a usable print" : formatPercentBps(row.apyBps)} · daily compound</p>
      <p>Gross APY {row.grossApyBps === null ? "not a usable print" : formatPercentBps(row.grossApyBps)}</p>
      <p>Net after {feeLabel}: {net === null ? "not calculated" : formatPercentBps(net)}</p>
      <p>Impact: {row.quoted && row.priceImpactBps !== null ? formatPercentBps(row.priceImpactBps) : "Not quoted"}</p>
      <p>Source: {cleanText(row.source)}</p>
      <p title={utcStamp(row.updatedAt)}>{freshnessLabel(row.updatedAt)} · {utcStamp(row.updatedAt)}</p>
      <p>
        <StatusDot tone={indicationTone(row.indication)} label={row.indication} />
      </p>
      <ul className="space-y-2">
        {row.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {row.unusualReason ? <p className="text-[#FFB81C]">{row.unusualReason}</p> : null}
      {showPlan ? (
        <div className="border-t border-[#2B313B] pt-5">
          <p className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Entry plan</p>
          <div className="mt-4">
            <EntryPlanPanel poolId={row.id} canSimulate={canEnterYield(row)} alreadyOpen={alreadyOpen} />
          </div>
        </div>
      ) : (
        <p className="text-[#9CA3AF]">AVOID — no entry plan. Mainnet send is off.</p>
      )}
    </div>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return (
    <div className="mt-4 flex items-center gap-4 font-mono text-[12px] text-[#9CA3AF]">
      <button type="button" className="uppercase tracking-[0.08em]" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="num">
        {page} / {pages}
      </span>
      <button type="button" className="uppercase tracking-[0.08em]" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
