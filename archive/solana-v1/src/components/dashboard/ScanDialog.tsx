"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAgentStore } from "@/store/agent-store";
import type { AgentSnapshot } from "@/types";

async function postScan(): Promise<AgentSnapshot> {
  const res = await fetch("/api/agent/scan", { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error ?? "scan failed");
  }
  return (await res.json()) as AgentSnapshot;
}

export function ScanDialog() {
  const [open, setOpen] = useState(false);
  const setSnapshot = useAgentStore((s) => s.setSnapshot);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postScan,
    onSuccess: (snapshot) => {
      setSnapshot(snapshot);
      void queryClient.invalidateQueries({ queryKey: ["agent-status"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          Check yields now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check yields</DialogTitle>
          <DialogDescription>
            Pulls Kamino reserves, Meteora vaults, Jupiter quotes, and Pyth marks, then applies
            risk guardrails. Dry-run stays on — nothing is signed or broadcast.
          </DialogDescription>
        </DialogHeader>
        {mutation.error ? (
          <p className="mb-3 text-sm text-claw-blood">
            {mutation.error instanceof Error ? mutation.error.message : "scan failed"}
          </p>
        ) : null}
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? "Scanning…" : "Confirm dry-run sweep"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
