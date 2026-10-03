"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardPayload } from "@/types/dashboard";

export async function loadDashboard(): Promise<DashboardPayload> {
  const res = await fetch("/api/dashboard", { signal: AbortSignal.timeout(45_000) });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "The dashboard did not respond.");
  }
  return body as DashboardPayload;
}

export function useDesk() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboard,
    staleTime: 10_000,
    refetchInterval: () => {
      if (typeof document !== "undefined" && document.hidden) return false;
      return 15_000;
    },
  });
}
