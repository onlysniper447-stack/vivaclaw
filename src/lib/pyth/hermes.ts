import { HermesClient } from "@pythnetwork/hermes-client";
import { getServerEnv } from "@/lib/env";
import { PYTH_PRICE_IDS } from "@/lib/constants";

export const PYTH_KEY_SIGNUP_URL = "https://pythdata.app/signup";

export interface HermesPricePrint {
  symbol: string;
  priceId: string;
  price: number;
  confidence: number;
  expo: number;
  publishTime: number;
  ema: number;
}

function toNumber(price: string, expo: number): number {
  return Number(price) * 10 ** expo;
}

export function hermesBaseUrl(): string {
  return getServerEnv().PYTH_HERMES_URL.replace(/\/$/, "");
}

export function createHermesClient(): HermesClient {
  const env = getServerEnv();
  const token = env.PYTH_API_KEY.trim();
  return new HermesClient(hermesBaseUrl(), {
    timeout: 8_000,
    httpRetries: 0,
    ...(token ? { accessToken: token } : {}),
  });
}

export function describeHermesAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const unauthorized = /\b401\b/.test(message) || /unauthorized/i.test(message);
  const missingKey = !getServerEnv().PYTH_API_KEY.trim();
  if (unauthorized) {
    return (
      `Pyth Hermes HTTP 401 Unauthorized at ${hermesBaseUrl()}/v2/updates/price/latest. ` +
      `Since 2026-08-26 this endpoint requires a Pyth API key. ` +
      `Set PYTH_API_KEY (sent as Authorization: Bearer) from ${PYTH_KEY_SIGNUP_URL}. ` +
      `CIRCUIT_HOLD stays engaged until a valid authenticated print is received.`
    );
  }
  if (missingKey) {
    return (
      `Pyth Hermes unavailable (${hermesBaseUrl()}): ${message}. ` +
      `PYTH_API_KEY is unset; Hermes requires a key from ${PYTH_KEY_SIGNUP_URL}.`
    );
  }
  return `Pyth Hermes unavailable (${hermesBaseUrl()}): ${message}`;
}

export async function fetchHermesPricePrints(
  ids: readonly string[] = Object.values(PYTH_PRICE_IDS),
): Promise<HermesPricePrint[]> {
  const updates = await createHermesClient().getLatestPriceUpdates([...ids], {
    parsed: true,
    encoding: "hex",
  });
  const parsed = updates.parsed ?? [];
  return parsed.map((feed) => {
    const symbol =
      Object.entries(PYTH_PRICE_IDS).find(
        ([, id]) => id === `0x${feed.id}` || id === feed.id || id.replace(/^0x/, "") === feed.id.replace(/^0x/, ""),
      )?.[0] ?? feed.id;
    return {
      symbol,
      priceId: feed.id,
      price: toNumber(feed.price.price, feed.price.expo),
      confidence: toNumber(feed.price.conf, feed.price.expo),
      expo: feed.price.expo,
      publishTime: feed.price.publish_time,
      ema: toNumber(feed.ema_price.price, feed.ema_price.expo),
    };
  });
}
