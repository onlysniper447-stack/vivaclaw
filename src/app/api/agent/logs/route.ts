import { NextResponse } from "next/server";
import { engineLogs, getAgentStatus } from "@/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: getAgentStatus(),
    logs: engineLogs(),
  });
}
