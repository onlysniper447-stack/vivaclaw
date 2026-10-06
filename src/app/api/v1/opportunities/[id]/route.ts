import { corsJson, corsOptions } from "@/lib/cors";
import { getOpportunity } from "@/engine/agent-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsOptions();
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await getOpportunity(decodeURIComponent(id));
    if (!data) return corsJson({ error: "Unknown opportunity." }, { status: 404 });
    return corsJson(data);
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "opportunity unavailable" },
      { status: 500 },
    );
  }
}
