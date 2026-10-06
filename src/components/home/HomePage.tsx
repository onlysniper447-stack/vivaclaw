"use client";

import Link from "next/link";
import { HettnetMark } from "@/components/brand/HettnetMark";
import { HomeAnimatedBackground } from "@/components/home/HomeAnimatedBackground";
import { Narrative } from "@/components/home/Narrative";
import { WalletSection } from "@/components/home/WalletSection";
import { Button } from "@/components/ui/button";
import { Chip, EmptyState } from "@/components/ui/kit";

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="relative isolate overflow-hidden">
        <HomeAnimatedBackground />
        <header className="relative z-10 mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <HettnetMark size={32} />
            <span className="font-sans text-[16px] font-semibold">Hettnet</span>
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.08em] text-[#9CA3AF] uppercase sm:gap-6 sm:text-[12px]">
            <a href="#steps" className="min-h-11 inline-flex items-center hover:text-[#FFB81C]">How it works</a>
            <a href="#wallet" className="min-h-11 inline-flex items-center hover:text-[#FFB81C]">Wallet</a>
            <Link href="/dashboard" className="min-h-11 inline-flex items-center hover:text-[#FFB81C]">Console</Link>
          </nav>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] max-w-[1240px] flex-col items-start justify-end px-4 pb-12 sm:px-5 sm:pb-16">
          <Chip className="flex-wrap whitespace-normal leading-relaxed">Hyperliquid testnet · Detect → Evaluate → Enter · Read-only</Chip>
          <h1 className="mt-8 max-w-5xl break-words font-sans text-[32px] leading-[1.08] font-bold tracking-[-0.05em] sm:text-[72px] sm:leading-[1.02] lg:text-[96px]">
            See where yield and liquidity <span className="text-[#FFB81C]">earn</span> on Hyperliquid
          </h1>
          <p className="mt-6 max-w-2xl font-sans text-[18px] leading-relaxed font-light text-[#9CA3AF] sm:text-[28px]">
            Hettnet reads HyperCore lending and HyperEVM venues, then ranks opportunities for people and AI agents. Indications are informational, not financial advice.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-12">
            <Button variant="primary" asChild>
              <Link href="/dashboard">Open console</Link>
            </Button>
            <a href="#steps" className="font-sans text-[14px] font-bold underline underline-offset-[5px]">
              How it works
            </a>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-5 sm:pb-[140px]">
        <div className="grid border border-[#2B313B] sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Rates tracked" value="—" note="Open the console to check" />
          <Figure label="Sources" value="6" note="HyperCore, HyperLend, Felix, HyperSwap, Kittenswap, Project X" />
          <Figure label="Trigger" value="3.5%" note="Server config" />
          <Figure label="Funds moved" value="0" note="No transaction is broadcast" />
        </div>
      </section>

      <Narrative />
      <WalletSection />

      <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-5 sm:pb-[140px]">
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">The gap, in plain sight</h2>
        <div className="mt-8">
          <EmptyState
            title="No comparable gap"
            body="Open the console to read HyperCore and HyperEVM venues. A missing rate stays blank. That is left blank on purpose."
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-5 sm:pb-[140px]">
        <h2 className="font-sans text-[28px] font-semibold tracking-[-0.02em] sm:text-[38px]">What Hettnet never does</h2>
        <ol className="mt-8 divide-y divide-[#2B313B] border-y border-[#2B313B]">
          <Never n="01" text="Sign, send, or broadcast a transaction." />
          <Never n="02" text="Show, store, or log a private key." />
          <Never n="03" text="Turn a missing rate into a fake number." />
        </ol>
      </section>

      <footer className="mx-auto max-w-[1240px] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] font-mono text-[11px] leading-relaxed tracking-[0.08em] text-[#9CA3AF] uppercase sm:px-5 sm:text-[12px]">
        HETTNET · HYPERLIQUID YIELD INTELLIGENCE · READ-ONLY CONSOLE · NOT FINANCIAL ADVICE
      </footer>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="px-4 py-5">
      <p className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">{label}</p>
      <p className="num mt-2 font-mono text-[28px]">{value}</p>
      <p className="mt-2 font-sans text-[14px] font-light text-[#9CA3AF]">{note}</p>
    </div>
  );
}

function Never({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-6 py-5">
      <span className="font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF]">{n}</span>
      <span className="min-w-0 font-sans text-[16px] font-light sm:text-[20px]">{text}</span>
    </li>
  );
}
