"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type PoolAction = {
  action: "enter" | "claim" | "withdraw";
  poolId?: string;
  positionId?: string;
};

async function postPoolAction(body: PoolAction): Promise<{ ok: true; dryRun: true }> {
  const res = await fetch("/api/positions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(payload.error ?? "The action did not finish.");
  return { ok: true, dryRun: true };
}

export function usePoolAction() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: postPoolAction,
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (vars.action === "enter") {
        router.replace("/dashboard?tab=execution");
      }
    },
  });
}
