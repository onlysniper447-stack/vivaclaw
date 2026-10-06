---
name: hettnet
description: Hyperliquid yield and LP intelligence via Hettnet REST and MCP. Use when listing opportunities, scoring ENTER/WATCH/AVOID, simulating HyperCore supply rates, or proposing an unsigned entry plan.
---

# Hettnet

Hettnet reads HyperCore lending and HyperEVM venues (HyperLend, Felix/Morpho, HyperSwap, Kittenswap, Project X), then ranks them. Indications are informational, not financial advice. The app never holds funds or keys and never signs or sends a transaction.

Base URL: `https://hettnet.vercel.app` (local: `http://localhost:3005`).

## REST

- `GET /api/v1/opportunities` — filters: `venue`, `indication`, `layer`, `type`, `asset`, `minApy` (decimal, `0.05` = 5%), `minTvl`, `limit`, `refresh=1`
- `GET /api/v1/opportunities/:id`
- `POST /api/v1/simulate-rate` — `{ opportunityId }` or `{ totalSupplied, totalBorrowed, additionalSupply }`
- `POST /api/v1/evaluate-entry` — `{ id, ceilingApy?, minTvlEnterLendUsd?, minTvlEnterLpUsd? }`
- `POST /api/v1/alerts` — `{ name?, venue?, indication?, asset?, minApy?, minTvl?, webhookUrl? }` (process-local)
- `POST /api/v1/entry-plan` — `{ id, account?, amountWei? }` unsigned calldata only

## MCP

`POST /api/mcp` Streamable HTTP (JSON). Tools: `list_opportunities`, `get_opportunity`, `simulate_rate`, `evaluate_entry`, `create_alert`, `propose_entry`.

Claude Desktop (stdio bridge):

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

## Rules

- Never ask the user to paste a private key.
- Never broadcast a transaction. `propose_entry` returns unsigned calldata; `signNetwork` is `testnet`. Mainnet send is off.
- Missing numbers stay unavailable. Do not invent APY, TVL, or gas.
- HyperCore USDC is not Circle USDC on HyperEVM.
- Say the indication disclaimer when presenting ENTER / WATCH / AVOID.
