import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePublicKey, shortenAddress } from "./address";
import { shortenAddress as shortenOnly } from "./shorten";
import { WALLET_CAPABILITIES } from "./injected";
import { TOKENS } from "../constants";

describe("wallet address", () => {
  it("accepts a real mint as a public key", () => {
    const key = parsePublicKey(TOKENS.USDC.mint);
    assert.equal(key?.toBase58(), TOKENS.USDC.mint);
  });

  it("rejects empty and invalid strings", () => {
    assert.equal(parsePublicKey(null), null);
    assert.equal(parsePublicKey(""), null);
    assert.equal(parsePublicKey("not-a-key"), null);
  });

  it("shortens a public key", () => {
    assert.equal(shortenAddress(TOKENS.USDC.mint), "EPjF…Dt1v");
    assert.equal(shortenOnly(TOKENS.USDC.mint), "EPjF…Dt1v");
  });
});

describe("wallet capabilities", () => {
  it("does not allow signing or sending", () => {
    assert.equal(WALLET_CAPABILITIES.connect, true);
    assert.equal(WALLET_CAPABILITIES.readPublicKey, true);
    assert.equal(WALLET_CAPABILITIES.signTransaction, false);
    assert.equal(WALLET_CAPABILITIES.sendTransaction, false);
    assert.equal(WALLET_CAPABILITIES.signMessage, false);
  });
});
