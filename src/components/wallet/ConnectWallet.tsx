"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/kit";
import { chainLabel } from "@/lib/wallet/evm";
import { shortenAddress } from "@/lib/wallet/shorten";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hyperEvmTestnet } from "hettnet-core";

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const connector = connectors[0];
  const pending = isConnecting || isPending;

  if (compact && isConnected && address) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <Chip>{shortenAddress(address)}</Chip>
        <span className="font-mono text-[12px] text-[#9CA3AF] uppercase">{chainLabel(chainId)}</span>
        <button
          type="button"
          className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase hover:text-[#F5F5F5]"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={!connector || pending}
        onClick={() => connector && connect({ connector, chainId: hyperEvmTestnet.id })}
      >
        {pending ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-[#FFB81C] uppercase">Read-only session</p>
      <p className="mt-2 max-w-md font-sans text-[16px] font-light text-[#9CA3AF]">
        Connecting shares a public address so HyperEVM testnet and HyperCore testnet balances can be
        read. Hettnet does not sign, send, or broadcast a transaction when you connect.
      </p>
      {isConnected && address ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Chip>{shortenAddress(address)}</Chip>
          <span className="font-mono text-[12px] text-[#9CA3AF] uppercase">{chainLabel(chainId)}</span>
          {chainId !== hyperEvmTestnet.id ? (
            <Button
              variant="outline"
              size="sm"
              disabled={switching}
              onClick={() => switchChain({ chainId: hyperEvmTestnet.id })}
            >
              Use testnet
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {!connector ? (
            <p className="font-sans text-[16px] font-light text-[#9CA3AF]">
              No injected EVM wallet found. Install a browser wallet. Connecting still never signs.
            </p>
          ) : (
            <Button variant="outline" disabled={pending} onClick={() => connect({ connector, chainId: hyperEvmTestnet.id })}>
              {pending ? "Connecting…" : "Connect EVM wallet"}
            </Button>
          )}
        </div>
      )}
      {error ? (
        <p className="mt-4 font-sans text-[16px] font-light text-[#EF4444]">{error.message}</p>
      ) : null}
    </div>
  );
}
