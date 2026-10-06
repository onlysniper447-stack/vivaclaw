"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/kit";

const TOOLS = [
  "list_opportunities",
  "get_opportunity",
  "simulate_rate",
  "evaluate_entry",
  "create_alert",
  "propose_entry",
];

export function AgentsBoard() {
  const origin =
    typeof window === "undefined" ? "https://hettnet.vercel.app" : window.location.origin;
  const rest = `${origin}/api/v1`;
  const mcp = `${origin}/api/mcp`;
  const claude = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            hettnet: {
              command: "npx",
              args: ["-y", "mcp-remote", mcp],
            },
          },
        },
        null,
        2,
      ),
    [mcp],
  );
  const grok = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            hettnet: {
              url: mcp,
            },
          },
        },
        null,
        2,
      ),
    [mcp],
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2_000);
  }

  return (
    <div className="grid gap-16">
      <section>
        <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Agents</h1>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          REST and MCP for listing Hyperliquid opportunities, scoring them, and proposing unsigned
          entry plans. Indications are informational, not financial advice. Hettnet never signs,
          sends, or holds keys.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Chip>No custody</Chip>
          <Chip>Unsigned plans</Chip>
          <Chip>Testnet</Chip>
        </div>
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Endpoints</h2>
        <ul className="mt-4 grid gap-3 font-mono text-[14px] text-[#F5F5F5]">
          <li>
            REST <span className="text-[#9CA3AF]">{rest}</span>
          </li>
          <li>
            MCP <span className="text-[#9CA3AF]">{mcp}</span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => void copy("rest", rest)}>
            {copied === "rest" ? "Copied" : "Copy REST"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copy("mcp", mcp)}>
            {copied === "mcp" ? "Copied" : "Copy MCP"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Tools</h2>
        <ul className="mt-4 grid gap-2">
          {TOOLS.map((name) => (
            <li key={name} className="font-mono text-[14px] text-[#F5F5F5]">
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Claude Desktop</h2>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          Paste into the MCP servers object. mcp-remote bridges stdio clients to this HTTP server.
        </p>
        <pre className="mt-4 overflow-x-auto border border-[#2B313B] bg-[#141414] p-4 font-mono text-[12px] text-[#F5F5F5]">
          {claude}
        </pre>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => void copy("claude", claude)}>
          {copied === "claude" ? "Copied" : "Copy Claude config"}
        </Button>
      </section>

      <section>
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em]">Grok</h2>
        <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
          Streamable HTTP clients can use the MCP URL directly. Skill instructions live in{" "}
          <span className="font-mono text-[14px] text-[#F5F5F5]">skills/hettnet/SKILL.md</span>.
        </p>
        <pre className="mt-4 overflow-x-auto border border-[#2B313B] bg-[#141414] p-4 font-mono text-[12px] text-[#F5F5F5]">
          {grok}
        </pre>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => void copy("grok", grok)}>
          {copied === "grok" ? "Copied" : "Copy Grok config"}
        </Button>
      </section>
    </div>
  );
}
