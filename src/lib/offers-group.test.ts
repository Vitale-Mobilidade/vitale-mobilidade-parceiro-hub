import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OFFERS_GROUP_DESTINATION,
  validOffersGroupUrl,
} from "./offers-group";
import { fetchOffersGroupDestination } from "./offers-group-repository.server";
import server from "../server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function mockRead(body: unknown, status = 200) {
  vi.stubEnv("SUPABASE_URL", "https://db.example");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
  return vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}
describe("offers invitation", () => {
  it("accepts the requested invitation with optional mode", () => {
    expect(validOffersGroupUrl(DEFAULT_OFFERS_GROUP_DESTINATION)).toBe(true);
    expect(
      validOffersGroupUrl(DEFAULT_OFFERS_GROUP_DESTINATION.split("?")[0]),
    ).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "https://chat.whatsapp.com.evil.test/B69yQkILBc63Nq3x62iQjH",
    "https://user@chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH",
    "http://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH",
    DEFAULT_OFFERS_GROUP_DESTINATION + "&next=evil",
    DEFAULT_OFFERS_GROUP_DESTINATION + "\n",
    null,
  ])("rejects unsafe invitation %s", (value) => {
    expect(validOffersGroupUrl(value)).toBe(false);
  });
  it("reads saved destination without a privileged key", async () => {
    const url = "https://chat.whatsapp.com/DnYGmcdvGiN4GtWLaEreft";
    mockRead([{ url }]);
    expect(await fetchOffersGroupDestination()).toBe(url);
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ apikey: "public-key" }),
    );
  });
  it.each([
    [[], 200],
    [[{ url: "https://evil.test" }], 200],
    [null, 503],
  ])("uses safe fallback on bad database response", async (body, status) => {
    mockRead(body, status as number);
    expect(await fetchOffersGroupDestination()).toBe(
      DEFAULT_OFFERS_GROUP_DESTINATION,
    );
  });
  it("uses fallback on network failure", async () => {
    mockRead([]);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    expect(await fetchOffersGroupDestination()).toBe(
      DEFAULT_OFFERS_GROUP_DESTINATION,
    );
  });
  it.each(["/grupodeofertas", "/grupodeofertas/?campaign=abc"])(
    "redirects the document before rendering and prevents stale cache: %s",
    async (path) => {
      const url = "https://chat.whatsapp.com/DnYGmcdvGiN4GtWLaEreft";
      mockRead([{ url }]);
      const response = await server.fetch(
        new Request("https://vitalemobilidade.com" + path),
        {},
        {},
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(url);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
    },
  );
});
