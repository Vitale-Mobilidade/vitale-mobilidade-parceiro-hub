import { afterEach, expect, it, vi } from "vitest";
import { fetchPublicBikeListings } from "./bike-classifieds-repository.server";
import { publicBikeImage } from "./bike-classifieds-media.server";
import { listingInputSchema } from "./bike-classifieds";
const id = "00000000-0000-4000-8000-000000000090";
const listing = {
  id,
  title: "Bike de teste",
  brand: "Marca",
  model: "Modelo",
  priceCents: 150000,
  city: "São Paulo",
  state: "SP",
  modelYear: 2025,
  mileageKm: 200,
  condition: "good",
  battery: "original",
  invoice: true,
  description: "Descrição suficiente para um teste local.",
  maintenance: "",
  status: "published",
  feeCents: 15000,
  feeStatus: "pilot_exempt",
  publishedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  images: [
    {
      id,
      path: `${id}/listings/${id}/${id}.webp`,
      position: 0,
      status: "ready",
    },
  ],
  sellerName: "Piloto",
  whatsapp: "5511999999999",
  avatarPath: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function env() {
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "NEVER_USE_PRIVATE_KEY");
}
it("SSR requests only public projection with public key and stable media URL", async () => {
  env();
  const fetcher = vi.fn(async (input: unknown, init?: RequestInit) => {
    expect(String(input)).toContain("/rpc/member_bike_listings_public");
    expect(JSON.stringify(init)).not.toContain("NEVER_USE_PRIVATE_KEY");
    expect(new Headers(init?.headers).get("apikey")).toBe("public-test");
    return Response.json({ total: 1, items: [listing] });
  });
  vi.stubGlobal("fetch", fetcher);
  const result = await fetchPublicBikeListings();
  expect(result.ok).toBe(true);
  expect(result.items[0].images[0].url).toBe(`/api/public/bike-image?id=${id}`);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("public loader reports backend error separately from an empty listing", async () => {
  env();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ message: "missing RPC" }, { status: 404 }),
    ),
  );
  expect((await fetchPublicBikeListings()).ok).toBe(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ total: 0, items: [] })),
  );
  expect(await fetchPublicBikeListings()).toEqual({
    ok: true,
    total: 0,
    items: [],
  });
});
it("media rejects invalid ID before any request and absent public asset without storage access", async () => {
  env();
  const fetcher = vi.fn(async () => Response.json(null));
  vi.stubGlobal("fetch", fetcher);
  expect((await publicBikeImage("../../private")).status).toBe(404);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await publicBikeImage(id)).status).toBe(404);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("media serves only bounded WebP, with no store and no sniffing", async () => {
  env();
  let invalid = false;
  const fetcher = vi.fn(async (input: unknown) =>
    String(input).includes("/rpc/")
      ? Response.json(listing.images[0].path)
      : new Response(
          invalid ? "<svg onload=alert(1)>" : "RIFF0000WEBPsynthetic",
          { headers: { "content-type": "image/webp" } },
        ),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await publicBikeImage(id);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  invalid = true;
  expect((await publicBikeImage(id)).status).toBe(404);
});
it("rejects malicious contact input, invalid field ranges and overlong descriptions", () => {
  expect(listingInputSchema.safeParse(listing).success).toBe(true);
  for (const patch of [
    { state: "XX" },
    { priceCents: -1 },
    { mileageKm: 1.5 },
    { title: "x\u0000abcde" },
    { description: "x".repeat(4001) },
  ])
    expect(listingInputSchema.safeParse({ ...listing, ...patch }).success).toBe(
      false,
    );
});
