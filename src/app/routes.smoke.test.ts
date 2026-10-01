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

describe("routes", () => {
  it("loads the homepage, each console tab, and health", async (t) => {
    const base = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";
    let probe: Response;
    try {
      probe = await fetch(base, { signal: AbortSignal.timeout(2500) });
    } catch {
      t.skip("console is not running");
      return;
    }
    assert.equal(probe.status, 200);
    for (const path of paths.slice(1)) {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
      assert.equal(res.status, 200, path);
      const html = await res.text();
      assert.equal(html.toLowerCase().includes("private key"), false);
    }
  });
});
