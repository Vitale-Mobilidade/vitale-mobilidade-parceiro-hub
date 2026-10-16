import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { radarAlertsAdmin, readRadarAlerts } from "./admin-radar.server";

const row = {
  id: "alert-1",
  person_name: "Pessoa de teste",
  phone_e164: "+5511999990000",
  email: "pessoa@example.test",
  bike_id: "bw1",
  bike_name: "BW1",
  condition: "target",
  target_price: 4000,
  reference_price: 5500,
  status: "active",
  consent: true,
  delivery_enabled: false,
  created_at: "2026-10-15T12:00:00Z",
  updated_at: "2026-10-15T12:00:00Z",
};
const offer = {
  bike_id: "bw1",
  price: "4900.50",
  url: "https://meli.la/EXAMPLE",
  verified_at: "2026-10-16T20:00:00Z",
  synced_at: "2026-10-16T20:00:00Z",
  first_seen_at: "2026-10-01T12:00:00Z",
};
function setup(
  options: {
    role?: string;
    active?: boolean;
    badToken?: boolean;
    alertsError?: boolean;
    offersError?: boolean;
    alerts?: unknown[];
    offers?: unknown[];
    total?: number;
  } = {},
) {
  const urls: URL[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    urls.push(url);
    if (url.pathname === "/auth/v1/user")
      return Response.json(
        options.badToken
          ? { message: "invalid token" }
          : { id: "00000000-0000-0000-0000-000000000001" },
        { status: options.badToken ? 401 : 200 },
      );
    if (url.pathname.endsWith("/editorial_admin_memberships"))
      return Response.json({
        role: options.role ?? "admin",
        active: options.active ?? true,
      });
    if (url.pathname.endsWith("/bike_price_alerts"))
      return Response.json(
        options.alertsError
          ? { message: "private database error +5511111111111" }
          : (options.alerts ?? [row]),
        {
          status: options.alertsError ? 500 : 200,
          headers: { "Content-Range": `0-0/${options.total ?? 1}` },
        },
      );
    if (url.pathname.endsWith("/bike_offers"))
      return Response.json(
        options.offersError
          ? { message: "private offers error" }
          : (options.offers ?? [offer]),
        { status: options.offersError ? 500 : 200 },
      );
    throw new Error("unexpected request");
  });
  const db = createClient("https://db.example.test", "fake-server-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });
  return { db, urls };
}
const request = (body: unknown = {}, token: string | null = "test-jwt") =>
  new Request("https://vitale.example/api/admin/radar-alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
describe("private Radar alerts", () => {
  it("denies a request without token before initializing service credentials", async () => {
    const factory = vi.fn(() => setup().db);
    const response = await radarAlertsAdmin(request({}, null), factory);
    expect(response.status).toBe(401);
    expect(factory).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each([
    { role: "content" },
    { role: "operation" },
    { role: "admin", active: false },
    { badToken: true },
  ])(
    "denies inactive or non-admin users before reading contacts %#",
    async (options) => {
      const { db, urls } = setup(options);
      const response = await radarAlertsAdmin(request(), () => db);
      expect([401, 403]).toContain(response.status);
      expect(
        urls.some((url) => url.pathname.endsWith("/bike_price_alerts")),
      ).toBe(false);
      expect(await response.text()).not.toContain(row.phone_e164);
    },
  );
  it("returns contacts and the current offer separately from signup reference and desired price", async () => {
    const { db, urls } = setup();
    const response = await radarAlertsAdmin(request(), () => db);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Authorization");
    const result = await response.json();
    expect(result.items[0]).toMatchObject({
      personName: row.person_name,
      phone: row.phone_e164,
      email: row.email,
      currentPrice: 4900.5,
      referencePrice: 5500,
      targetPrice: 4000,
    });
    const query = urls.find((url) =>
      url.pathname.endsWith("/bike_price_alerts"),
    )!;
    expect(query.searchParams.get("status")).toBe("eq.active");
    expect(query.searchParams.get("consent")).toBe("eq.true");
    expect(query.searchParams.get("select")).not.toMatch(
      /utm|consent_text|source_url/,
    );
    const current = urls.find((url) => url.pathname.endsWith("/bike_offers"))!;
    expect(current.searchParams.get("is_current")).toBe("eq.true");
    expect(current.searchParams.get("ended_at")).toBe("is.null");
  });
  it("does not invent a current price from the historical reference or unsafe offer link", async () => {
    const { db } = setup({
      offers: [{ ...offer, url: "https://untrusted.example/item" }],
    });
    const result = await readRadarAlerts(db, {
      page: 1,
      scope: "active",
      search: "",
    });
    expect(result.items[0].currentPrice).toBeNull();
    expect(result.items[0].referencePrice).toBe(5500);
  });
  it("preserves any-drop intent and explicit pagination without confusing alerts with people", async () => {
    const { db, urls } = setup({
      alerts: [{ ...row, condition: "any_drop", target_price: 4000 }],
      total: 27,
    });
    const response = await radarAlertsAdmin(
      request({ page: 2, scope: "all", search: "+55 (11) 99999-0000" }),
      () => db,
    );
    const result = await response.json();
    expect(result.totalAlerts).toBe(27);
    expect(result.items[0].targetPrice).toBeNull();
    const query = urls.find((url) =>
      url.pathname.endsWith("/bike_price_alerts"),
    )!;
    expect(query.searchParams.get("offset")).toBe("25");
    expect(query.searchParams.get("limit")).toBe("25");
    expect(query.searchParams.get("status")).toBeNull();
    expect(query.searchParams.get("or")).toContain("%5511999990000%");
    expect(query.searchParams.get("or")).not.toContain("(" + "11" + ")");
  });
  it.each([
    { page: 0 },
    { page: 1.5 },
    { scope: "admin" },
    { search: "x),consent.eq.false" },
    { search: "x".repeat(101) },
    { unexpected: true },
  ])(
    "rejects malformed filters before reading private data %#",
    async (body) => {
      const { db, urls } = setup();
      const response = await radarAlertsAdmin(request(body), () => db);
      expect(response.status).toBe(400);
      expect(
        urls.some((url) => url.pathname.endsWith("/bike_price_alerts")),
      ).toBe(false);
    },
  );
  it.each([{ alertsError: true }, { offersError: true }])(
    "does not silently return an empty list or signup price on read failure %#",
    async (options) => {
      const { db } = setup(options);
      const response = await radarAlertsAdmin(request(), () => db);
      expect(response.status).toBe(503);
      expect(await response.text()).toBe(
        '{"error":"radar_alerts_unavailable"}',
      );
    },
  );
  it("handles empty observations without querying offers", async () => {
    const { db, urls } = setup({ alerts: [], total: 0 });
    const response = await radarAlertsAdmin(request(), () => db);
    expect(await response.json()).toMatchObject({ totalAlerts: 0, items: [] });
    expect(urls.some((url) => url.pathname.endsWith("/bike_offers"))).toBe(
      false,
    );
  });
});
