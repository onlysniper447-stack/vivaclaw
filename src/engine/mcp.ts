import {
  AGENT_DISCLAIMER,
  createAlert,
  evaluateEntry,
  getOpportunity,
  INDICATIONS,
  listOpportunities,
  proposeEntry,
  simulateRate,
  VENUES,
  type OpportunityFilter,
} from "@/engine/agent-api";
import type { Indication, OpportunityLayer, OpportunityType, VenueSlug } from "hettnet-core";

const PROTOCOL = "2025-03-26";
const SERVER_INFO = { name: "hettnet", version: "0.1.0" };

type Json = Record<string, unknown>;

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

const TOOLS = [
  {
    name: "list_opportunities",
    description:
      "List Hyperliquid yield and LP opportunities with optional filters. Indications are informational, not financial advice.",
    inputSchema: {
      type: "object",
      properties: {
        venue: { type: "string", enum: VENUES },
        indication: { type: "string", enum: INDICATIONS },
        layer: { type: "string", enum: ["core", "evm"] },
        type: { type: "string", enum: ["lending", "lp", "vault", "staking"] },
        asset: { type: "string" },
        minApy: { type: "number", description: "Decimal fraction. 0.05 = 5%." },
        minTvl: { type: "number" },
        limit: { type: "number" },
        refresh: { type: "boolean" },
      },
    },
  },
  {
    name: "get_opportunity",
    description: "Get one opportunity by id from the last discovery snapshot.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "simulate_rate",
    description:
      "Simulate HyperCore stablecoin supply APY after additional supply. Uses the documented kink model.",
    inputSchema: {
      type: "object",
      properties: {
        opportunityId: { type: "string" },
        totalSupplied: { type: "number" },
        totalBorrowed: { type: "number" },
        additionalSupply: { type: "number" },
      },
    },
  },
  {
    name: "evaluate_entry",
    description: "Re-score an opportunity as ENTER / WATCH / AVOID with optional threshold overrides.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        ceilingApy: { type: "number" },
        minTvlEnterLendUsd: { type: "number" },
        minTvlEnterLpUsd: { type: "number" },
      },
    },
  },
  {
    name: "create_alert",
    description:
      "Store an in-process alert rule and return matching opportunity ids. Optional webhook POST. Process-local only.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        venue: { type: "string", enum: VENUES },
        indication: { type: "string", enum: INDICATIONS },
        asset: { type: "string" },
        minApy: { type: "number" },
        minTvl: { type: "number" },
        webhookUrl: { type: "string" },
      },
    },
  },
  {
    name: "propose_entry",
    description:
      "Return an unsigned entry plan (calldata and steps). Never signs, sends, or holds keys. Mainnet send is off.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        account: { type: "string" },
        amountWei: { type: "string" },
      },
    },
  },
];

export async function handleMcpMessage(message: unknown): Promise<unknown | null> {
  if (Array.isArray(message)) {
    const out = [];
    for (const item of message) {
      const result = await handleOne(item);
      if (result) out.push(result);
    }
    return out;
  }
  return handleOne(message);
}

async function handleOne(message: unknown): Promise<unknown | null> {
  const req = message as RpcRequest;
  const id = req.id ?? null;
  const method = typeof req.method === "string" ? req.method : "";
  const isNotification = id === null || method.startsWith("notifications/");
  if (isNotification) return null;

  try {
    if (method === "initialize") {
      return ok(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: `${AGENT_DISCLAIMER} Hettnet never signs, sends, or holds keys. Locked to HyperEVM testnet (chain 998).`,
      });
    }
    if (method === "ping") return ok(id, {});
    if (method === "tools/list") return ok(id, { tools: TOOLS });
    if (method === "tools/call") {
      const params = (req.params ?? {}) as { name?: string; arguments?: Json };
      const name = params.name ?? "";
      const args = params.arguments ?? {};
      const result = await callTool(name, args);
      return ok(id, result);
    }
    return err(id, -32601, `Unknown method: ${method}`);
  } catch (error) {
    return err(id, -32603, error instanceof Error ? error.message : "internal error");
  }
}

async function callTool(name: string, args: Json) {
  switch (name) {
    case "list_opportunities": {
      const data = await listOpportunities(asFilter(args));
      return text(data);
    }
    case "get_opportunity": {
      const id = String(args.id ?? "");
      if (!id) return toolError("id is required.");
      const data = await getOpportunity(id);
      if (!data) return toolError("Unknown opportunity.");
      return text(data);
    }
    case "simulate_rate": {
      const data = simulateRate({
        opportunityId: args.opportunityId ? String(args.opportunityId) : undefined,
        totalSupplied: asNumber(args.totalSupplied),
        totalBorrowed: asNumber(args.totalBorrowed),
        additionalSupply: asNumber(args.additionalSupply),
      });
      if ("error" in data) return toolError(String(data.error));
      return text(data);
    }
    case "evaluate_entry": {
      const id = String(args.id ?? "");
      if (!id) return toolError("id is required.");
      const data = await evaluateEntry({
        id,
        ...(asNumber(args.ceilingApy) !== undefined ? { ceilingApy: asNumber(args.ceilingApy) } : {}),
        ...(asNumber(args.minTvlEnterLendUsd) !== undefined
          ? { minTvlEnterLendUsd: asNumber(args.minTvlEnterLendUsd) }
          : {}),
        ...(asNumber(args.minTvlEnterLpUsd) !== undefined
          ? { minTvlEnterLpUsd: asNumber(args.minTvlEnterLpUsd) }
          : {}),
      });
      if ("error" in data) return toolError(String(data.error));
      return text(data);
    }
    case "create_alert": {
      const data = await createAlert({
        name: args.name ? String(args.name) : undefined,
        venue: asVenue(args.venue),
        indication: asIndication(args.indication),
        asset: args.asset ? String(args.asset) : null,
        minApy: asNumber(args.minApy) ?? null,
        minTvl: asNumber(args.minTvl) ?? null,
        webhookUrl: args.webhookUrl ? String(args.webhookUrl) : null,
      });
      return text(data);
    }
    case "propose_entry": {
      const id = String(args.id ?? "");
      if (!id) return toolError("id is required.");
      const data = await proposeEntry({
        id,
        account: args.account ? String(args.account) : null,
        amountWei: args.amountWei ? String(args.amountWei) : null,
      });
      if ("error" in data) return toolError(String(data.error));
      return text(data);
    }
    default:
      return toolError(`Unknown tool: ${name}`);
  }
}

function asFilter(args: Json): OpportunityFilter {
  return {
    venue: asVenue(args.venue),
    indication: asIndication(args.indication),
    layer: args.layer === "core" || args.layer === "evm" ? (args.layer as OpportunityLayer) : undefined,
    type: asType(args.type),
    asset: args.asset ? String(args.asset) : undefined,
    minApy: asNumber(args.minApy),
    minTvl: asNumber(args.minTvl),
    limit: asNumber(args.limit),
    refresh: args.refresh === true,
  };
}

function asVenue(value: unknown): VenueSlug | undefined {
  return typeof value === "string" && VENUES.includes(value as VenueSlug) ? (value as VenueSlug) : undefined;
}

function asIndication(value: unknown): Indication | undefined {
  return typeof value === "string" && INDICATIONS.includes(value as Indication)
    ? (value as Indication)
    : undefined;
}

function asType(value: unknown): OpportunityType | undefined {
  return value === "lending" || value === "lp" || value === "vault" || value === "staking"
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function text(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, jsonReplacer, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

function ok(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function err(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
