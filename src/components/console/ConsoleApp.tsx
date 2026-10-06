"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { HettnetMark } from "@/components/brand/HettnetMark";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckYields } from "@/components/console/CheckYields";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { WalletBoard } from "@/components/wallet/WalletBoard";
import { ActivityBoard } from "@/components/console/ActivityBoard";
import { AgentsBoard } from "@/components/console/AgentsBoard";
import { ExecutionBoard } from "@/components/console/ExecutionBoard";
import { Overview } from "@/components/console/Overview";
import { RiskBoard } from "@/components/console/RiskBoard";
import { YieldBoard } from "@/components/console/YieldBoard";
import { useDesk } from "@/components/console/useDesk";
import { Chip, EmptyState, Skeleton, Tabs, Tooltip } from "@/components/ui/kit";
import { CONSOLE_STATUS_CHIPS } from "@/lib/console-status";
import { freshnessLabel } from "@/lib/present";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "yield", label: "Yield" },
  { id: "risk", label: "Risk" },
  { id: "execution", label: "Execution" },
  { id: "activity", label: "Activity" },
  { id: "wallet", label: "Wallet" },
  { id: "agents", label: "Agents" },
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
      <header className="sticky top-0 z-30 border-b border-[#2B313B] bg-[#0A0A0A] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid max-w-[1240px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-3 sm:px-5 lg:flex lg:flex-wrap lg:gap-x-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <HettnetMark size={32} />
            <span className="font-sans text-[16px] font-semibold tracking-[-0.02em]">Hettnet</span>
          </Link>
          <div className="col-start-2 row-start-1 ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <p
              className="num hidden font-mono text-[12px] text-[#9CA3AF] sm:block"
              title={desk.data?.lastScanAt ? new Date(desk.data.lastScanAt).toISOString() : undefined}
            >
              {freshnessLabel(desk.data?.lastScanAt ?? null)}
            </p>
            <ConnectWallet compact />
            {CONSOLE_STATUS_CHIPS.map((chip) =>
              chip.tooltip ? (
                <Tooltip key={chip.label} label={chip.tooltip}>
                  <Chip>{chip.label}</Chip>
                </Tooltip>
              ) : (
                <Chip key={chip.label}>{chip.label}</Chip>
              ),
            )}
          </div>
          <div className="col-span-2 min-w-0 lg:flex-1">
            <Tabs value={tab} tabs={[...TABS]} onChange={select} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] min-w-0 px-4 pb-[max(4.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-5 sm:pt-12">
        {showCheck ? (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <CheckYields lastChecked={desk.data?.lastScanAt ?? null} />
          </div>
        ) : null}
        <div aria-live="polite" className="sr-only">
          {desk.data ? `Engine ${desk.data.engine.phase}` : "Loading console"}
        </div>
        {tab === "agents" ? (
          <AgentsBoard />
        ) : tab === "wallet" ? (
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
        <p className="mx-auto max-w-[1240px] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-sans text-[14px] font-light text-[#9CA3AF] sm:px-5">
          {desk.data?.disclaimer ?? "Indications are informational, not financial advice."} Non-custodial: the app never holds funds or keys.
        </p>
      </footer>
    </div>
  );
}
