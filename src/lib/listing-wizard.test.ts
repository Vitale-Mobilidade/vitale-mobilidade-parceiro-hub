import { describe, it, expect } from "vitest";
import { listingWithTitle, missingListingFields } from "./bike-classifieds";
const bike = {
  title: "Minha bike",
  brand: "OuXi",
  model: "V8 Pro",
  priceCents: 600000,
  city: "São Paulo",
  state: "SP",
  modelYear: 2025,
  mileageKm: 384,
  condition: "excellent",
  battery: "original",
  invoice: true,
  description: "Bike usada em excelente estado, com revisão em dia.",
  maintenance: "",
};
describe("listing wizard readiness", () => {
  it("uses the actual make/model when the title is absent or provisional", () => {
    expect(listingWithTitle(bike).title).toBe("OuXi V8 Pro");
    expect(listingWithTitle({ ...bike, title: " " }).title).toBe("OuXi V8 Pro");
    expect(missingListingFields(listingWithTitle(bike))).toEqual([]);
  });
  it("preserves a custom title and never fabricates description or other facts", () => {
    const custom = { ...bike, title: "Minha OuXi revisada", description: "" };
    expect(listingWithTitle(custom).title).toBe(custom.title);
    expect(listingWithTitle(custom).description).toBe("");
    expect(missingListingFields(listingWithTitle(custom))).toEqual([
      "description",
    ]);
  });
  it("reports individual incomplete fields instead of a false payment outage", () => {
    expect(
      missingListingFields({
        ...bike,
        title: "Minha bike",
        description: "Curta",
        mileageKm: null,
      }),
    ).toEqual(["title", "mileageKm", "description"]);
  });
});
