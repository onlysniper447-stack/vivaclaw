import { corsJson, corsOptions } from "@/lib/cors";
import { AGENT_CAPABILITIES, AGENT_DISCLAIMER } from "@/engine/agent-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

export function GET() {
  return corsJson({
    service: "hettnet",
    disclaimer: AGENT_DISCLAIMER,
    capabilities: AGENT_CAPABILITIES,
    rest: {
      "GET /api/v1/opportunities": "list_opportunities",
      "GET /api/v1/opportunities/:id": "get_opportunity",
      "POST /api/v1/simulate-rate": "simulate_rate",
      "POST /api/v1/evaluate-entry": "evaluate_entry",
      "GET /api/v1/alerts": "list alert rules",
      "POST /api/v1/alerts": "create_alert",
      "POST /api/v1/entry-plan": "propose_entry",
    },
    mcp: "POST /api/mcp",
  });
}
