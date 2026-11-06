import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { adminClassifieds } from "./admin-classifieds.server";
const actor = "00000000-0000-4000-8000-000000000001",
  target = "00000000-0000-4000-8000-000000000025";
function setup(
  options: {
    failure?: string;
    alreadyDeleted?: boolean;
    foreignPath?: boolean;
    role?: string;
  } = {},
) {
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown>;
  }[] = [];
  const db = createClient(
    "https://synthetic.invalid",
    "local-test-service-key",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const u = new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
          );
          const body = JSON.parse(String(init?.body ?? "{}"));
          calls.push({ path: u.pathname, method: init?.method ?? "GET", body });
          if (u.pathname === "/auth/v1/user")
            return Response.json({ id: actor, is_anonymous: false });
          if (u.pathname.endsWith("/editorial_admin_memberships"))
            return Response.json({
              active: true,
              role: options.role ?? "admin",
            });
          if (u.pathname.endsWith("/rpc/admin_community_manage")) {
            if (body.p_action === options.failure)
              return Response.json(
                {
                  message:
                    options.failure === "prepare_removal"
                      ? "protected_account"
                      : "private backend error",
                },
                { status: 400 },
              );
            return Response.json(
              body.p_action === "prepare_removal"
                ? {
                    alreadyDeleted: !!options.alreadyDeleted,
                    paths: [
                      `${options.foreignPath ? actor : target}/avatar/test.webp`,
                    ],
                  }
                : { removed: true },
            );
          }
          if (u.pathname === "/storage/v1/object/member-media")
            return Response.json(
              options.failure === "storage" ? { message: "private error" } : [],
              { status: options.failure === "storage" ? 500 : 200 },
            );
          if (u.pathname === `/auth/v1/admin/users/${target}`)
            return Response.json(
              options.failure === "auth"
                ? { message: "private error" }
                : { id: target, deleted_at: "2026-11-06T15:00:00Z" },
              { status: options.failure === "auth" ? 400 : 200 },
            );
          throw Error(`Unexpected path ${u.pathname}`);
        },
      },
    },
  );
  return { db, calls };
}
function req(
  payload: unknown = {
    userId: target,
    email: "target@example.invalid",
    confirmed: true,
  },
) {
  return new Request("https://vitale.test/api/admin/classifieds", {
    method: "POST",
    headers: { authorization: "Bearer synthetic-token" },
    body: JSON.stringify({ action: "remove_member", payload }),
  });
}
it("removal binds the admin, deletes only owned media, uses Auth soft-delete then finalizes", async () => {
  const s = setup();
  const r = await adminClassifieds(req(), () => s.db);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ removed: true });
  expect(s.calls.slice(2).map((c) => c.body.p_action ?? c.path)).toEqual([
    "prepare_removal",
    "/storage/v1/object/member-media",
    `/auth/v1/admin/users/${target}`,
    "finish_removal",
  ]);
  expect(s.calls.find((c) => c.path.includes("/auth/v1/admin/"))?.body).toEqual(
    { should_soft_delete: true },
  );
  expect(
    s.calls
      .filter((c) => c.body.p_actor)
      .every((c) => c.body.p_actor === actor),
  ).toBe(true);
  expect(r.headers.get("cache-control")).toBe("private, no-store");
});
it("partial failures never finalize or expose a provider error; the operation remains resumable", async () => {
  for (const failure of ["storage", "auth", "finish_removal"]) {
    const s = setup({ failure });
    const r = await adminClassifieds(req(), () => s.db);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "removal_pending" });
    if (failure !== "finish_removal")
      expect(s.calls.some((c) => c.body.p_action === "finish_removal")).toBe(
        false,
      );
  }
  const s = setup({ alreadyDeleted: true });
  expect((await adminClassifieds(req(), () => s.db)).status).toBe(200);
  expect(s.calls.some((c) => c.path.includes("/auth/v1/admin/"))).toBe(false);
});
it("refuses protected accounts, foreign paths, missing confirmation and non-admin actors", async () => {
  for (const options of [
    { failure: "prepare_removal" },
    { foreignPath: true },
    { role: "content" },
  ]) {
    const s = setup(options);
    expect(
      (await adminClassifieds(req(), () => s.db)).status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      s.calls.some(
        (c) =>
          c.path.includes("/auth/v1/admin/") || c.path.includes("/storage/"),
      ),
    ).toBe(false);
  }
  for (const payload of [
    { userId: target, email: "target@example.invalid", confirmed: false },
    { userId: target, email: "target@example.invalid", confirmed: true, actor },
  ]) {
    const s = setup();
    expect((await adminClassifieds(req(payload), () => s.db)).status).toBe(400);
    expect(s.calls.some((c) => c.body.p_action)).toBe(false);
  }
});
