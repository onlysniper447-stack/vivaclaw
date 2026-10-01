# VIVACLAW

Autonomous yield-arbitrage agent on Solana. The workspace is a Next.js 16 App Router app (TypeScript, Tailwind CSS v4, ESM) with a server-side execution engine.

| Layer | Stack |
| --- | --- |
| App | Next.js 16 · React 19 · App Router · `src/` |
| Style | Tailwind CSS v4 · Framer Motion · Radix |
| State | Zustand · TanStack Query · `ws` feed |
| Solana | `@solana/web3.js` v1 · `@solana/kit` (Kamino 12) |
| Venues | Kamino Lend · Meteora Dynamic Vaults · Meteora DLMM · Raydium CLMM · Orca Whirlpools · Jupiter Swap API v6 |
| Oracle | Pyth Hermes (`@pythnetwork/price-service-client`) |
| Fees | ClawPump fee-sharing engine |

## Layout

```
src/
  app/                 App Router pages + API routes
  components/dashboard UI
  engine/              sensors, guardrails, execution, ClawPump, WS feed
  lib/                 env, constants, Solana helpers
  store/               Zustand client store
  types/               shared interfaces
```

Engine code is server-only by convention. Client components talk to `/api/*` and the WebSocket feed — they never import `@/lib/env` or `@/lib/solana/wallet`.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the homepage. The operator console is at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Optional live feed (separate Node process):

```bash
npm run engine:feed
```

`NEXT_PUBLIC_WS_PORT` (default `8787`) is the browser WebSocket port.

## Environment

See `.env.example`. Required for a real scan:

- `SOLANA_RPC_URL` — Helius / QuickNode HTTPS RPC
- `JUPITER_API_URL` — `https://lite-api.jup.ag/swap/v1` (free) or `https://api.jup.ag/swap/v1` (portal key)
- `CLAWPUMP_API_KEY` — fee-share reporting (optional in dry-run)
- `AGENT_PRIVATE_KEY` — **server-only** base58 secret; required only when `AGENT_DRY_RUN=false`

Keep `AGENT_DRY_RUN=true` until guardrails, oracle freshness, and RPC reliability are verified on a funded wallet.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js 16 webpack dev server (Solana SDK fallbacks) |
| `npm run dev:webpack` | Webpack dev server (more compatible with some Solana SDKs) |
| `npm run build` | Production build with Webpack (`--webpack`; Solana fallbacks) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run engine:feed` | Ranked-yield WebSocket server |

## Notes

- Meteora vault-sdk targets `@solana/web3.js` **v1**. Kamino klend-sdk v12 uses `@solana/kit`. Both clients live in `src/lib/solana`.
- Jupiter v6 quote host `quote-api.jup.ag/v6` is deprecated; the template defaults to `lite-api.jup.ag/swap/v1`.
- `@pythnetwork/price-service-client` is deprecated upstream in favor of `@pythnetwork/hermes-client`. It is kept because it is the requested oracle client.
- Chrome may warn about a hydration mismatch on `data-cap-chrome-extension-installed`. That attribute is injected by a browser extension (commonly a Cap / CapCut helper). It does not appear in Incognito when extensions are disabled, and VivaClaw does not set it. Treat this as an environment-specific console warning; do not add `suppressHydrationWarning` to hide it.
- Browser wallet connect is read-only. Phantom or Solflare may share a public key so SOL/USDC/USDT can be read over RPC. The app never calls sign, send, or signMessage, and it never broadcasts a transaction.
