"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/kit";
import { shortenAddress } from "@/lib/wallet/shorten";
import { useWalletStore } from "@/store/wallet-store";

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const status = useWalletStore((s) => s.status);
  const publicKey = useWalletStore((s) => s.publicKey);
  const provider = useWalletStore((s) => s.provider);
  const error = useWalletStore((s) => s.error);
  const available = useWalletStore((s) => s.available);
  const connect = useWalletStore((s) => s.connect);
  const disconnect = useWalletStore((s) => s.disconnect);

  if (compact && status === "connected" && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <Chip>{shortenAddress(publicKey)}</Chip>
        <button
          type="button"
          className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase hover:text-[#F5F5F5]"
          onClick={() => void disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (compact) {
    const name = available[0];
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={!name || status === "connecting"}
        onClick={() => name && void connect(name)}
      >
        {status === "connecting" ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-[#FFB81C] uppercase">Read-only session</p>
      <p className="mt-2 max-w-md font-sans text-[16px] font-light text-[#9CA3AF]">
        Connecting shares a public address so holdings can be read. VivaClaw does not sign, send, or
        broadcast a transaction.
      </p>
      {status === "connected" && publicKey ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Chip>{shortenAddress(publicKey)}</Chip>
          <span className="font-mono text-[12px] text-[#9CA3AF] uppercase">{provider}</span>
          <Button variant="outline" size="sm" onClick={() => void disconnect()}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {available.length === 0 ? (
            <p className="font-sans text-[16px] font-light text-[#9CA3AF]">
              No browser wallet found. Install Phantom or Solflare. Connecting still never signs.
            </p>
          ) : (
            available.map((name) => (
              <Button
                key={name}
                variant="outline"
                disabled={status === "connecting"}
                onClick={() => void connect(name)}
              >
                {status === "connecting" && provider === name
                  ? "Connecting…"
                  : `Connect ${name === "phantom" ? "Phantom" : "Solflare"}`}
              </Button>
            ))
          )}
        </div>
      )}
      {error ? <p className="mt-4 font-sans text-[14px] text-[#EF4444]">{error}</p> : null}
    </div>
  );
}
