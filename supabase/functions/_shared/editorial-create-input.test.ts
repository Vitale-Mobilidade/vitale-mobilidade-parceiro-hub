import { describe, it, expect } from "vitest";
import { automaticCreationBikeIds, parseCreationBikeIds } from "./editorial-create-input";
describe("automatic article bike selection", () => {
  const sheet = { bikeIds: ["v40_pro", "ft03", "gt20"], unmatched: [] };
  it("manual choice overrides sheet, including unmatched aliases", () => {
    expect(automaticCreationBikeIds(["ft03"], { ...sheet, unmatched: ["OuXi GT 20"] })).toEqual(["ft03"]);
  });
  it("blank selection uses a complete sheet", () => {
    expect(automaticCreationBikeIds([], sheet)).toEqual(sheet.bikeIds);
    expect(automaticCreationBikeIds(undefined, sheet)).toEqual(sheet.bikeIds);
  });
  it("incomplete or empty sheet defers to title/transcript detection", () => {
    expect(automaticCreationBikeIds(undefined, { ...sheet, unmatched: ["OuXi GT 20"] })).toBeUndefined();
    expect(automaticCreationBikeIds([], { bikeIds: [], unmatched: [] })).toBeUndefined();
    expect(automaticCreationBikeIds([], { bikeIds: Array(8).fill("ft03"), unmatched: [] })).toBeUndefined();
  });
  it("manual ids must exist in catalog and preserve first bike as primary", () => {
    expect(parseCreationBikeIds(["ft03", "v40_pro", "ft03"], new Set(sheet.bikeIds))).toEqual(["ft03", "v40_pro"]);
    expect(() => parseCreationBikeIds(["inventada"], new Set(sheet.bikeIds))).toThrow("válidas");
  });
});
