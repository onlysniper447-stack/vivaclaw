"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { freshnessLabel } from "@/lib/present";
import type { AgentSnapshot } from "@/types";

type Phase = "idle" | "success" | "failure";

function lastCheckedLine(at: number | null): string {
  if (at === null) return "Not checked";
  const label = freshnessLabel(at);
  if (label === "Just now") return "Last checked just now";
  if (label.startsWith("Updated ")) return `Last checked ${label.slice("Updated ".length)}`;
  return label;
}

async function postScan(): Promise<AgentSnapshot> {
  const res = await fetch("/api/agent/scan", { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as AgentSnapshot & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "The check did not finish.");
  return body;
}

export function CheckYields({ lastChecked }: { lastChecked: number | null }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const mutation = useMutation({
    mutationFn: postScan,
    onSuccess: async (snapshot) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const failed = Object.entries(snapshot.engine.sources)
        .filter(([, source]) => source.state === "error")
        .map(([, source]) => source.message)
        .filter((message): message is string => Boolean(message));
      setCount(snapshot.opportunities.filter((row) => row.grossApyBps !== null).length);
      if (snapshot.engine.phase === "error") {
        setPhase("failure");
        setDetail(snapshot.engine.reason ?? (failed.join(" ") || "Rates could not be read."));
        return;
      }
      setPhase("success");
      setDetail(failed.length ? failed.join(" ") : null);
    },
    onError: (error: unknown) => {
      setPhase("failure");
      setDetail(error instanceof Error ? error.message : "The check did not finish.");
    },
  });

  const mutateRef = useRef(mutation.mutate);
  useEffect(() => {
    mutateRef.current = mutation.mutate;
  }, [mutation.mutate]);

  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => setPhase("idle"), 4_000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const onRun = () => {
      if (!mutation.isPending) mutateRef.current();
    };
    window.addEventListener("hettnet:check", onRun);
    return () => window.removeEventListener("hettnet:check", onRun);
  }, [mutation.isPending]);

  const running = mutation.isPending;
  const checked = lastCheckedLine(lastChecked);

  return (
    <div>
      {phase === "failure" ? (
        <p className="mb-2 font-sans text-[16px] font-semibold text-[#F5F5F5]">Could not check rates</p>
      ) : null}
      {phase === "success" ? (
        <p className="num mb-2 font-mono text-[12px] tracking-[0.08em] text-[#FFB81C] uppercase">Rates updated</p>
      ) : null}
      <Button
        variant="accent"
        disabled={running}
        onClick={() => mutation.mutate()}
      >
        {running ? "Checking rates…" : phase === "failure" ? "Try again" : phase === "success" ? "Check yields again" : "Check yields now"}
      </Button>
      <p className="num mt-2 font-mono text-[12px] text-[#9CA3AF]" aria-live="polite">
        {running
          ? "HyperCore, HyperLend, Felix, HyperSwap"
          : phase === "failure"
            ? detail
            : phase === "success"
              ? `Just now · ${count} rates${detail ? ` · ${detail}` : ""}`
              : checked}
      </p>
    </div>
  );
}
