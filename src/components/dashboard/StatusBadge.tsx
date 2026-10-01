import { cn } from "@/lib/cn";
import type { BannerKind } from "@/types/dashboard";

const STYLES: Record<BannerKind, string> = {
  "dry-run": "border-claw-amber/40 bg-claw-amber/10 text-claw-amber",
  "circuit-hold": "border-claw-blood/50 bg-claw-blood/12 text-claw-blood",
  safe: "border-claw-safe/40 bg-claw-safe/10 text-claw-safe",
  error: "border-claw-blood/50 bg-claw-blood/12 text-claw-blood",
};

const DOT: Record<BannerKind, string> = {
  "dry-run": "bg-claw-amber",
  "circuit-hold": "bg-claw-blood",
  safe: "bg-claw-safe",
  error: "bg-claw-blood",
};

const LABELS: Record<BannerKind, string> = {
  "dry-run": "DRY RUN",
  "circuit-hold": "CIRCUIT HOLD",
  safe: "SAFE",
  error: "ERROR",
};

export function StatusBadge({
  kind,
  label,
  className,
}: {
  kind: BannerKind;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase",
        STYLES[kind],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[kind])} />
      {label ?? LABELS[kind]}
    </span>
  );
}
