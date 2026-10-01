import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { gapStatusLabel } from "../../engine/classify";
import { EmptyState, StatusDot } from "./kit";

describe("status states", () => {
  it("maps every gap status to the user label", () => {
    assert.equal(gapStatusLabel("above"), "Above trigger");
    assert.equal(gapStatusLabel("below"), "Below trigger");
    assert.equal(gapStatusLabel("no-pool"), "Not comparable");
    assert.equal(gapStatusLabel("suspect"), "Check data");
    assert.equal(gapStatusLabel("error"), "Check data");
  });

  it("renders each status with text", () => {
    for (const label of ["Above trigger", "Below trigger", "Not comparable", "Check data"]) {
      const html = renderToStaticMarkup(<StatusDot tone="idle" label={label} />);
      assert.match(html, new RegExp(label));
    }
  });

  it("renders the empty ledger", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No simulated action yet" body="An entry appears after a check." />,
    );
    assert.match(html, /No simulated action yet/);
    assert.match(html, /An entry appears after a check/);
  });
});
