"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/kit";
import { usePoolAction } from "@/components/console/usePoolAction";
import { indicationTone } from "@/lib/present";
import type { EntryPlan } from "hettnet-core";
import { useAccount } from "wagmi";

type PlanPayload = EntryPlan & {
  simulation: { ok: boolean; message: string; gasHype: string | null };
};

async function loadPlan(id: string, account: string | undefined): Promise<PlanPayload> {
  const url = new URL("/api/entry-plan", window.location.origin);
  url.searchParams.set("id", id);
  if (account) url.searchParams.set("account", account);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
  const body = (await res.json().catch(() => ({}))) as PlanPayload & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "The entry plan did not load.");
  return body;
}

export function EntryPlanPanel({
  poolId,
  canSimulate,
  alreadyOpen,
}: {
  poolId: string;
  canSimulate: boolean;
  alreadyOpen: boolean;
}) {
  const { address } = useAccount();
  const simulate = usePoolAction();
  const plan = useQuery({
    queryKey: ["entry-plan", poolId, address ?? null],
    queryFn: () => loadPlan(poolId, address),
  });

  if (plan.isPending) {
    return <p className="font-sans text-[16px] font-light text-[#9CA3AF]">Building the entry plan…</p>;
  }
  if (plan.isError) {
    return (
      <p className="font-sans text-[16px] font-light text-[#EF4444]">
        {plan.error instanceof Error ? plan.error.message : "The entry plan did not load."}
      </p>
    );
  }

  const data = plan.data;
  return (
    <div className="grid gap-5 font-sans text-[16px] font-light">
      <div className="flex flex-wrap items-center gap-3">
        {data.indication ? <StatusDot tone={indicationTone(data.indication)} label={data.indication} /> : null}
        <span className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
          {data.layer} · {data.signNetwork === "mainnet-blocked" ? "mainnet send off" : "testnet"}
        </span>
      </div>
      <p>
        Required token: {data.requiredToken.symbol} on {data.requiredToken.layer}. Plan size {data.amountLabel}.
      </p>
      <ol className="grid gap-3">
        {data.steps.map((step, index) => (
          <li key={step.title}>
            <p className="font-sans text-[16px] font-semibold">
              {String(index + 1).padStart(2, "0")} {step.title}
            </p>
            <p className="mt-1 text-[#9CA3AF]">{step.detail}</p>
          </li>
        ))}
      </ol>
      {data.txs.length > 0 ? (
        <div>
          <p className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">Transactions to sign</p>
          <ul className="mt-2 space-y-2">
            {data.txs.map((tx) => (
              <li key={tx.data} className="font-mono text-[12px] text-[#9CA3AF]">
                {tx.description} → {tx.to.slice(0, 6)}…{tx.to.slice(-4)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[#9CA3AF]">
          {data.deepLink
            ? "No in-app calldata. Open the venue to enter."
            : "No in-app calldata and no published venue link for this print."}
        </p>
      )}
      <p className={data.simulation.ok ? "text-[#9CA3AF]" : "text-[#FFB81C]"}>{data.simulation.message}</p>
      {data.simulation.gasHype ? (
        <p className="num font-mono text-[12px] text-[#9CA3AF]">Estimated gas {data.simulation.gasHype} HYPE</p>
      ) : null}
      <p className="text-[#9CA3AF]">{data.disclaimer}</p>
      <div className="flex flex-wrap gap-3">
        {alreadyOpen ? (
          <Button variant="link" asChild>
            <a href="/dashboard?tab=execution">OPEN</a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={!canSimulate || simulate.isPending}
            onClick={() => simulate.mutate({ action: "enter", poolId })}
          >
            {simulate.isPending ? "Simulating…" : "Simulate locally"}
          </Button>
        )}
        {data.deepLink ? (
          <Button variant="link" asChild>
            <a href={data.deepLink} target="_blank" rel="noreferrer">
              Open venue
            </a>
          </Button>
        ) : null}
      </div>
      {simulate.isError ? (
        <p className="text-[#EF4444]">
          {simulate.error instanceof Error ? simulate.error.message : "Simulate did not finish."}
        </p>
      ) : null}
    </div>
  );
}
