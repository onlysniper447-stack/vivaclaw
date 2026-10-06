import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleMcpMessage } from "./mcp";

describe("MCP JSON-RPC", () => {
  it("initializes as hettnet with tools", async () => {
    const result = (await handleMcpMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    })) as { result: { serverInfo: { name: string }; capabilities: { tools: unknown } } };
    assert.equal(result.result.serverInfo.name, "hettnet");
    assert.ok(result.result.capabilities.tools);
  });

  it("lists the six agent tools", async () => {
    const result = (await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" })) as {
      result: { tools: { name: string }[] };
    };
    const names = result.result.tools.map((tool) => tool.name);
    assert.deepEqual(names, [
      "list_opportunities",
      "get_opportunity",
      "simulate_rate",
      "evaluate_entry",
      "create_alert",
      "propose_entry",
    ]);
  });

  it("simulates a HyperCore rate without discovery", async () => {
    const result = (await handleMcpMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "simulate_rate",
        arguments: { totalSupplied: 100, totalBorrowed: 80, additionalSupply: 5 },
      },
    })) as { result: { content: { text: string }[]; isError?: boolean } };
    assert.equal(result.result.isError, undefined);
    const body = JSON.parse(result.result.content[0]?.text ?? "{}") as {
      simulation: { nextUtilization: number };
    };
    assert.ok(body.simulation.nextUtilization < 0.8);
  });

  it("acks notifications with no response body", async () => {
    const result = await handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
    assert.equal(result, null);
  });
});
