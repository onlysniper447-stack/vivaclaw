import type { Indication } from "hettnet-core";

export type YieldPlanRow = {
  indication: Indication;
  quality: "ok" | "suspect" | "missing";
  apyBps: number | null;
};

export type PlanColumnAction = "open" | "enter" | "none";

export function canEnterYield(row: YieldPlanRow): boolean {
  return row.indication !== "AVOID" && row.quality === "ok" && row.apyBps !== null && row.apyBps > 0;
}

/** Plan column never offers ENTER on an AVOID indication. */
export function planColumnAction(row: YieldPlanRow, alreadyOpen: boolean): PlanColumnAction {
  if (row.indication === "AVOID") return alreadyOpen ? "open" : "none";
  if (alreadyOpen) return "open";
  return "enter";
}
