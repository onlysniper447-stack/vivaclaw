"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Hint({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/hint relative inline-flex cursor-help", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 w-max max-w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-claw-raised px-2.5 py-1.5 text-left text-[11px] leading-snug text-zinc-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover/hint:opacity-100">
        {label}
      </span>
    </span>
  );
}
