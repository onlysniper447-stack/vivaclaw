import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const banned =
  /@solana|solana\/web3|kamino-finance|meteora-ag|@jup-ag|pythnetwork|PublicKey|solscan|jito|mainnet-beta|solflare|from ["']@\/lib\/solana|from ["']@\/engine\/YieldSensor|from ["']@\/engine\/ExecutionRouter|from ["']@\/engine\/RiskEngine/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === "node_modules") continue;
      out.push(...walk(path));
      continue;
    }
    if (/\.(ts|tsx|mjs|json|md|example)$/.test(name)) out.push(path);
  }
  return out;
}

describe("Hettnet live source", () => {
  it("does not load Solana SDKs or Solana venue names", () => {
    const hits: string[] = [];
    for (const file of walk(root)) {
      if (file.endsWith("hettnet-source.test.ts")) continue;
      const src = readFileSync(file, "utf8");
      if (banned.test(src)) hits.push(file.replace(`${root}\\`, "").replace(`${root}/`, ""));
    }
    assert.deepEqual(hits, []);
  });
});
