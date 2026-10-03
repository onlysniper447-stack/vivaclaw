import { NextResponse } from "next/server";
import { getAgentSnapshot, scanOnce } from "@/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const current = getAgentSnapshot();
    if (current.opportunities.length > 0 && current.lastScanAt) {
      return NextResponse.json(current);
    }
    return NextResponse.json(await scanOnce());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "yields failed",
      },
      { status: 500 },
    );
  }
}
