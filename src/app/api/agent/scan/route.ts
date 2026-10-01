import { NextResponse } from "next/server";
import { scanOnce } from "@/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const snapshot = await scanOnce();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "scan failed",
      },
      { status: 500 },
    );
  }
}
