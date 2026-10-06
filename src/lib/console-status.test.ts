import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSOLE_STATUS_CHIPS } from "./console-status";

describe("console status chips", () => {
  it("does not show a Dry run chip; Testnet is the live lock", () => {
    const labels = CONSOLE_STATUS_CHIPS.map((chip) => chip.label);
    assert.deepEqual(labels, ["Testnet"]);
    assert.equal(
      labels.some((label) => label.toLowerCase() === "dry run"),
      false,
    );
  });
});
