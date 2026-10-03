import { type Address } from "viem";
import { evmClient } from "../chain";
import type { Opportunity } from "../types";

const erc4626Abi = [
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export async function verifyErc4626Vaults(opps: Opportunity[]): Promise<Opportunity[]> {
  const client = evmClient();
  const out: Opportunity[] = [];
  for (const opp of opps) {
    const match = opp.id.match(/^morpho:vault:(0x[a-fA-F0-9]{40})$/);
    if (!match?.[1]) {
      out.push(opp);
      continue;
    }
    try {
      const vault = match[1] as Address;
      const [totalAssets, asset] = await Promise.all([
        client.readContract({ address: vault, abi: erc4626Abi, functionName: "totalAssets" }),
        client.readContract({ address: vault, abi: erc4626Abi, functionName: "asset" }),
      ]);
      const risks = [...opp.risks];
      if (totalAssets === 0n) risks.push("vault-empty");
      const assets =
        opp.assets[0] && asset
          ? [{ ...opp.assets[0], id: asset.toLowerCase() }]
          : opp.assets;
      out.push({ ...opp, assets, verified: true, risks });
    } catch {
      out.push({
        ...opp,
        verified: false,
        risks: [...opp.risks, "onchain-verify-failed"],
      });
    }
  }
  return out;
}
