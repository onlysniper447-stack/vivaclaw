import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { retry } from "./retry";

describe("retry", () => {
  it("does not retry a noRetry error", async () => {
    let attempts = 0;
    const err = Object.assign(new Error("HTTP 404"), { noRetry: true });
    await assert.rejects(async () => {
      await retry(async () => {
        attempts += 1;
        throw err;
      });
    }, /HTTP 404/);
    assert.equal(attempts, 1);
  });

  it("retries a normal error then succeeds", async () => {
    let attempts = 0;
    const value = await retry(async () => {
      attempts += 1;
      if (attempts < 2) throw new Error("flaky");
      return 7;
    });
    assert.equal(value, 7);
    assert.equal(attempts, 2);
  });
});
