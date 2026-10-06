import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hettnetNetwork, hypercoreInfoUrl, hyperevmRpcUrl, hyperliquidAppUrl } from "./network";

describe("testnet lock", () => {
  it("defaults to testnet", () => {
    assert.equal(hettnetNetwork(), "testnet");
  });

  it("points HyperCore, RPC, and the app at testnet hosts", () => {
    assert.match(hypercoreInfoUrl(), /hyperliquid-testnet/);
    assert.match(hyperevmRpcUrl(), /hyperliquid-testnet/);
    assert.match(hyperliquidAppUrl(), /hyperliquid-testnet/);
  });
});
