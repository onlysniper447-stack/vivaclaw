"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { HettnetMark } from "@/components/brand/HettnetMark";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckYields } from "@/components/console/CheckYields";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { WalletBoard } from "@/components/wallet/WalletBoard";
import { ActivityBoard } from "@/components/console/ActivityBoard";
import { ExecutionBoard } from "@/components/console/ExecutionBoard";
import { Overview } from "@/components/console/Overview";
import { RiskBoard } from "@/components/console/RiskBoard";
import { YieldBoard } from "@/components/console/YieldBoard";
import { useDesk } from "@/components/console/useDesk";
import { Chip, EmptyState, Skeleton, Tabs, Tooltip } from "@/components/ui/kit";
import { freshnessLabel } from "@/lib/present";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "yield", label: "Yield" },
  { id: "risk", label: "Risk" },
  { id: "execution", label: "Execution" },
  { id: "activity", label: "Activity" },
  { id: "wallet", label: "Wallet" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function subscribeOnline(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function onlineSnapshot(): boolean {
  return !navigator.onLine;
}

function isTab(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function ConsoleApp() {
  const desk = useDesk();
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const tab: TabId = isTab(initial) ? initial : "overview";
  const offline = useSyncExternalStore(subscribeOnline, onlineSnapshot, () => false);
  const showCheck = tab === "yield";

  function select(next: string) {
    const value = isTab(next) ? next : "overview";
    router.replace(value === "overview" ? "/dashboard" : `/dashboard?tab=${value}`);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <header className="sticky top-0 z-30 border-b border-[#2B313B] bg-[#0A0A0A]">
        <div className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2">
          <Link href="/" className="flex items-center gap-3">
            <HettnetMark size={36} />
            <span className="font-sans text-[16px] font-semibold tracking-[-0.02em]">Hettnet</span>
          </Link>
          <Tabs value={tab} tabs={[...TABS]} onChange={select} />
          <div className="ml-auto flex items-center gap-4">
            <p
              className="num font-mono text-[12px] text-[#9CA3AF]"
              title={desk.data?.lastScanAt ? new Date(desk.data.lastScanAt).toISOString() : undefined}
            >
              {freshnessLabel(desk.data?.lastScanAt ?? null)}
            </p>
            <ConnectWallet compact />
            <Tooltip label="Indications are informational, not financial advice. The console never signs, sends, or broadcasts.">
              <Chip>Dry run</Chip>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-[72px] pt-12">
        {showCheck ? (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <CheckYields lastChecked={desk.data?.lastScanAt ?? null} />
          </div>
        ) : null}
        <div aria-live="polite" className="sr-only">
          {desk.data ? `Engine ${desk.data.engine.phase}` : "Loading console"}
        </div>
        {tab === "wallet" ? (
          <WalletBoard />
        ) : offline ? (
          <EmptyState
            title="This browser is offline"
            body="Reconnect to refresh this console."
          />
        ) : desk.isPending ? (
          <div className="grid gap-4" aria-busy="true" aria-label="Loading console">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : desk.isError ? (
          <EmptyState
            title="The console could not load"
            body={`${desk.error instanceof Error ? desk.error.message : "The dashboard request failed."} The API may still be starting, or the RPC probe timed out. Retry the page.`}
            action={
              <button type="button" className="font-sans text-[14px] font-bold underline underline-offset-[5px]" onClick={() => void desk.refetch()}>
                Retry
              </button>
            }
          />
        ) : desk.data ? (
          <>
            {tab === "overview" ? <Overview data={desk.data} /> : null}
            {tab === "yield" ? <YieldBoard data={desk.data} /> : null}
            {tab === "risk" ? <RiskBoard data={desk.data} /> : null}
            {tab === "execution" ? <ExecutionBoard data={desk.data} /> : null}
            {tab === "activity" ? <ActivityBoard data={desk.data} /> : null}
          </>
        ) : null}
      </main>
      <footer className="border-t border-[#2B313B]">
        <p className="mx-auto max-w-[1240px] px-5 py-4 font-sans text-[14px] font-light text-[#9CA3AF]">
          {desk.data?.disclaimer ?? "Indications are informational, not financial advice."} Non-custodial: the app never holds funds or keys.
        </p>
      </footer>
    </div>
  );
}
