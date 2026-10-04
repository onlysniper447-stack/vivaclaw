import { NextResponse } from "next/server";
import { getDashboardPayload } from "@/engine/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const payload = await getDashboardPayload();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "dashboard unavailable";
    console.error("[hettnet:dashboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
