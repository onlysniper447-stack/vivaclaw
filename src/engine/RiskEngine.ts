import { singleton } from "@/engine/singleton";
import { getServerEnv } from "@/lib/env";
import { PYTH_PRICE_IDS } from "@/lib/constants";
import { describeHermesAuthError, fetchHermesPricePrints } from "@/lib/pyth/hermes";
import { logError, logWarn, logInfo } from "@/engine/logger";
import type {
  AgentStatus,
  PegCheck,
  RiskReport,
  VolatilityCheck,
} from "@/types/hettnet";

const PEG_TARGET = 1;
const DEFAULT_CONF_BPS = 50; // confidence band vs spot
const PRICE_WINDOW = 16;

type PegSymbol = "USDC_USD" | "USDT_USD" | "SOL_USD";

const PEGGED: PegSymbol[] = ["USDC_USD", "USDT_USD"];
const VOLATILE: PegSymbol[] = ["USDC_USD", "USDT_USD", "SOL_USD"];

interface Tick {
  symbol: PegSymbol;
  price: number;
  ema: number;
  conf: number;
  publishTime: number;
  ts: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function bps(numer: number, denom: number): number {
  if (denom === 0) return Number.POSITIVE_INFINITY;
  return Math.round(Math.abs(numer / denom) * 10_000);
}

function stdevBps(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (mean === 0) return 0;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (samples.length - 1);
  return Math.round((Math.sqrt(variance) / Math.abs(mean)) * 10_000);
}

export class RiskEngine {
  private history = new Map<PegSymbol, Tick[]>();
  private lastReport: RiskReport | null = null;
  private lastHold: boolean | null = null;
  private lastHoldChangeAt: number | null = null;

  getLastReport(): RiskReport | null {
    return this.lastReport;
  }

  async evaluate(): Promise<RiskReport> {
    const env = getServerEnv();
    const maxPegBps = env.PEG_MAX_DEVIATION_BPS;
    const maxVolBps = env.VOLATILITY_MAX_BPS;
    const maxConfBps = envInt("ORACLE_MAX_CONFIDENCE_BPS", DEFAULT_CONF_BPS);
    const maxAgeSec = Math.max(1, Math.floor(env.ORACLE_MAX_STALENESS_MS / 1_000));

    const reasons: string[] = [];
    const peg: PegCheck[] = [];
    const volatility: VolatilityCheck[] = [];
    let oracleStale = false;

    try {
      const prints = await fetchHermesPricePrints(Object.values(PYTH_PRICE_IDS));
      const now = Date.now();

      for (const print of prints) {
        const symbol = this.resolveSymbol(print.priceId);
        if (!symbol) continue;

        const price = print.price;
        const conf = print.confidence;
        const ema = print.ema;
        const publishMs = print.publishTime * 1000;
        const ageSec = (now - publishMs) / 1000;
        const stale = ageSec > maxAgeSec;
        if (stale) oracleStale = true;
        if (price <= 0) {
          reasons.push(`${symbol} Pyth price is non-positive`);
          continue;
        }

        const tick: Tick = { symbol, price, ema, conf, publishTime: print.publishTime, ts: now };
        this.pushTick(symbol, tick);

        const confidenceBps = bps(conf, price);
        const emaDeviationBps = bps(price - ema, ema || price);
        const realizedVolBps = stdevBps((this.history.get(symbol) ?? []).map((t) => t.price));
        const extreme =
          emaDeviationBps > maxVolBps ||
          confidenceBps > maxConfBps ||
          realizedVolBps > maxVolBps;

        if (VOLATILE.includes(symbol)) {
          volatility.push({
            symbol,
            ema,
            emaDeviationBps,
            confidenceBps,
            realizedVolBps,
            extreme,
            maxVolBps,
            maxConfBps,
          });
          if (extreme) {
            reasons.push(
              `${symbol} extreme volatility (emaΔ ${emaDeviationBps} bps, conf ${confidenceBps} bps, σ ${realizedVolBps} bps)`,
            );
          }
        }

        if (PEGGED.includes(symbol)) {
          const deviationBps = bps(price - PEG_TARGET, PEG_TARGET);
          const healthy = deviationBps <= maxPegBps && !stale && price > 0;
          peg.push({
            symbol,
            priceId: print.priceId,
            price,
            target: PEG_TARGET,
            deviationBps,
            maxDeviationBps: maxPegBps,
            confidenceBps,
            publishTime: print.publishTime,
            healthy,
          });
          if (!healthy) {
            reasons.push(
              stale && deviationBps <= maxPegBps
                ? `${symbol} Pyth print is ${Math.round(ageSec)}s old (limit ${maxAgeSec}s)`
                : `${symbol} de-peg: ${price.toFixed(6)} vs ${PEG_TARGET.toFixed(2)} (${deviationBps} bps > ${maxPegBps} bps)`,
            );
          }
        }
      }
    } catch (error) {
      oracleStale = true;
      reasons.push(describeHermesAuthError(error));
      logError("CIRCUIT_HOLD", reasons.at(-1) ?? "pyth error");
    }

    const alreadyExplained =
      reasons.some((reason) => reason.startsWith("Pyth Hermes")) ||
      reasons.some((reason) => /Pyth print is \d+s old/i.test(reason));
    if (oracleStale && !alreadyExplained) {
      reasons.push("Pyth print exceeds ORACLE_MAX_STALENESS_MS");
    }
    if (peg.length === 0 && !reasons.some((r) => r.startsWith("Pyth Hermes"))) {
      reasons.push("No USDC/USDT Pyth peg prints returned");
    }

    const circuitHold = reasons.length > 0;
    const evaluatedAt = Date.now();
    if (this.lastHold !== circuitHold || this.lastHoldChangeAt === null) {
      this.lastHold = circuitHold;
      this.lastHoldChangeAt = evaluatedAt;
    }
    const status: AgentStatus = circuitHold ? "CIRCUIT_HOLD" : "SCANNING";
    const report: RiskReport = {
      status,
      circuitHold,
      reasons,
      peg,
      volatility,
      oracleStale,
      evaluatedAt,
      holdChangedAt: this.lastHoldChangeAt,
      thresholds: {
        pegMaxBps: maxPegBps,
        volMaxBps: maxVolBps,
        confMaxBps: maxConfBps,
        oracleMaxAgeSec: maxAgeSec,
      },
    };
    this.lastReport = report;

    if (circuitHold) {
      logWarn("CIRCUIT_HOLD", `Circuit hold — ${reasons.join("; ")}`, { data: { peg, volatility } });
    } else {
      logInfo("SCANNING", "Pyth Hermes peg + volatility checks cleared", {
        data: { peg, volatility },
      });
    }

    return report;
  }

  isHeld(): boolean {
    return this.lastReport?.circuitHold === true;
  }

  private resolveSymbol(feedId: string): PegSymbol | null {
    const normalized = feedId.startsWith("0x") ? feedId : `0x${feedId}`;
    for (const [symbol, id] of Object.entries(PYTH_PRICE_IDS) as [PegSymbol, string][]) {
      if (id === normalized || id === feedId || id.replace(/^0x/, "") === feedId.replace(/^0x/, "")) {
        return symbol;
      }
    }
    return null;
  }

  private pushTick(symbol: PegSymbol, tick: Tick): void {
    const series = this.history.get(symbol) ?? [];
    series.push(tick);
    if (series.length > PRICE_WINDOW) series.splice(0, series.length - PRICE_WINDOW);
    this.history.set(symbol, series);
  }
}

export const riskEngine = singleton("riskEngine", () => new RiskEngine());
