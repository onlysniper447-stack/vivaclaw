import { NextResponse } from "next/server";
import { z } from "zod";
import { claimPool, enterPool, withdrawPool } from "@/engine/positions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  action: z.enum(["enter", "claim", "withdraw"]),
  poolId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick ENTER, CLAIM, or WITHDRAW on a pool." }, { status: 400 });
  }

  const { action, poolId, positionId } = parsed.data;
  const result =
    action === "enter"
      ? enterPool(poolId ?? "")
      : action === "claim"
        ? claimPool(positionId ?? "")
        : withdrawPool(positionId ?? "");

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "The action did not finish.", dryRun: true }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    dryRun: true,
    action: result.action,
    position: result.position,
  });
}
