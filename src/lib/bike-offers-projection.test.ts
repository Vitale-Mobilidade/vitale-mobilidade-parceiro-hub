import { describe, expect, it } from "vitest";
import { buildBikeOfferRows, projectBikeOffers } from "../../supabase/functions/_shared/bike-projection";
import type { SnapshotBike } from "../../supabase/functions/_shared/bike-sheet";

const url = "https://meli.la/2AbC9xY?x=1&y=%20";
const bike = (o: Partial<SnapshotBike>): SnapshotBike =>
  ({ id: "v8_ultra", name: "V8", linkVitale: url, price: 4999.9, status: "eligible", sheetEligible: false, ...o }) as SnapshotBike;

describe("offers projection rows", () => {
  it("keeps URL byte-identical and price+link in the same row", () => {
    const [r] = buildBikeOfferRows([bike({})]);
    expect(r).toEqual({ bike_id: "v8_ultra", url, price: 4999.9, sheet_status: "eligible", sheet_eligible: false });
  });
  it("passes invalid price/link as null so the DB ends the current offer", () => {
    const [r] = buildBikeOfferRows([bike({ price: NaN, linkVitale: undefined as unknown as string, sheetEligible: null })]);
    expect(r.price).toBeNull();
    expect(r.url).toBeNull();
    expect(r.sheet_eligible).toBeNull();
  });
  it("isolates RPC failure", async () => {
    const res = await projectBikeOffers({ rpc: async () => ({ data: null, error: { message: "x" } }) }, [bike({})]);
    expect(res).toEqual({ ok: false, error: "x" });
  });
});
