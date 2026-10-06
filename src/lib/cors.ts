import { NextResponse } from "next/server";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
};

export function corsJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: HEADERS,
  });
}

export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export function corsEmpty(status: number) {
  return new NextResponse(null, { status, headers: HEADERS });
}
