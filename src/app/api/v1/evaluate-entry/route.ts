import { corsJson, corsOptions } from "@/lib/cors";
import { evaluateEntry } from "@/engine/agent-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      ceilingApy?: number;
      minTvlEnterLendUsd?: number;
      minTvlEnterLpUsd?: number;
    };
    if (!body.id) return corsJson({ error: "id is required." }, { status: 400 });
    const data = await evaluateEntry({
      id: body.id,
      ceilingApy: body.ceilingApy,
      minTvlEnterLendUsd: body.minTvlEnterLendUsd,
      minTvlEnterLpUsd: body.minTvlEnterLpUsd,
    });
    if ("error" in data) return corsJson({ error: data.error }, { status: data.status });
    return corsJson(data);
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "evaluate_entry failed" },
      { status: 500 },
    );
  }
}
