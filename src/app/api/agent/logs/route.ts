import { NextResponse } from "next/server";
import { engineLogs, getVivaclawStatus } from "@/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: getVivaclawStatus(),
    logs: engineLogs(),
  });
}
