"use client";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { EmptyState } from "@/components/ui/kit";
import { formatLamportsAsSol } from "@/lib/format";
import { shortenAddress } from "@/lib/wallet/shorten";
import { useWalletStore } from "@/store/wallet-store";

type Holdings = {
  address: string;
  solLamports: string;
  tokens: { symbol: string; mint: string; uiAmount: number | null; decimals: number }[];
  signed: boolean;
  sent: boolean;
};

async function loadHoldings(address: string): Promise<Holdings> {
  const res = await fetch(`/api/wallet/holdings?address=${encodeURIComponent(address)}`, {
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await res.json().catch(() => ({}))) as Holdings & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Holdings could not be read.");
  return body;
}

export function WalletBoard() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const status = useWalletStore((s) => s.status);
  const holdings = useQuery({
    queryKey: ["wallet-holdings", publicKey],
    queryFn: () => loadHoldings(publicKey!),
    enabled: Boolean(publicKey),
  });

  return (
    <div>
      <h1 className="font-sans text-[38px] font-semibold tracking-[-0.02em]">Wallet</h1>
      <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
        Connect to read SOL, USDC, and USDT. This page never signs or sends.
      </p>
      <div className="mt-8 border-t border-[#2B313B] pt-8">
        <ConnectWallet />
      </div>
      {status !== "connected" || !publicKey ? (
        <div className="mt-8">
          <EmptyState
            title="No public key attached"
            body="Connect Phantom or Solflare to read SOL, USDC, and USDT. The wallet popup is a connection grant, not a transaction."
          />
        </div>
      ) : holdings.isError ? (
        <p className="mt-8 font-sans text-[16px] text-[#EF4444]">
          {holdings.error instanceof Error ? holdings.error.message : "Holdings could not be read."}
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <caption className="sr-only">Read-only holdings for {shortenAddress(publicKey)}</caption>
            <thead>
              <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                <th className="py-3 pr-4 font-medium">Asset</th>
                <th className="py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#2B313B]">
                <td className="py-4 pr-4 font-sans text-[16px]">SOL</td>
                <td className="num py-4 font-mono text-[16px]">
                  {holdings.data ? formatLamportsAsSol(holdings.data.solLamports) : "…"}
                </td>
              </tr>
              {(holdings.data?.tokens ?? [{ symbol: "USDC" }, { symbol: "USDT" }]).map((token) => (
                <tr key={token.symbol} className="border-b border-[#2B313B]">
                  <td className="py-4 pr-4 font-sans text-[16px]">{token.symbol}</td>
                  <td className="num py-4 font-mono text-[16px]">
                    {"uiAmount" in token && token.uiAmount !== undefined && token.uiAmount !== null
                      ? token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                      : holdings.isPending
                        ? "…"
                        : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="num mt-4 font-mono text-[12px] text-[#9CA3AF] uppercase">
            Signed: no · Sent: no · {shortenAddress(publicKey)}
          </p>
        </div>
      )}
    </div>
  );
}
