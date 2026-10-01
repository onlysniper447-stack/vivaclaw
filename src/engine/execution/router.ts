import { quoteSwap } from "@/engine/sensors/jupiter";
import type { ExecutionIntent, ExecutionResult } from "@/types";

export async function executeIntent(intent: ExecutionIntent): Promise<ExecutionResult> {
  const loggedAt = Date.now();
  const quote = await quoteSwap({
    inputMint: intent.inputMint,
    outputMint: intent.outputMint,
    amountAtomic: intent.amountAtomic,
    slippageBps: intent.slippageBps,
  });

  return {
    ok: true,
    dryRun: true,
    loggedAt,
    netProfitAtomic: quote.outAmount,
    error: undefined,
  };
}
