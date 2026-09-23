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
  it("encerra a oferta de bike preservada como draft cuja linha atual perdeu link/preço", () => {
    const valid = [bike({ id: "a" }), bike({ id: "b" })];
    const drafts = ["v29_pro", "v35", "x50_action_pro"].map((id) =>
      bike({ id, status: "draft", linkVitale: url, price: 3999 })
    );
    const pending = [
      { id: "v29_pro", missingFields: ["Link Vitale", "Preço R$"] },
      { id: "v35", missingFields: ["Link Vitale"] },
      { id: "x50_action_pro", missingFields: ["Preço R$"] },
    ];
    const rows = buildBikeOfferRows([...valid, ...drafts], pending);
    expect(rows).toHaveLength(5);
    const ended = rows.filter((r) => r.url === null && r.price === null);
    expect(ended.map((r) => r.bike_id).sort()).toEqual(["v29_pro", "v35", "x50_action_pro"]);
    for (const r of rows.filter((r) => ["a", "b"].includes(r.bike_id))) {
      expect(r.url).toBe(url);
      expect(r.price).toBe(4999.9);
      expect(r.sheet_eligible).toBe(false);
    }
  });
  it("não encerra oferta por pendência não comercial", () => {
    const [r] = buildBikeOfferRows([bike({ id: "c" })], [{ id: "c", missingFields: ["Autonomia"] }]);
    expect(r.url).toBe(url);
    expect(r.price).toBe(4999.9);
  });
  it("isolates RPC failure", async () => {
    const res = await projectBikeOffers({ rpc: async () => ({ data: null, error: { message: "x" } }) }, [bike({})]);
    expect(res).toEqual({ ok: false, error: "x" });
  });
});
