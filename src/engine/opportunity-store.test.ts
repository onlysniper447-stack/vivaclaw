import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Opportunity } from "hettnet-core";
import {
  getStoredOpportunity,
  loadOpportunityById,
  resetOpportunitySnapshot,
  setOpportunitySnapshot,
} from "./opportunity-store";

function opp(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    type: "lending",
    venue: "hypercore",
    layer: "core",
    assets: [{ symbol: "USDC (HyperCore)", id: "core:0" }],
    apyTotal: 0.04,
    apyBase: 0.04,
    apyIncentive: 0,
    apr: null,
    tvl: 8_000_000,
    supplied: 10_000_000,
    borrowed: 7_500_000,
    utilization: 0.75,
    volume24h: null,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: false,
    depthUsd: null,
    oraclePx: 1,
    ilClass: null,
    risks: [],
    source: "test",
    url: null,
    verified: true,
    fetchedAt: 1,
    stale: false,
    signal: { indication: "ENTER", reasons: ["Verified HyperCore supply APY."], alerts: [] },
    ...partial,
  };
}

describe("loadOpportunityById", () => {
  beforeEach(() => {
    resetOpportunitySnapshot();
  });

  it("returns the stored yield record without rediscovering", async () => {
    const row = opp({ id: "hypercore:lend:0" });
    setOpportunitySnapshot([row], 1, []);
    let discovered = 0;
    const loaded = await loadOpportunityById("hypercore:lend:0", async () => {
      discovered += 1;
      return undefined;
    });
    assert.equal(loaded?.id, "hypercore:lend:0");
    assert.equal(discovered, 0);
  });

  it("rediscovers when this isolate has no snapshot for a visible Yield row", async () => {
    const row = opp({ id: "hypercore:lend:0" });
    const loaded = await loadOpportunityById("hypercore:lend:0", async () => ({
      opportunities: [row],
      fetchedAt: 2,
      errors: [],
    }));
    assert.equal(loaded?.id, "hypercore:lend:0");
    assert.equal(getStoredOpportunity("hypercore:lend:0")?.id, "hypercore:lend:0");
  });

  it("does not ask the user to reload yields that are already on the page", async () => {
    const loaded = await loadOpportunityById("missing", async () => undefined);
    assert.equal(loaded, undefined);
  });
});
