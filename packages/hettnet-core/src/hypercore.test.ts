import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HYPERCORE_TESTNET_USDC_EVM, HYPERCORE_USDC_EVM } from "./constants";
import { mapHyperCoreReserve, resolveHyperCoreToken } from "./adapters/hypercore";

const testnetSpot = [
  {
    index: 0,
    name: "USDC",
    evmContract: { address: HYPERCORE_TESTNET_USDC_EVM },
  },
  {
    index: 1,
    name: "PURR",
    evmContract: { address: "0xa9056c15938f9aff34cd497c722ce33db0c2fd57" },
  },
  {
    index: 1105,
    name: "HYPE",
    evmContract: { address: "0x0000000000000000000000000000000000000000" },
  },
  { index: 1435, name: "HORSE", evmContract: null },
];

describe("HyperCore token resolution on testnet", () => {
  it("uses the testnet USDC contract, not the mainnet bridged USDC", () => {
    const token = resolveHyperCoreToken(0, testnetSpot);
    assert.equal(token.evm, HYPERCORE_TESTNET_USDC_EVM.toLowerCase());
    assert.notEqual(token.evm, HYPERCORE_USDC_EVM.toLowerCase());
    assert.equal(token.label, "USDC (HyperCore)");
  });

  it("names unmapped testnet indices from spotMeta instead of TOKEN-N", () => {
    const horse = resolveHyperCoreToken(1435, testnetSpot);
    assert.equal(horse.symbol, "HORSE");
    assert.equal(horse.evm, null);
    const purr = resolveHyperCoreToken(1, testnetSpot);
    assert.equal(purr.symbol, "PURR");
  });

  it("drops the zero-address HYPE contract instead of treating it as an EVM mint", () => {
    const hype = resolveHyperCoreToken(1105, testnetSpot);
    assert.equal(hype.symbol, "HYPE");
    assert.equal(hype.evm, null);
    assert.equal(hype.kind, "collateral");
  });

  it("does not apply the mainnet index catalog when spotMeta is missing on testnet", () => {
    const token = resolveHyperCoreToken(0, []);
    assert.equal(token.symbol, "TOKEN-0");
    assert.equal(token.evm, null);
  });

  it("maps a testnet reserve onto the testnet USDC id", () => {
    const opp = mapHyperCoreReserve(
      [0, { supplyYearlyRate: "0.0115", utilization: "0.25", oraclePx: "1.0", totalSupplied: "10", totalBorrowed: "2" }],
      1,
      testnetSpot,
    );
    assert.ok(opp);
    const asset = opp.assets[0];
    assert.ok(asset);
    assert.equal(asset.id, HYPERCORE_TESTNET_USDC_EVM.toLowerCase());
    assert.equal(asset.symbol, "USDC (HyperCore)");
    assert.notEqual(asset.id, HYPERCORE_USDC_EVM.toLowerCase());
  });
});
