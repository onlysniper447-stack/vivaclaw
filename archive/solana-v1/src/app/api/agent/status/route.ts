import { NextResponse } from "next/server";
import { getAgentSnapshot } from "@/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getAgentSnapshot());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "status failed",
      },
      { status: 500 },
    );
  }
}
