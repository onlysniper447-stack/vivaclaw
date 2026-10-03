import type { OraclePrice, YieldOpportunity } from "@/types";
import { scanKaminoYields } from "./kamino";
import { scanMeteoraVaults } from "./meteora";
import { scanJupiterArb } from "./jupiter";
import { fetchOraclePrices } from "./pyth";

export interface SensorBundle {
  opportunities: YieldOpportunity[];
  oracles: OraclePrice[];
  errors: string[];
}

export async function runYieldSensors(): Promise<SensorBundle> {
  const errors: string[] = [];

  const [kamino, meteora, jupiter, oracles] = await Promise.allSettled([
    scanKaminoYields(),
    scanMeteoraVaults(),
    scanJupiterArb(),
    fetchOraclePrices(),
  ]);

  const opportunities: YieldOpportunity[] = [];

  if (kamino.status === "fulfilled") opportunities.push(...kamino.value);
  else errors.push(`kamino: ${String(kamino.reason)}`);

  if (meteora.status === "fulfilled") opportunities.push(...meteora.value);
  else errors.push(`meteora: ${String(meteora.reason)}`);

  if (jupiter.status === "fulfilled") opportunities.push(...jupiter.value);
  else errors.push(`jupiter: ${String(jupiter.reason)}`);

  const oraclePrices = oracles.status === "fulfilled" ? oracles.value : [];
  if (oracles.status === "rejected") errors.push(`pyth: ${String(oracles.reason)}`);

  opportunities.sort((a, b) => (b.netApyBps ?? -1) - (a.netApyBps ?? -1));

  return { opportunities, oracles: oraclePrices, errors };
}

export { scanKaminoYields, scanMeteoraVaults, scanJupiterArb, fetchOraclePrices };
