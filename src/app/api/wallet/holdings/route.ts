import { NextResponse } from "next/server";
import { formatUnits, type Address } from "viem";
import {
  CIRCLE_USDC,
  HYPERCORE_INFO_URL,
  HYPERCORE_USDC_EVM,
  USDT0,
  WHYPE_ADDRESS,
  evmClient,
} from "hettnet-core";
import { parseEvmAddress } from "@/lib/wallet/evm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const WATCH: { symbol: string; address: Address; decimals: number }[] = [
  { symbol: "USDC (Circle)", address: CIRCLE_USDC, decimals: 6 },
  { symbol: "USDC (HyperCore)", address: HYPERCORE_USDC_EVM, decimals: 8 },
  { symbol: "USDT0", address: USDT0, decimals: 6 },
  { symbol: "WHYPE", address: WHYPE_ADDRESS, decimals: 18 },
];

export async function GET(request: Request) {
  const address = parseEvmAddress(new URL(request.url).searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "A valid HyperEVM address is required." }, { status: 400 });
  }

  try {
    const client = evmClient();
    const [hypeWei, tokenBalances, core] = await Promise.all([
      client.getBalance({ address }),
      Promise.all(
        WATCH.map(async (token) => {
          try {
            const raw = await client.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
            return {
              symbol: token.symbol,
              mint: token.address,
              amount: raw.toString(),
              uiAmount: Number(formatUnits(raw, token.decimals)),
              decimals: token.decimals,
              layer: "evm" as const,
            };
          } catch {
            return {
              symbol: token.symbol,
              mint: token.address,
              amount: null as string | null,
              uiAmount: null as number | null,
              decimals: token.decimals,
              layer: "evm" as const,
            };
          }
        }),
      ),
      loadCoreSpot(address),
    ]);

    return NextResponse.json({
      address,
      readOnly: true,
      signed: false,
      sent: false,
      chain: "hyperevm",
      hypeWei: hypeWei.toString(),
      hype: Number(formatUnits(hypeWei, 18)),
      tokens: tokenBalances,
      core,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Holdings could not be read." },
      { status: 502 },
    );
  }
}

async function loadCoreSpot(user: Address): Promise<{
  ok: boolean;
  balances: { coin: string; total: string }[];
  detail: string;
}> {
  try {
    const res = await fetch(HYPERCORE_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "spotClearinghouseState", user }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { ok: false, balances: [], detail: `HyperCore HTTP ${res.status}` };
    }
    const body = (await res.json()) as { balances?: { coin?: string; total?: string }[] };
    const balances = (body.balances ?? [])
      .filter((row) => row.coin && row.total)
      .map((row) => ({ coin: String(row.coin), total: String(row.total) }));
    return { ok: true, balances, detail: "spotClearinghouseState" };
  } catch (error) {
    return {
      ok: false,
      balances: [],
      detail: error instanceof Error ? error.message : "HyperCore did not respond",
    };
  }
}
