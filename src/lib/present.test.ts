import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvCell, formatAmount, freshnessLabel, formatSignedBps, oracleAgeSeconds, pegReading, riskVerdict } from "./present";
import type { DashboardPayload } from "../types/dashboard";

type RiskInput = Pick<DashboardPayload, "generatedAt" | "risk">;

describe("present", () => {
  it("does not turn a missing gap into a number", () => {
    assert.equal(formatSignedBps(null), "Not comparable");
  });

  it("prints an amount with its unit", () => {
    assert.match(formatAmount(1000, "USDC"), /1,000(\.00)? USDC/);
    assert.equal(formatAmount(null, "SOL"), "—");
  });

  it("neutralizes spreadsheet formulas", () => {
    assert.equal(csvCell("=cmd"), "'=cmd");
    assert.equal(csvCell("+1"), "'+1");
    assert.equal(csvCell("-1"), "'-1");
    assert.equal(csvCell("@sum"), "'@sum");
  });

  it("flags a clock that is ahead of the reading", () => {
    const now = 1_700_000_000_000;
    assert.equal(freshnessLabel(now + 60_000, now), "Clock is ahead of this reading");
  });

  it("calls a fresh peg Clear and an aged print Caution on both screens", () => {
    const generatedAt = 1_700_000_074_000;
    const base = {
      generatedAt,
      risk: {
        status: "SCANNING" as const,
        circuitHold: false,
        reasons: [],
        peg: [
          {
            symbol: "USDC_USD",
            priceId: "abc",
            price: 1,
            target: 1,
            deviationBps: 0,
            maxDeviationBps: 50,
            confidenceBps: 4,
            publishTime: 1_700_000_070,
            healthy: true,
          },
        ],
        volatility: [],
        oracleStale: false,
        evaluatedAt: 1_700_000_010_000,
        holdChangedAt: 1_700_000_010_000,
        thresholds: { pegMaxBps: 50, volMaxBps: 150, confMaxBps: 50, oracleMaxAgeSec: 15 },
      },
    } satisfies RiskInput;
    assert.equal(oracleAgeSeconds(generatedAt, 1_700_000_070), 4);
    assert.deepEqual(pegReading(true, 4, 15), { tone: "ok", label: "Inside band" });
    assert.equal(riskVerdict(base).word, "Clear");

    const aged = structuredClone(base);
    aged.risk!.peg[0]!.publishTime = 1_700_000_000;
    assert.equal(oracleAgeSeconds(generatedAt, 1_700_000_000), 74);
    assert.equal(pegReading(true, 74, 15).label, "Stale print");
    assert.equal(riskVerdict(aged).word, "Caution");
    assert.match(riskVerdict(aged).reason, /older than 15s/);
  });

  it("uses kink-proximity alerts when Hyperliquid signals are present", () => {
    const verdict = riskVerdict({
      generatedAt: 1_700_000_000_000,
      risk: null,
      alerts: [
        {
          kind: "kink-proximity",
          opportunityId: "hypercore:lend:0",
          symbol: "USDC (HyperCore)",
          venue: "hypercore",
          message: "Utilization is within 5pp of the 80% kink.",
        },
      ],
    });
    assert.equal(verdict.word, "Caution");
    assert.match(verdict.reason, /kink/);
  });

  it("calls a scan with no alerts Clear", () => {
    const verdict = riskVerdict({ generatedAt: 1, risk: null, alerts: [] });
    assert.equal(verdict.word, "Clear");
    assert.match(verdict.reason, /No kink-proximity/);
  });
});
