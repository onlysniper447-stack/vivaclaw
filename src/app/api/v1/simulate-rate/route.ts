import { corsJson, corsOptions } from "@/lib/cors";
import { ensureOpportunities, simulateRate } from "@/engine/agent-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      opportunityId?: string;
      totalSupplied?: number;
      totalBorrowed?: number;
      additionalSupply?: number;
    };
    if (body.opportunityId) await ensureOpportunities();
    const data = simulateRate(body);
    if ("error" in data) return corsJson({ error: data.error }, { status: data.status });
    return corsJson(data);
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "simulate_rate failed" },
      { status: 500 },
    );
  }
}
