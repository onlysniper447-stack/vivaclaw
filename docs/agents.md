# Hettnet for agents

REST and MCP for Hyperliquid yield and LP intelligence. Locked to HyperEVM testnet (chain 998). Indications are informational, not financial advice. Hettnet never signs, sends, or holds keys.

Production: https://hettnet.vercel.app  
MCP: https://hettnet.vercel.app/api/mcp  
REST: https://hettnet.vercel.app/api/v1

Skill: `skills/hettnet/SKILL.md`

## Claude Desktop

```json
{
  "mcpServers": {
    "hettnet": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://hettnet.vercel.app/api/mcp"]
    }
  }
}
```

## Grok / Streamable HTTP

```json
{
  "mcpServers": {
    "hettnet": {
      "url": "https://hettnet.vercel.app/api/mcp"
    }
  }
}
```

## Tools

| Tool | Purpose |
| --- | --- |
| list_opportunities | Filtered discovery snapshot |
| get_opportunity | One row by id |
| simulate_rate | HyperCore stablecoin supply model |
| evaluate_entry | ENTER / WATCH / AVOID |
| create_alert | Process-local rule + current matches |
| propose_entry | Unsigned entry plan |
