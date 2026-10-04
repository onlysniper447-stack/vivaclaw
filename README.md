# Hettnet

Yield and liquidity-pool intelligence for Hyperliquid, for people and AI agents. The workspace is a Next.js 16 App Router app (TypeScript, Tailwind CSS v4, ESM) with `packages/hettnet-core` adapters.

Indications are informational, not financial advice. The app is non-custodial: it never holds funds or keys.

| Layer | Stack |
| --- | --- |
| App | Next.js 16 · React 19 · App Router · `src/` |
| Style | Tailwind CSS v4 · Framer Motion · Radix |
| State | Zustand · TanStack Query · `ws` feed |
| Hyperliquid | HyperCore info API · HyperEVM (viem / wagmi) |
| Venues | HyperCore lend · HyperLend · Felix/Morpho · HyperSwap · Kittenswap · Project X |

## Layout

```
src/
  app/                 App Router pages + API routes
  components/          console, home, wallet
  engine/              discovery, signals, entry plans, WS feed
  lib/                 public env, chain helpers
  store/               Zustand client store
  types/               shared interfaces
```

Engine code is server-only by convention. Client components talk to `/api/*`.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev -- --port 3005
```

Open [http://localhost:3005](http://localhost:3005) for the homepage. The operator console is at [http://localhost:3005/dashboard](http://localhost:3005/dashboard).

## Environment

See `.env.example`. Connecting a wallet is read-only and never signs. Keep `AGENT_DRY_RUN=true`. Do not put a private key in the repo.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js 16 webpack dev server |
| `npm run build` | Production build with Webpack |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests + route smoke |
| `npm run engine:feed` | Ranked-yield WebSocket server |

## Notes

- Chrome may warn about a hydration mismatch on `data-cap-chrome-extension-installed`. That attribute is injected by a browser extension. It does not appear in Incognito when extensions are disabled, and Hettnet does not set it.
- Browser wallet connect is read-only. An injected EVM wallet may share a public address so HYPE and HyperEVM tokens can be read. The app never calls sign, send, or signMessage on connect, and it never broadcasts a transaction.
