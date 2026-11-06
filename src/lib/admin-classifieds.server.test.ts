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
      if (u.pathname.endsWith("/rpc/admin_member_period_metrics"))
        return Response.json({ period: "today" });
      if (u.pathname.endsWith("/rpc/admin_member_metrics"))
        return Response.json({ members: 3, listings: 4, grossCents: 0 });
      if (u.pathname.endsWith("/rpc/admin_community_manage"))
        return Response.json({ total: 0, items: [], listings: [] });
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
  expect(r.headers.get("cache-control")).toBe("private, no-store");
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

it("directory search and courtesy actions bind the real admin and reject spoofed fields", async () => {
  const s = setup();
  const payloads = [
    { action: "members", payload: { query: "(11) 99999-9999", offset: 20 } },
    {
      action: "listings",
      payload: { query: "Bike", offset: 0, status: "archived" },
    },
    { action: "member", payload: { id: actor } },
    {
      action: "grant",
      payload: {
        userId: actor,
        requestId: actor,
        quantity: 2,
        reason: "Parceria local",
      },
    },
    {
      action: "revoke",
      payload: { userId: actor, courtesyId: actor, reason: "Fim da parceria" },
    },
  ];
  for (const input of payloads) {
    const r = await adminClassifieds(req(input), () => s.db);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(s.calls.at(-1)).toEqual({
      path: "/rest/v1/rpc/admin_community_manage",
      body: {
        p_actor: actor,
        p_action: input.action,
        p_payload:
          input.action === "members"
            ? { ...input.payload, orderBy: "createdAt", direction: "desc" }
            : input.payload,
      },
    });
  }
  for (const input of [
    { action: "members", payload: { query: "x", offset: -1 } },
    { action: "members", payload: { query: "x".repeat(121) } },
    { action: "listings", payload: { status: "anything" } },
    {
      action: "grant",
      payload: {
        userId: actor,
        requestId: actor,
        quantity: 11,
        reason: "Parceria",
      },
    },
    {
      action: "grant",
      payload: { userId: actor, requestId: actor, quantity: 1, reason: "oi" },
    },
    {
      action: "grant",
      payload: {
        userId: actor,
        requestId: actor,
        quantity: 1,
        reason: "Parceria",
        actor,
      },
    },
  ])
    expect((await adminClassifieds(req(input), () => s.db)).status).toBe(400);
});
it("non-admin cannot search contacts or issue/revoke free listings", async () => {
  for (const action of ["members", "member", "grant", "revoke"]) {
    const s = setup("content");
    const r = await adminClassifieds(req({ action, payload: {} }), () => s.db);
    expect(r.status).toBe(403);
    expect(s.calls.some((c) => c.path.includes("/rpc/"))).toBe(false);
  }
});

it("orders directory results at the backend, rejecting arbitrary sort keys", async () => {
  const s = setup();
  const payload = {
    query: "Tabela",
    offset: 20,
    orderBy: "name",
    direction: "asc",
  };
  expect(
    (await adminClassifieds(req({ action: "members", payload }), () => s.db))
      .status,
  ).toBe(200);
  expect(s.calls.at(-1)?.body).toEqual({
    p_actor: actor,
    p_action: "members",
    p_payload: payload,
  });
  for (const value of [{ orderBy: "email" }, { direction: "drop" }])
    expect(
      (
        await adminClassifieds(
          req({ action: "members", payload: value }),
          () => s.db,
        )
      ).status,
    ).toBe(400);
});
it("period metrics do not accept a browser-supplied identity or unbounded inputs", async () => {
  const s = setup();
  for (const payload of [
    { period: "all" },
    { period: "custom", start: "bad", end: "2026-11-06" },
    { period: "today", actor },
  ])
    expect(
      (
        await adminClassifieds(
          req({ action: "period_metrics", payload }),
          () => s.db,
        )
      ).status,
    ).toBe(400);
});

it("period metrics bind the verified admin and validated calendar dates", async () => {
  const s = setup();
  const r = await adminClassifieds(
    req({
      action: "period_metrics",
      payload: { period: "custom", start: "2026-11-01", end: "2026-11-06" },
    }),
    () => s.db,
  );
  expect(r.status).toBe(200);
  expect(s.calls.at(-1)?.body).toEqual({
    p_actor: actor,
    p_period: "custom",
    p_start: "2026-11-01",
    p_end: "2026-11-06",
  });
  expect(
    (
      await adminClassifieds(
        req({
          action: "period_metrics",
          payload: { period: "custom", start: "2026-02-30", end: "2026-11-06" },
        }),
        () => s.db,
      )
    ).status,
  ).toBe(400);
});
