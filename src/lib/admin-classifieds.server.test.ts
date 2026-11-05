import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { adminClassifieds } from "./admin-classifieds.server";
const actor = "00000000-0000-4000-8000-000000000001";
function setup(role = "admin", active = true, badToken = false) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      const body = JSON.parse(String(init?.body ?? "{}"));
      calls.push({ path: u.pathname, body });
      if (u.pathname === "/auth/v1/user")
        return Response.json(
          badToken ? { message: "bad" } : { id: actor, is_anonymous: false },
          { status: badToken ? 401 : 200 },
        );
      if (u.pathname.endsWith("/editorial_admin_memberships"))
        return Response.json({ role, active });
      if (u.pathname.endsWith("/rpc/admin_member_metrics"))
        return Response.json({ members: 3, listings: 4, grossCents: 0 });
      if (u.pathname.endsWith("/rpc/admin_channel_classifieds"))
        return Response.json({ id: actor, status: "draft", images: [] });
      return Response.json(
        { message: "private error +5511000000000" },
        { status: 500 },
      );
    },
  );
  const db = createClient(
    "https://synthetic.invalid",
    "local-service-test-key",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    },
  );
  return { db, calls };
}
function req(body: unknown, token = true) {
  return new Request("https://vitale.test/api/admin/classifieds", {
    method: "POST",
    headers: token ? { Authorization: "Bearer synthetic-token" } : {},
    body: JSON.stringify(body),
  });
}
it("requires a verified active admin before any private operation", async () => {
  for (const options of [
    ["admin", true, true],
    ["content", true, false],
    ["admin", false, false],
    ["operation", true, false],
  ] as const) {
    const s = setup(options[0], options[1], options[2]);
    const r = await adminClassifieds(
      req({ action: "metrics", days: 7 }),
      () => s.db,
    );
    expect([401, 403]).toContain(r.status);
    expect(s.calls.some((x) => x.path.includes("/rpc/"))).toBe(false);
  }
  const s = setup();
  expect(
    (await adminClassifieds(req({ action: "create" }, false), () => s.db))
      .status,
  ).toBe(401);
  expect(s.calls).toHaveLength(0);
});
it("metrics use the authenticated admin identity and bounded days", async () => {
  const s = setup();
  const r = await adminClassifieds(
    req({ action: "metrics", days: 7 }),
    () => s.db,
  );
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(s.calls.at(-1)?.body).toEqual({ p_actor: actor, p_days: 7 });
  for (const days of [0, 91, null])
    expect(
      (await adminClassifieds(req({ action: "metrics", days }), () => s.db))
        .status,
    ).toBe(400);
});
it("rejects actor spoofing, arbitrary media paths and institutional source from a browser", async () => {
  const s = setup();
  for (const input of [
    { action: "create", actor },
    {
      action: "remove_image",
      payload: { id: actor, assetId: actor, path: "someone-else/file" },
    },
    {
      action: "publish",
      payload: {
        id: actor,
        whatsapp: "5511999999999",
        contactConsent: true,
        seller_kind: "channel",
      },
    },
  ])
    expect((await adminClassifieds(req(input), () => s.db)).status).toBe(400);
  expect(s.calls.some((x) => x.path.includes("/rpc/"))).toBe(false);
});
it("creates channel inventory using only the server-bound admin actor", async () => {
  const s = setup();
  const r = await adminClassifieds(req({ action: "create" }), () => s.db);
  expect(r.status).toBe(200);
  expect(s.calls.at(-1)?.body).toEqual({
    p_actor: actor,
    p_action: "create",
    p_payload: {},
  });
  expect(
    s.calls.some(
      (x) => x.path.includes("billing") || x.path.includes("member_profiles"),
    ),
  ).toBe(false);
});
it("rejects malformed JSON without leaking internals", async () => {
  const s = setup();
  const r = await adminClassifieds(
    new Request("https://vitale.test", {
      method: "POST",
      headers: { Authorization: "Bearer synthetic-token" },
      body: "{",
    }),
    () => s.db,
  );
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ error: "invalid_input" });
});
