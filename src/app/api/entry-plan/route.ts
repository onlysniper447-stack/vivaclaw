import { NextResponse } from "next/server";
import { formatEther, type Address, type Hex } from "viem";
import { buildEntryPlan, entryPlanAllowed, evmClient } from "hettnet-core";
import { loadOpportunityById } from "@/engine/opportunity-store";
import { parseEvmAddress } from "@/lib/wallet/evm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  const account = parseEvmAddress(url.searchParams.get("account"));
  if (!id) {
    return NextResponse.json({ error: "Pick a venue print first." }, { status: 400 });
  }
  const opp = await loadOpportunityById(id);
  if (!opp) {
    return NextResponse.json({ error: "That venue print is not in the current yield list." }, { status: 404 });
  }
  if (!entryPlanAllowed(opp)) {
    return NextResponse.json(
      { error: opp.signal?.reasons[0] ?? "This print is marked AVOID.", indication: "AVOID" },
      { status: 400 },
    );
  }

  const plan = buildEntryPlan(opp, { account });
  const simulation = await simulatePlan(plan.txs, account);
  return NextResponse.json({
    ...plan,
    simulation,
  });
}

async function simulatePlan(
  txs: { to: Address; data: Hex; value: "0"; description: string }[],
  account: Address | null,
): Promise<{ ok: boolean; message: string; gasHype: string | null }> {
  if (txs.length === 0) {
    return { ok: true, message: "No in-app calldata. Open the venue to enter.", gasHype: null };
  }
  if (!account) {
    return {
      ok: true,
      message: "Calldata is encoded. Connect a wallet to estimate gas. Mainnet send is off.",
      gasHype: null,
    };
  }
  const client = evmClient();
  try {
    let gas = 0n;
    for (const tx of txs) {
      gas += await client.estimateGas({
        account,
        to: tx.to,
        data: tx.data,
      });
    }
    const price = await client.getGasPrice();
    const hype = formatEther(gas * price);
    return {
      ok: true,
      message: `eth_call estimate succeeded (~${hype} HYPE at current gas price). Mainnet send is off.`,
      gasHype: hype,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `eth_call reverted: ${error.message}. Calldata is still encoded. The account may lack the token.`
          : "eth_call reverted. Calldata is still encoded.",
      gasHype: null,
    };
  }
}
