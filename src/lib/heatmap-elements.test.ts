import { describe, it, expect } from "vitest";
import {
  ELEMENT_LAYOUT,
  validateElementBatch,
} from "../../supabase/functions/_shared/heatmap-elements";
const batch = {
  event: "heatmap_elements",
  path: "/radar",
  screen: "mobile",
  viewport: 390,
  layout: ELEMENT_LAYOUT,
  bins: [{ kind: "click", target: "h:1234abcd:0", x: 25, y: 50, count: 1 }],
};
describe("precise element contract", () => {
  it("accepts only relative coordinates, public paths, exact viewport and technical identifiers", () => {
    expect(validateElementBatch(batch)).toEqual(batch);
    for (const v of [
      { ...batch, path: null },
      { ...batch, viewport: 1440 },
      { ...batch, path: "/admin" },
      { ...batch, layout: "2026-10-v1" },
      { ...batch, text: "private" },
      { ...batch, viewport: 390.5 },
    ])
      expect(validateElementBatch(v)).toBeNull();
    for (const v of [
      { ...batch.bins[0], x: 100 },
      { ...batch.bins[0], target: "input[email]" },
      { ...batch.bins[0], text: "private" },
      { ...batch.bins[0], target: "https://secret.test?a=b" },
    ])
      expect(validateElementBatch({ ...batch, bins: [v] })).toBeNull();
  });
  it("does not mix legacy counts or duplicate bins", () => {
    expect(validateElementBatch({ ...batch, event: "heatmap" })).toBeNull();
    expect(
      validateElementBatch({ ...batch, bins: [batch.bins[0], batch.bins[0]] }),
    ).toBeNull();
  });
});
