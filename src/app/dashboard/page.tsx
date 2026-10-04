import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsoleApp } from "@/components/console/ConsoleApp";

export const metadata: Metadata = {
  title: "Console",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" aria-busy="true" />}>
      <ConsoleApp />
    </Suspense>
  );
}
