import { NextResponse } from "next/server";
import { handleMcpMessage } from "@/engine/mcp";
import { corsEmpty, corsOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
  "Content-Type": "application/json",
};

export function OPTIONS() {
  return corsOptions();
}

export function GET() {
  return corsEmpty(405);
}

export function DELETE() {
  return corsEmpty(405);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleMcpMessage(body);
    if (result === null) {
      return new NextResponse(null, { status: 202, headers: HEADERS });
    }
    return new NextResponse(JSON.stringify(result), { status: 200, headers: HEADERS });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : "parse error",
        },
      }),
      { status: 400, headers: HEADERS },
    );
  }
}
