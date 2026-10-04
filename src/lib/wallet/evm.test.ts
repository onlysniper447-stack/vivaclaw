import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CIRCLE_USDC } from "hettnet-core";
import { parseEvmAddress, WALLET_CAPABILITIES } from "./evm";
import { shortenAddress } from "./shorten";

describe("wallet address", () => {
  it("accepts a HyperEVM address", () => {
    assert.equal(parseEvmAddress(CIRCLE_USDC), CIRCLE_USDC);
  });

  it("rejects empty and invalid strings", () => {
    assert.equal(parseEvmAddress(null), null);
    assert.equal(parseEvmAddress(""), null);
    assert.equal(parseEvmAddress("not-an-address"), null);
  });

  it("shortens an address", () => {
    assert.equal(shortenAddress(CIRCLE_USDC), "0xb8…630f");
  });
});

describe("wallet capabilities", () => {
  it("does not allow signing or sending", () => {
    assert.equal(WALLET_CAPABILITIES.connect, true);
    assert.equal(WALLET_CAPABILITIES.readAddress, true);
    assert.equal(WALLET_CAPABILITIES.signTransaction, false);
    assert.equal(WALLET_CAPABILITIES.sendTransaction, false);
    assert.equal(WALLET_CAPABILITIES.signMessage, false);
  });
});
