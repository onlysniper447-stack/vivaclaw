import { cn } from "@/lib/cn";

export function ApyMeter({
  bps,
  maxBps,
  tone = "amber",
}: {
  bps: number | null;
  maxBps: number;
  tone?: "amber" | "cyan" | "safe" | "muted";
}) {
  const width =
    bps === null || maxBps <= 0 ? 0 : Math.min(100, (Math.abs(bps) / maxBps) * 100);
  const fill =
    tone === "cyan"
      ? "bg-claw-cyan"
      : tone === "safe"
        ? "bg-claw-safe"
        : tone === "muted"
          ? "bg-zinc-500"
          : "bg-claw-amber";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", fill)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
