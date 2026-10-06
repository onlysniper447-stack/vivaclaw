import { corsJson, corsOptions } from "@/lib/cors";
import { INDICATIONS, listOpportunities, VENUES, type OpportunityFilter } from "@/engine/agent-api";
import type { Indication, OpportunityLayer, OpportunityType, VenueSlug } from "hettnet-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsOptions();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter = parseFilter(url.searchParams);
    return corsJson(await listOpportunities(filter));
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "opportunities unavailable" },
      { status: 500 },
    );
  }
}

function parseFilter(params: URLSearchParams): OpportunityFilter {
  const venue = params.get("venue");
  const indication = params.get("indication");
  const layer = params.get("layer");
  const type = params.get("type");
  return {
    venue: venue && VENUES.includes(venue as VenueSlug) ? (venue as VenueSlug) : undefined,
    indication:
      indication && INDICATIONS.includes(indication as Indication) ? (indication as Indication) : undefined,
    layer: layer === "core" || layer === "evm" ? (layer as OpportunityLayer) : undefined,
    type:
      type === "lending" || type === "lp" || type === "vault" || type === "staking"
        ? (type as OpportunityType)
        : undefined,
    asset: params.get("asset") ?? undefined,
    minApy: numberParam(params.get("minApy")),
    minTvl: numberParam(params.get("minTvl")),
    limit: numberParam(params.get("limit")),
    refresh: params.get("refresh") === "1" || params.get("refresh") === "true",
  };
}

function numberParam(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
