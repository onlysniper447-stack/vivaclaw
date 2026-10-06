import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeFunctionData, type Address } from "viem";
import {
  buildEntryPlan,
  coreWriterAbi,
  defaultPlanAmountWei,
  encodeBorrowLendAction,
  encodeCoreWriterSupply,
  encodeErc4626Deposit,
  encodeHyperlendSupply,
  hyperlendPoolAbi,
  tokenDecimals,
} from "./entry";
import { CORE_WRITER_ADDRESS, HYPERLEND } from "./constants";
import type { Opportunity } from "./types";

const account = "0x1111111111111111111111111111111111111111" as Address;

function opp(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    type: "lending",
    venue: "hyperlend",
    layer: "evm",
    assets: [{ symbol: "USDC", id: "0xb88339cb7199b77e23db6e890353e22632ba630f" }],
    apyTotal: 0.05,
    apyBase: 0.05,
    apyIncentive: 0,
    apr: null,
    tvl: 1_000_000,
    utilization: 0.4,
    volume24h: null,
    volume7d: null,
    feeTier: null,
    capRemaining: null,
    paused: false,
    depthUsd: null,
    oraclePx: null,
    ilClass: null,
    risks: [],
    source: "test",
    url: null,
    verified: true,
    fetchedAt: 1,
    stale: false,
    signal: { indication: "ENTER", reasons: ["Verified venue print."], alerts: [] },
    ...partial,
  };
}

describe("plan size", () => {
  it("uses 1 unit for stables and 0.01 for HYPE", () => {
    assert.equal(defaultPlanAmountWei("USDC", 6), 1_000_000n);
    assert.equal(defaultPlanAmountWei("WHYPE", 18), 10n ** 16n);
    assert.equal(tokenDecimals("USDC (HyperCore)", "core"), 8);
  });
});

describe("CoreWriter action 15", () => {
  it("packs version 1, action id 15, and ABI (op, token, wei)", () => {
    const action = encodeBorrowLendAction(0, 0, 1_000_000n);
    assert.equal(action.slice(0, 10), "0x0100000f");
    const tx = encodeCoreWriterSupply(0, 1_000_000n);
    assert.equal(tx.to.toLowerCase(), CORE_WRITER_ADDRESS.toLowerCase());
    const decoded = decodeFunctionData({ abi: coreWriterAbi, data: tx.data });
    assert.equal(decoded.functionName, "sendRawAction");
  });
});

describe("HyperLend supply", () => {
  it("approves the pool then calls supply", () => {
    const asset = "0xb88339cb7199b77e23db6e890353e22632ba630f" as Address;
    const txs = encodeHyperlendSupply(asset, 1_000_000n, account);
    assert.equal(txs.length, 2);
    assert.equal(txs[0]?.to.toLowerCase(), asset.toLowerCase());
    const supply = decodeFunctionData({ abi: hyperlendPoolAbi, data: txs[1]!.data });
    assert.equal(supply.functionName, "supply");
    assert.equal(txs[1]?.to.toLowerCase(), HYPERLEND.pool.toLowerCase());
  });
});

describe("ERC-4626 deposit", () => {
  it("approves the vault then deposits", () => {
    const vault = "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27" as Address;
    const asset = "0xb88339cb7199b77e23db6e890353e22632ba630f" as Address;
    const txs = encodeErc4626Deposit(vault, asset, 1_000_000n, account);
    assert.equal(txs.length, 2);
    assert.equal(txs[1]?.to.toLowerCase(), vault.toLowerCase());
  });
});

describe("buildEntryPlan", () => {
  it("omits HyperLend calldata on testnet and keeps send off", () => {
    const plan = buildEntryPlan(opp({ id: "llama:hyperlend-pooled:usdc" }), { account });
    assert.equal(plan.txs.length, 0);
    assert.equal(plan.signNetwork, "testnet");
    assert.equal(plan.deepLink, "https://app.hyperlend.finance");
    assert.match(plan.amountLabel, /1 USDC/);
  });

  it("deep-links HyperCore and encodes CoreWriter supply", () => {
    const plan = buildEntryPlan(
      opp({
        id: "hypercore:lend:0",
        venue: "hypercore",
        layer: "core",
        assets: [{ symbol: "USDC (HyperCore)", id: "core:0" }],
        url: "https://app.hyperliquid.xyz",
      }),
      { account },
    );
    assert.equal(plan.deepLink, "https://app.hyperliquid-testnet.xyz");
    assert.equal(plan.txs.length, 1);
    assert.equal(plan.coreWeiDecimalsAssumed, 8);
    assert.ok(plan.steps.some((step) => step.detail.includes("not Circle USDC")));
  });

  it("omits Felix vault calldata on testnet", () => {
    const plan = buildEntryPlan(
      opp({
        id: "morpho:vault:0x8a862fd6c12f9ad34c9c2ff45ab2b6712e8cea27",
        venue: "felix",
        type: "vault",
        assets: [{ symbol: "USDC", id: "0xb88339cb7199b77e23db6e890353e22632ba630f" }],
      }),
      { account },
    );
    assert.equal(plan.txs.length, 0);
    assert.equal(plan.signNetwork, "testnet");
  });

  it("deep-links LPs without in-app mint calldata", () => {
    const plan = buildEntryPlan(
      opp({
        id: "llama:hyperswap-v3:pool",
        venue: "hyperswap",
        type: "lp",
        url: null,
        assets: [
          { symbol: "WHYPE", id: "0x5555555555555555555555555555555555555555" },
          { symbol: "USDC", id: "0xb88339cb7199b77e23db6e890353e22632ba630f" },
        ],
        ilClass: "volatile",
      }),
    );
    assert.equal(plan.txs.length, 0);
    assert.equal(plan.deepLink, "https://app.hyperswap.exchange");
  });
});
