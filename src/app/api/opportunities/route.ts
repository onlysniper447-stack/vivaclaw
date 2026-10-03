import { NextResponse } from "next/server";
import { discoverOpportunities } from "vivaclaw-core";
import { setOpportunitySnapshot } from "@/engine/opportunity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await discoverOpportunities();
    setOpportunitySnapshot(result.opportunities, result.fetchedAt, result.errors);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "opportunities unavailable" },
      { status: 500 },
    );
  }
}
