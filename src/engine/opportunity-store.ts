import { singleton } from "@/engine/singleton";
import { discoverOpportunities, type Opportunity } from "hettnet-core";

const live = singleton("hl.opportunities", () => ({
  items: [] as Opportunity[],
  fetchedAt: null as number | null,
  errors: [] as { source: string; message: string }[],
}));

export type DiscoverFn = () => Promise<{
  opportunities: Opportunity[];
  fetchedAt: number;
  errors: { source: string; message: string }[];
} | undefined>;

export function setOpportunitySnapshot(
  items: Opportunity[],
  fetchedAt: number,
  errors: { source: string; message: string }[],
): void {
  live.items = items;
  live.fetchedAt = fetchedAt;
  live.errors = errors;
}

export function resetOpportunitySnapshot(): void {
  live.items = [];
  live.fetchedAt = null;
  live.errors = [];
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

/**
 * Prefer the in-memory snapshot (the same records the Yield page already showed
 * on this isolate). On a cold serverless isolate the snapshot is empty even
 * though the client already rendered those rows — rediscover then look up by id.
 */
export async function loadOpportunityById(
  id: string,
  discover?: DiscoverFn,
): Promise<Opportunity | undefined> {
  const hit = getStoredOpportunity(id);
  if (hit) return hit;
  const result = await (discover ?? discoverOpportunities)();
  if (result) {
    setOpportunitySnapshot(result.opportunities, result.fetchedAt, result.errors);
  }
  return getStoredOpportunity(id);
}
