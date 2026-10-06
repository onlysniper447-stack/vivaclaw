import { corsJson, corsOptions } from "@/lib/cors";
import { createAlert, INDICATIONS, listAlerts, VENUES } from "@/engine/agent-api";
import type { Indication, VenueSlug } from "hettnet-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsOptions();
}

export function GET() {
  return corsJson(listAlerts());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      venue?: string;
      indication?: string;
      asset?: string;
      minApy?: number;
      minTvl?: number;
      webhookUrl?: string;
    };
    const venue = body.venue && VENUES.includes(body.venue as VenueSlug) ? (body.venue as VenueSlug) : null;
    const indication =
      body.indication && INDICATIONS.includes(body.indication as Indication)
        ? (body.indication as Indication)
        : null;
    return corsJson(
      await createAlert({
        name: body.name,
        venue,
        indication,
        asset: body.asset ?? null,
        minApy: typeof body.minApy === "number" ? body.minApy : null,
        minTvl: typeof body.minTvl === "number" ? body.minTvl : null,
        webhookUrl: body.webhookUrl ?? null,
      }),
    );
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "create_alert failed" },
      { status: 500 },
    );
  }
}
