import { corsJson, corsOptions } from "@/lib/cors";
import { proposeEntry } from "@/engine/agent-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      account?: string;
      amountWei?: string;
    };
    if (!body.id) return corsJson({ error: "id is required." }, { status: 400 });
    const data = await proposeEntry({
      id: body.id,
      account: body.account ?? null,
      amountWei: body.amountWei ?? null,
    });
    if ("error" in data) return corsJson({ error: data.error, indication: "indication" in data ? data.indication : undefined }, { status: data.status });
    return corsJson(data);
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "propose_entry failed" },
      { status: 500 },
    );
  }
}
