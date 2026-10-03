"use client";

import Image from "next/image";
import Link from "next/link";
import { HomeAnimatedBackground } from "@/components/home/HomeAnimatedBackground";
import { Narrative } from "@/components/home/Narrative";
import { WalletSection } from "@/components/home/WalletSection";
import { Button } from "@/components/ui/button";
import { Chip, EmptyState } from "@/components/ui/kit";
import { publicEnv } from "@/lib/public-env";

const CLUSTER_LABEL = {
  "mainnet-beta": "Mainnet-beta",
  devnet: "devnet",
  testnet: "testnet",
} as const;

export function HomePage() {
  const cluster = publicEnv.NEXT_PUBLIC_CLUSTER;
  const clusterLabel = CLUSTER_LABEL[cluster];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="relative isolate overflow-hidden">
        <HomeAnimatedBackground />
        <header className="relative z-10 mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" width={30} height={30} alt="" />
            <span className="font-sans text-[16px] font-semibold">VivaClaw</span>
          </Link>
          <nav className="flex items-center gap-6 font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
            <a href="#steps" className="hover:text-[#FFB81C]">How it works</a>
            <a href="#wallet" className="hover:text-[#FFB81C]">Wallet</a>
            <Link href="/dashboard" className="hover:text-[#FFB81C]">Console</Link>
          </nav>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] max-w-[1240px] flex-col items-start justify-end px-5 pb-16">
          <Chip>Solana · {clusterLabel} · Read-only</Chip>
          <h1 className="mt-8 max-w-5xl font-sans text-[48px] leading-[1.02] font-bold tracking-[-0.05em] sm:text-[72px] lg:text-[96px]">
            See where your stablecoins <span className="text-[#FFB81C]">earn</span> the most
          </h1>
          <p className="mt-6 max-w-2xl font-sans text-[22px] leading-relaxed font-light text-[#9CA3AF] sm:text-[28px]">
            VivaClaw compares Solana lending rates on Meteora and Kamino and tells you when the gap is worth acting on.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button variant="primary" asChild>
              <Link href="/dashboard">Open console</Link>
            </Button>
            <a href="#steps" className="font-sans text-[14px] font-bold underline underline-offset-[5px]">
              How it works
            </a>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-[1240px] px-5 pb-[140px]">
        <div className="grid border border-[#2B313B] sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Rates tracked" value="—" note="Open the console to check" />
          <Figure label="Sources" value="6" note="Lend and high-return LP" />
          <Figure label="Trigger" value="3.5%" note="Server config" />
          <Figure label="Funds moved" value="0" note="No transaction is broadcast" />
        </div>
      </section>

      <Narrative />
      <WalletSection />

      <section className="mx-auto max-w-[1240px] px-5 pb-[140px]">
        <h2 className="font-sans text-[38px] font-semibold tracking-[-0.02em]">The gap, in plain sight</h2>
        <div className="mt-8">
          <EmptyState
            title="No comparable gap"
            body="There is no pair with both a Meteora rate and a Kamino rate yet. Open the console to check yields. That is left blank on purpose."
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-[140px]">
        <h2 className="font-sans text-[38px] font-semibold tracking-[-0.02em]">What VivaClaw never does</h2>
        <ol className="mt-8 divide-y divide-[#2B313B] border-y border-[#2B313B]">
          <Never n="01" text="Sign, send, or broadcast a transaction." />
          <Never n="02" text="Show, store, or log a private key." />
          <Never n="03" text="Turn a missing rate into a fake number." />
        </ol>
      </section>

      <footer className="mx-auto max-w-[1240px] px-5 py-8 font-mono text-[12px] tracking-[0.08em] text-[#9CA3AF] uppercase">
        VIVACLAW · SOLANA YIELD OPERATOR · {cluster.toUpperCase()} · READ-ONLY CONSOLE
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
      <span className="font-sans text-[20px] font-light">{text}</span>
    </li>
  );
}
