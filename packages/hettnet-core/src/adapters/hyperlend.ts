import { type Address } from "viem";
import { evmClient } from "../chain";
import { HYPERLEND } from "../constants";
import type { Opportunity } from "../types";

const protocolDataProviderAbi = [
  {
    name: "getReserveData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "unbacked", type: "uint256" },
      { name: "accruedToTreasuryScaled", type: "uint256" },
      { name: "totalAToken", type: "uint256" },
      { name: "totalStableDebt", type: "uint256" },
      { name: "totalVariableDebt", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "variableBorrowRate", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "averageStableBorrowRate", type: "uint256" },
      { name: "liquidityIndex", type: "uint256" },
      { name: "variableBorrowIndex", type: "uint256" },
      { name: "lastUpdateTimestamp", type: "uint40" },
    ],
  },
  {
    name: "getReserveConfigurationData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "decimals", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
      { name: "reserveFactor", type: "uint256" },
      { name: "usageAsCollateralEnabled", type: "bool" },
      { name: "borrowingEnabled", type: "bool" },
      { name: "stableBorrowRateEnabled", type: "bool" },
      { name: "isActive", type: "bool" },
      { name: "isFrozen", type: "bool" },
    ],
  },
] as const;

export async function verifyHyperLend(opps: Opportunity[]): Promise<Opportunity[]> {
  const client = evmClient();
  const seen = new Set<string>();
  const out: Opportunity[] = [];
  for (const opp of opps) {
    const asset = opp.assets[0]?.id;
    if (!asset || !asset.startsWith("0x") || seen.has(asset.toLowerCase())) {
      out.push(opp);
      continue;
    }
    seen.add(asset.toLowerCase());
    try {
      const address = asset as Address;
      const [data, config] = await Promise.all([
        client.readContract({
          address: HYPERLEND.protocolDataProvider as Address,
          abi: protocolDataProviderAbi,
          functionName: "getReserveData",
          args: [address],
        }),
        client.readContract({
          address: HYPERLEND.protocolDataProvider as Address,
          abi: protocolDataProviderAbi,
          functionName: "getReserveConfigurationData",
          args: [address],
        }),
      ]);
      const totalAToken = data[2];
      const totalVariableDebt = data[4];
      const supply = totalAToken + totalVariableDebt;
      const utilization = supply > 0n ? Number(totalVariableDebt) / Number(supply) : 0;
      const paused = !config[8] || config[9];
      out.push({
        ...opp,
        utilization: Number.isFinite(utilization) ? utilization : opp.utilization,
        paused,
        verified: true,
        risks: paused ? [...opp.risks, "reserve-paused-or-frozen"] : opp.risks,
      });
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
