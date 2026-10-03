import assert from "node:assert/strict";
import { describe, it } from "node:test";

const paths = [
  "/",
  "/dashboard",
  "/dashboard?tab=yield",
  "/dashboard?tab=risk",
  "/dashboard?tab=execution",
  "/dashboard?tab=activity",
  "/dashboard?tab=wallet",
  "/api/health",
];

async function findBase(): Promise<string | null> {
  const candidates = [
    process.env.SMOKE_BASE,
    "http://127.0.0.1:3005",
    "http://127.0.0.1:3000",
  ].filter((value): value is string => Boolean(value));
  for (const base of candidates) {
    try {
      const probe = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (!probe.ok) continue;
      const body = (await probe.json()) as { service?: string };
      if (body.service === "hettnet") return base;
    } catch {
      continue;
    }
  }
  return null;
}

describe("routes", () => {
  it("loads the homepage, each console tab, and health", async (t) => {
    const base = await findBase();
    if (!base) {
      t.skip("console is not running");
      return;
    }
    for (const path of paths) {
      const res: Response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(12_000) });
      assert.equal(res.status, 200, path);
      const html = await res.text();
      assert.equal(html.includes("AGENT_PRIVATE_KEY"), false, path);
      assert.equal(/BEGIN PRIVATE/.test(html), false, path);
    }
  });
});
