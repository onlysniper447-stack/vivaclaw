"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { useAgentStore } from "@/store/agent-store";

export function RiskPanel() {
  const halt = useAgentStore((s) => s.snapshot?.haltReason);
  const dryRun = useAgentStore((s) => s.snapshot?.dryRun ?? true);

  return (
    <Card>
      <CardTitle>Risk guardrails</CardTitle>
      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        <li>Max slippage / impact caps enforced before any Jupiter swap.</li>
        <li>Kamino LTV ceiling blocks looped leverage above MAX_LTV_BPS.</li>
        <li>Pyth prints older than ORACLE_MAX_STALENESS_MS halt execution.</li>
        <li className="text-claw-amber">
          {dryRun
            ? "Live signing is disabled (AGENT_DRY_RUN=true)."
            : "Live signing is enabled. Guardrails still apply."}
        </li>
        {halt ? <li className="text-claw-blood">Halt: {halt}</li> : null}
      </ul>
    </Card>
  );
}
