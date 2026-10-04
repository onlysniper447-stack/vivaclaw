"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, Field } from "@/components/ui/kit";
import { cleanText, downloadCsv, localStamp, utcStamp } from "@/lib/present";
import type { DashboardPayload } from "@/types/dashboard";

const PAGE = 25;

export function ActivityBoard({ data }: { data: DashboardPayload }) {
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const types = useMemo(() => ["all", ...new Set(data.logs.map((log) => log.level))], [data.logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.logs]
      .reverse()
      .filter((log) => (type === "all" ? true : log.level === type))
      .filter((log) => (q ? `${log.message} ${log.status}`.toLowerCase().includes(q) : true));
  }, [data.logs, query, type]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safe = Math.min(page, pages);
  const slice = filtered.slice((safe - 1) * PAGE, safe * PAGE);

  if (data.logs.length === 0) {
    return (
      <div>
        <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Activity</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          A running log of rates, risk, and simulated actions.
        </p>
        <div className="mt-8">
          <EmptyState
            title="Nothing here yet"
            body="Entries appear as the console reads rates, risk, and simulated actions."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Activity</h1>
          <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
            A running log of rates, risk, and simulated actions.
          </p>
        </div>
        <Button
          variant="link"
          onClick={() =>
            downloadCsv("hettnet-activity.csv", [
              ["time_utc", "level", "status", "message"],
              ...slice.map((log) => [new Date(log.ts).toISOString(), log.level, log.status, cleanText(log.message)]),
            ])
          }
        >
          Export visible rows
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
          Type
          <select
            className="mt-2 block h-12 rounded-[2px] border border-[#2B313B] bg-[#141414] px-3 font-sans text-[16px] font-light text-[#F5F5F5]"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            {types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <Field
          aria-label="Search the log"
          placeholder="Search message"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
              <th className="py-3 pr-4 font-medium">Time</th>
              <th className="py-3 pr-4 font-medium">Type</th>
              <th className="py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 font-sans text-[16px] font-light text-[#9CA3AF]">
                  Nothing matches that search.
                </td>
              </tr>
            ) : null}
            {slice.map((log, index) => (
              <tr key={`${log.ts}-${index}`} className="border-b border-[#2B313B]">
                <td className="num py-4 pr-4 font-mono text-[13px]" title={utcStamp(log.ts)}>
                  {localStamp(log.ts)}
                </td>
                <td className="py-4 pr-4 font-mono text-[12px] tracking-[0.08em] uppercase">{log.level}</td>
                <td className="py-4 font-sans text-[16px] font-light">
                  {cleanText(log.message)}
                  <span className="mt-1 block font-mono text-[12px] text-[#9CA3AF]">Source {log.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-4 font-mono text-[12px] text-[#9CA3AF]">
        <button type="button" disabled={safe <= 1} onClick={() => setPage(safe - 1)}>Previous</button>
        <span className="num">{safe} / {pages}</span>
        <button type="button" disabled={safe >= pages} onClick={() => setPage(safe + 1)}>Next</button>
      </div>
    </div>
  );
}
