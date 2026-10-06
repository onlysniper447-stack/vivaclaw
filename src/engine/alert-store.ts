import { singleton } from "@/engine/singleton";
import type { Indication, VenueSlug } from "hettnet-core";

export interface AlertRule {
  id: string;
  name: string;
  venue: VenueSlug | null;
  indication: Indication | null;
  asset: string | null;
  minApy: number | null;
  minTvl: number | null;
  webhookUrl: string | null;
  createdAt: number;
}

const live = singleton("hettnet.alerts", () => ({
  rules: [] as AlertRule[],
  seq: 0,
}));

export function createAlertRule(input: {
  name?: string;
  venue?: VenueSlug | null;
  indication?: Indication | null;
  asset?: string | null;
  minApy?: number | null;
  minTvl?: number | null;
  webhookUrl?: string | null;
}): AlertRule {
  live.seq += 1;
  const rule: AlertRule = {
    id: `alert:${live.seq}`,
    name: input.name?.trim() || `Rule ${live.seq}`,
    venue: input.venue ?? null,
    indication: input.indication ?? null,
    asset: input.asset?.trim() || null,
    minApy: input.minApy ?? null,
    minTvl: input.minTvl ?? null,
    webhookUrl: input.webhookUrl?.trim() || null,
    createdAt: Date.now(),
  };
  live.rules.push(rule);
  return rule;
}

export function listAlertRules(): AlertRule[] {
  return [...live.rules];
}
