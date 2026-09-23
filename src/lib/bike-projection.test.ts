import { describe, expect, it } from "vitest";
import { buildBikeProjectionRows, projectBikes } from "../../supabase/functions/_shared/bike-projection";
import type { SnapshotBike } from "../../supabase/functions/_shared/bike-sheet";

const bike = (o: Partial<SnapshotBike>): SnapshotBike =>
  ({ id: "v8_ultra", name: "V8 Ultra", autonomyKm: 50, capacity: 2, price: 999, link: "https://meli.la/x", ...o }) as SnapshotBike;

describe("bikes projection", () => {
  it("projects only identity + validated specs, no commercial fields", () => {
    const rows = buildBikeProjectionRows([bike({}), bike({ id: "x", name: " X ", autonomyKm: NaN as unknown as number, capacity: 3 as unknown as 1 })]);
    expect(rows).toEqual([
      { bike_id: "v8_ultra", name: "V8 Ultra", autonomy_km: 50, capacity_people: 2, image_url: null, description: null, short_description: null, category: null, autonomy_label: null, capacity_label: null },
      { bike_id: "x", name: "X", autonomy_km: null, capacity_people: null, image_url: null, description: null, short_description: null, category: null, autonomy_label: null, capacity_label: null },
    ]);
    for (const r of rows) for (const k of ["price", "link", "eligible", "slug"]) expect(r).not.toHaveProperty(k);
  });
  it("projects editorial fields only when present and valid", () => {
    const [ok] = buildBikeProjectionRows([bike({ image: "https://cdn.x/a.webp", description: " Desc longa ", shortDescription: "Curta" })]);
    expect(ok).toMatchObject({ image_url: "https://cdn.x/a.webp", description: "Desc longa", short_description: "Curta" });
    const [bad] = buildBikeProjectionRows([bike({ image: "http://cdn.x/a.webp", description: "  ", shortDescription: undefined })]);
    expect(bad).toMatchObject({ image_url: null, description: null, short_description: null });
  });
  it("keeps bike_id literal and dedupes", () => {
    const rows = buildBikeProjectionRows([bike({ id: "v9_max_20ah" }), bike({ id: "v9_max_20ah", name: "dup" })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].bike_id).toBe("v9_max_20ah");
  });
  it("isolates RPC failure and thrown errors", async () => {
    const err = await projectBikes({ rpc: async () => ({ data: null, error: { message: "boom" } }) }, [bike({})]);
    expect(err).toEqual({ ok: false, error: "boom" });
    const thrown = await projectBikes({ rpc: () => { throw new Error("net"); } }, [bike({})]);
    expect(thrown.ok).toBe(false);
  });
});
