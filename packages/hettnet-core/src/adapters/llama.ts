import { cached } from "../cache";
import { CACHE_TTL, LLAMA_CHAIN, LLAMA_P0_PROJECTS, LLAMA_POOLS_URL } from "../constants";
import { getJson } from "../http";
import { mapLlamaPool, type LlamaPool } from "../llama";
import type { Opportunity } from "../types";

interface LlamaResponse {
  data?: LlamaPool[];
}

export async function fetchLlamaOpportunities(): Promise<Opportunity[]> {
  return cached("llama:hl-p0", CACHE_TTL.llamaMs, loadLlama);
}

async function loadLlama(): Promise<Opportunity[]> {
  const body = await getJson<LlamaResponse>(LLAMA_POOLS_URL, 30_000);
  const pools = Array.isArray(body.data) ? body.data : [];
  const fetchedAt = Date.now();
  const out: Opportunity[] = [];
  for (const pool of pools) {
    if (pool.chain !== LLAMA_CHAIN) continue;
    if (!pool.project || !LLAMA_P0_PROJECTS.has(pool.project)) continue;
    const mapped = mapLlamaPool(pool, fetchedAt);
    if (mapped) out.push(mapped);
  }
  return out;
}
