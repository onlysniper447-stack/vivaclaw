import type { GapStatus } from "@/engine/classify";
import { gapStatusLabel } from "@/engine/classify";
import type { DashboardPayload } from "@/types/dashboard";

export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F<>]/g, "").slice(0, 240);
}

export function formatPercentBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "no pool";
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatAmount(amount: number | null | undefined, unit: string): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  const digits = abs === 0 ? 2 : abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.0001 ? 6 : 8;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.min(2, digits),
  })} ${unit}`;
}

export function formatSignedBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "Not comparable";
  const sign = bps > 0 ? "+" : "";
  return `${sign}${(bps / 100).toFixed(2)}%`;
}

export function statusText(status: GapStatus): string {
  return gapStatusLabel(status);
}

export function freshnessLabel(at: number | null | undefined, now = Date.now()): string {
  if (at === null || at === undefined) return "Not checked";
  const delta = now - at;
  if (delta < -5_000) return "Clock is ahead of this reading";
  if (delta < 5_000) return "Just now";
  const seconds = Math.round(delta / 1000);
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `Updated ${minutes}m ago`;
  return new Date(at).toLocaleString();
}

export function utcStamp(at: number | null | undefined): string {
  if (!at) return "No timestamp";
  return `${new Date(at).toISOString()} UTC`;
}

export function localStamp(at: number | null | undefined): string {
  if (!at) return "—";
  return new Date(at).toLocaleString();
}

export type LatencyTone = "ok" | "slow" | "bad";

export function latencyTone(ms: number | null, ok: boolean): LatencyTone {
  if (!ok || ms === null || ms > 1_500) return "bad";
  if (ms >= 600) return "slow";
  return "ok";
}

export function csvCell(value: string): string {
  const text = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function shortenMint(mint: string): string {
  const clean = cleanText(mint);
  if (clean.length < 12) return clean;
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

/** Age of a Pyth print in seconds, measured at the dashboard reading. */
export function oracleAgeSeconds(generatedAt: number, publishTimeSec: number): number {
  return Math.max(0, Math.round((generatedAt - publishTimeSec * 1000) / 1000));
}

export function pegReading(
  healthy: boolean,
  ageSec: number,
  maxAgeSec: number,
): { tone: "ok" | "attention" | "bad"; label: string } {
  if (!healthy) return { tone: "bad", label: "Outside band" };
  if (ageSec > maxAgeSec) return { tone: "attention", label: "Stale print" };
  return { tone: "ok", label: "Inside band" };
}

/**
 * One risk word for Overview and the Risk tab.
 * A yield that failed to read is not a risk verdict. A Pyth print that has
 * aged past its threshold since the check is Caution, even if it was fresh then.
 */
export function riskVerdict(data: Pick<DashboardPayload, "generatedAt" | "risk">): { word: string; reason: string } {
  const risk = data.risk;
  if (!risk) return { word: "—", reason: "No Pyth print in this process yet." };
  if (risk.circuitHold) {
    return { word: "Hold", reason: risk.reasons[0] ?? "A guardrail is holding execution." };
  }
  const aged = risk.peg.some(
    (peg) => oracleAgeSeconds(data.generatedAt, peg.publishTime) > risk.thresholds.oracleMaxAgeSec,
  );
  const outside =
    risk.oracleStale || risk.peg.some((peg) => !peg.healthy) || risk.volatility.some((vol) => vol.extreme);
  if (aged || outside) {
    return {
      word: "Caution",
      reason: aged
        ? `A Pyth print is older than ${risk.thresholds.oracleMaxAgeSec}s as of this reading.`
        : risk.reasons[0] ?? "A peg, volatility, or oracle print is outside its band.",
    };
  }
  return { word: "Clear", reason: "Peg, confidence, and volatility are inside the configured bands." };
}
