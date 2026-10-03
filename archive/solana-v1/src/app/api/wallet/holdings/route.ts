import { NextResponse } from "next/server";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getConnection } from "@/lib/solana/connection";
import { TOKENS } from "@/lib/constants";
import { parsePublicKey } from "@/lib/wallet/address";
import { withTimeout } from "@/engine/retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WATCH = [TOKENS.USDC, TOKENS.USDT];

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  const owner = parsePublicKey(address);
  if (!owner) {
    return NextResponse.json({ error: "A valid Solana public key is required." }, { status: 400 });
  }

  try {
    const connection = getConnection();
    const [lamports, tokenAccounts] = await Promise.all([
      withTimeout(connection.getBalance(owner), 8_000, "wallet SOL balance"),
      withTimeout(
        connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
        8_000,
        "wallet token accounts",
      ),
    ]);

    const tokens = WATCH.map((token) => {
      const match = tokenAccounts.value.find((account) => {
        const info = account.account.data.parsed?.info as
          | { mint?: string; tokenAmount?: { uiAmount?: number | null; amount?: string } }
          | undefined;
        return info?.mint === token.mint;
      });
      const info = match?.account.data.parsed?.info as
        | { tokenAmount?: { uiAmount?: number | null; amount?: string } }
        | undefined;
      return {
        symbol: token.symbol,
        mint: token.mint,
        amount: info?.tokenAmount?.amount ?? "0",
        uiAmount: info?.tokenAmount?.uiAmount ?? 0,
        decimals: token.decimals,
      };
    });

    return NextResponse.json({
      address: owner.toBase58(),
      readOnly: true,
      signed: false,
      sent: false,
      solLamports: String(lamports),
      tokens,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Holdings could not be read." },
      { status: 502 },
    );
  }
}
