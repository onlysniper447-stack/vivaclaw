import { singleton } from "@/engine/singleton";
import type { Opportunity } from "hettnet-core";

const live = singleton("hl.opportunities", () => ({
  items: [] as Opportunity[],
  fetchedAt: null as number | null,
  errors: [] as { source: string; message: string }[],
}));

export function setOpportunitySnapshot(
  items: Opportunity[],
  fetchedAt: number,
  errors: { source: string; message: string }[],
): void {
  live.items = items;
  live.fetchedAt = fetchedAt;
  live.errors = errors;
}

export function listStoredOpportunities(): Opportunity[] {
  return live.items;
}

export function getStoredOpportunity(id: string): Opportunity | undefined {
  return live.items.find((row) => row.id === id);
}

export function lastOpportunityFetchAt(): number | null {
  return live.fetchedAt;
}
