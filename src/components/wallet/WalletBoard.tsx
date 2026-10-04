"use client";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { EmptyState } from "@/components/ui/kit";
import { shortenAddress } from "@/lib/wallet/shorten";
import { useAccount } from "wagmi";

type Holdings = {
  address: string;
  hype: number | null;
  tokens: { symbol: string; mint: string; uiAmount: number | null; decimals: number; layer: string }[];
  core: { ok: boolean; balances: { coin: string; total: string }[]; detail: string };
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
  const { address, isConnected } = useAccount();
  const holdings = useQuery({
    queryKey: ["wallet-holdings", address],
    queryFn: () => loadHoldings(address!),
    enabled: Boolean(address),
  });

  return (
    <div>
      <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">Wallet</h1>
      <p className="mt-3 max-w-2xl font-sans text-[16px] font-light text-[#9CA3AF]">
        Connect to read HYPE, Circle USDC, HyperCore USDC, USDT0, and WHYPE. Connecting never signs.
        HyperCore USDC and Circle USDC stay separate.
      </p>
      <div className="mt-8 border-t border-[#2B313B] pt-8">
        <ConnectWallet />
      </div>
      {!isConnected || !address ? (
        <div className="mt-8">
          <EmptyState
            title="No public address attached"
            body="Connect an injected EVM wallet to read HyperEVM and HyperCore balances. The wallet popup is a connection grant, not a transaction."
          />
        </div>
      ) : holdings.isError ? (
        <p className="mt-8 font-sans text-[16px] text-[#EF4444]">
          {holdings.error instanceof Error ? holdings.error.message : "Holdings could not be read."}
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <caption className="sr-only">Read-only holdings for {shortenAddress(address)}</caption>
            <thead>
              <tr className="border-b border-[#2B313B] font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
                <th className="py-3 pr-4 font-medium">Asset</th>
                <th className="py-3 pr-4 font-medium">Layer</th>
                <th className="py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#2B313B]">
                <td className="py-4 pr-4 font-sans text-[16px]">HYPE</td>
                <td className="py-4 pr-4 font-sans text-[16px] text-[#9CA3AF]">HyperEVM</td>
                <td className="num py-4 font-mono text-[16px]">
                  {holdings.data?.hype === null || holdings.data?.hype === undefined
                    ? holdings.isPending
                      ? "…"
                      : "unavailable"
                    : holdings.data.hype.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
              </tr>
              {(holdings.data?.tokens ?? []).map((token) => (
                <tr key={token.mint} className="border-b border-[#2B313B]">
                  <td className="py-4 pr-4 font-sans text-[16px]">{token.symbol}</td>
                  <td className="py-4 pr-4 font-sans text-[16px] text-[#9CA3AF]">HyperEVM</td>
                  <td className="num py-4 font-mono text-[16px]">
                    {token.uiAmount === null
                      ? "unavailable"
                      : token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                </tr>
              ))}
              {(holdings.data?.core.balances ?? []).map((row) => (
                <tr key={`core:${row.coin}`} className="border-b border-[#2B313B]">
                  <td className="py-4 pr-4 font-sans text-[16px]">{row.coin}</td>
                  <td className="py-4 pr-4 font-sans text-[16px] text-[#9CA3AF]">HyperCore</td>
                  <td className="num py-4 font-mono text-[16px]">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {holdings.data && !holdings.data.core.ok ? (
            <p className="mt-4 font-sans text-[16px] font-light text-[#9CA3AF]">
              HyperCore spot balances unavailable ({holdings.data.core.detail}).
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
