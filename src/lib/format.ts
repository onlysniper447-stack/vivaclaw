const LAMPORTS_PER_SOL = 1_000_000_000;

export function formatApyBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatSignedApyBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  const sign = bps > 0 ? "+" : "";
  return `${sign}${(bps / 100).toFixed(2)}%`;
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  return `${bps} bps`;
}

export function formatLamportsAsSol(lamports: string | null | undefined): string {
  if (lamports === null || lamports === undefined || lamports === "") return "—";
  try {
    const value = Number(lamports) / LAMPORTS_PER_SOL;
    if (!Number.isFinite(value)) return "—";
    return `${value.toFixed(4)} SOL`;
  } catch {
    return "—";
  }
}

export function formatTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export function formatClock(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString();
}

export function shortenMint(mint: string | null | undefined): string {
  if (!mint) return "unset";
  if (mint.length < 12) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
