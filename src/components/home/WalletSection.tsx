"use client";

import { ConnectWallet } from "@/components/wallet/ConnectWallet";

export function WalletSection() {
  return (
    <section id="wallet" className="relative overflow-hidden border-y border-white/[0.06] bg-[#070707]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative mx-auto grid max-w-[1240px] items-start gap-10 px-4 py-16 sm:px-5 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-24 lg:py-28">
        <div>
          <p className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.18em] text-[#FFB81C] uppercase">
            <span className="h-px w-5 bg-[#FFB81C]" aria-hidden />
            Wallet
          </p>
          <h2 className="mt-8 max-w-md font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.03em] text-[#F5F5F5] uppercase sm:text-[28px] lg:text-[34px]">
            Connect to read.
            <br />
            Never to <span className="text-[#FFB81C]">sign.</span>
          </h2>
          <p className="mt-6 max-w-sm font-sans text-[16px] leading-relaxed font-light text-[#C4C8CE]">
            Hettnet can attach a public address and read HYPE and HyperEVM tokens. Connecting is not a
            signature and not a transaction.
          </p>
        </div>
        <div>
          <div className="border-t border-white/10 py-8">
            <ConnectWallet />
          </div>
          <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-5 border-t border-white/10 py-7">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#FFB81C]">01</span>
            <div>
              <h3 className="font-sans text-[18px] font-semibold tracking-[-0.02em] uppercase">Connect</h3>
              <p className="mt-2.5 font-sans text-[15px] font-light text-[#9CA3AF]">
                The wallet shares a public key. No transaction is created.
              </p>
            </div>
          </article>
          <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-5 border-t border-white/10 py-7">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#FFB81C]">02</span>
            <div>
              <h3 className="font-sans text-[18px] font-semibold tracking-[-0.02em] uppercase">Read</h3>
              <p className="mt-2.5 font-sans text-[15px] font-light text-[#9CA3AF]">
                Balances are fetched over RPC. The agent still does not sign.
              </p>
            </div>
          </article>
          <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-5 border-y border-white/10 py-7">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#FFB81C]">03</span>
            <div>
              <h3 className="font-sans text-[18px] font-semibold tracking-[-0.02em] uppercase">Disconnect</h3>
              <p className="mt-2.5 font-sans text-[15px] font-light text-[#9CA3AF]">
                Drop the session at any time. Nothing is sent on-chain.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
