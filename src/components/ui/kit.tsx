"use client";

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import type { LatencyTone } from "@/lib/present";

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[#1A1A1A] px-3 py-1.5 font-mono text-[12px] font-medium tracking-[0.08em] text-[#F5F5F5] uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone,
  label,
}: {
  tone: "ok" | "slow" | "bad" | "idle" | "attention";
  label: string;
}) {
  const color =
    tone === "ok"
      ? "bg-[#34D399]"
      : tone === "bad"
        ? "bg-[#EF4444]"
        : tone === "slow" || tone === "attention"
          ? "bg-[#FFB81C]"
          : "bg-[#6B7280]";
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.08em] text-[#F5F5F5] uppercase">
      <span className={cn("size-1.5 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[2px] border border-[#2B313B] bg-[#1A1A1A] px-1.5 py-0.5 font-mono text-[11px] text-[#9CA3AF]">
      {children}
    </kbd>
  );
}

export function Field({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[2px] border border-[#2B313B] bg-[#141414] px-3 font-sans text-[16px] font-light text-[#F5F5F5] outline-none placeholder:text-[#9CA3AF] focus:border-[#FFB81C]",
        className,
      )}
      {...props}
    />
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span aria-describedby={id}>{children}</span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-40 mt-2 hidden w-64 -translate-x-1/2 border border-[#2B313B] bg-[#141414] px-3 py-2 text-left font-sans text-[14px] font-light text-[#F5F5F5] group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-[#1A1A1A]", className)} aria-hidden />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-[#2B313B] px-6 py-10">
      <h3 className="font-sans text-[22px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-3 max-w-xl font-sans text-[16px] leading-relaxed font-light text-[#9CA3AF]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="h-full w-full max-w-md overflow-y-auto border-l border-[#2B313B] bg-[#0A0A0A] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="font-sans text-[28px] leading-none font-semibold tracking-[-0.02em]">{title}</h2>
          <button type="button" className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function Stat({
  label,
  value,
  source,
  time,
}: {
  label: string;
  value: string;
  source: string;
  time: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">{label}</p>
      <p className="num mt-2 font-mono text-[28px] leading-none text-[#F5F5F5]">{value}</p>
      <p className="num mt-2 font-mono text-[12px] text-[#9CA3AF]" title={time}>
        {source} · {time}
      </p>
    </div>
  );
}

export function Bar({ value, max }: { value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <span className="mt-1 block h-px w-24 bg-[#2B313B]" aria-hidden>
      <span className="block h-px bg-[#FFB81C]" style={{ width: `${width}%` }} />
    </span>
  );
}

export function Sparkline({ points, label }: { points: Array<number | null>; label: string }) {
  const usable = points.filter((point): point is number => point !== null);
  if (usable.length < 2) {
    return <p className="font-sans text-[14px] font-light text-[#9CA3AF]">Not enough readings for a line.</p>;
  }
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min || 1;
  const d = usable
    .map((point, index) => {
      const x = (index / (usable.length - 1)) * 120;
      const y = 32 - ((point - min) / span) * 28;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-32" role="img" aria-label={label}>
      <path d={d} fill="none" stroke="#FFB81C" strokeWidth="1.5" />
    </svg>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex border border-[#2B313B]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(
              "h-10 px-3 font-mono text-[12px] tracking-[0.08em] uppercase",
              active ? "bg-[#1A1A1A] text-[#FFB81C]" : "text-[#9CA3AF]",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({
  value,
  tabs,
  onChange,
}: {
  value: string;
  tabs: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <nav aria-label="Console" className="flex max-w-full gap-x-3 overflow-x-auto pr-2 sm:gap-x-5">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-10 font-mono text-[12px] tracking-[0.08em] uppercase",
              active ? "text-[#FFB81C]" : "text-[#9CA3AF] hover:text-[#FFB81C]",
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase"
    >
      {label}
      {active ? (direction === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

export function latencyLabel(tone: LatencyTone): "ok" | "slow" | "bad" {
  return tone;
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="border border-[#2B313B] bg-[#141414] px-4 py-3 font-sans text-[16px] font-light">
      {message}
    </div>
  );
}

export function Table({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}
