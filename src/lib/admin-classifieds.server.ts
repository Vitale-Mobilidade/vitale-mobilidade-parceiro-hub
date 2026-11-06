import { createClient } from "@supabase/supabase-js";
import { adminClassifiedsInput } from "./admin-classifieds";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function database() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database_not_configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function adminClassifieds(request: Request, dbFactory = database) {
  const reply = (v: unknown, status = 200) =>
    Response.json(v, { status, headers });
  if (request.method !== "POST")
    return reply({ error: "method_not_allowed" }, 405);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if (!token || token.length > 4000)
    return reply({ error: "unauthorized" }, 401);
  try {
    const db = dbFactory();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user || auth.user.is_anonymous)
      return reply({ error: "unauthorized" }, 401);
    const member = await db
      .from("editorial_admin_memberships")
      .select("active,role")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (
      member.error ||
      member.data?.active !== true ||
      member.data.role !== "admin"
    )
      return reply({ error: "forbidden" }, 403);
    const text = await request.text();
    if (text.length > 14000) return reply({ error: "invalid_input" }, 413);
    const input = adminClassifiedsInput.safeParse(JSON.parse(text));
    if (!input.success) return reply({ error: "invalid_input" }, 400);
    const data = input.data;
    if (data.action === "period_metrics") {
      const r = await db.rpc("admin_member_period_metrics", {
        p_actor: auth.user.id,
        p_period: data.payload.period,
        p_start: data.payload.start ?? null,
        p_end: data.payload.end ?? null,
      });
      if (r.error)
        return reply(
          {
            error:
              r.error.message === "invalid_period"
                ? "invalid_period"
                : "metrics_unavailable",
          },
          r.error.message === "invalid_period" ? 400 : 503,
        );
      return reply(r.data);
    }
    if (data.action === "remove_member") {
      // The browser cannot call preparation/finalization or supply Storage paths.
      const payload = {
        userId: data.payload.userId,
        email: data.payload.email,
      };
      const prepared = await db.rpc("admin_community_manage", {
        p_actor: auth.user.id,
        p_action: "prepare_removal",
        p_payload: payload,
      });
      if (prepared.error) {
        const code = [
          "protected_account",
          "payment_pending",
          "email_mismatch",
          "member_unavailable",
        ].includes(prepared.error.message)
          ? prepared.error.message
          : "removal_unavailable";
        return reply({ error: code }, 409);
      }
      const paths: unknown = prepared.data?.paths;
      if (
        !Array.isArray(paths) ||
        paths.length > 10000 ||
        paths.some(
          (p) =>
            typeof p !== "string" ||
            !p.startsWith(`${data.payload.userId}/`) ||
            p.includes(".."),
        )
      )
        return reply({ error: "removal_pending" }, 503);
      for (let i = 0; i < paths.length; i += 100) {
        const removed = await db.storage
          .from("member-media")
          .remove(paths.slice(i, i + 100));
        if (removed.error) return reply({ error: "removal_pending" }, 503);
      }
      if (!prepared.data.alreadyDeleted) {
        // Soft deletion anonymizes Auth and invalidates refresh sessions without cascading payments.
        const removed = await db.auth.admin.deleteUser(
          data.payload.userId,
          true,
        );
        if (removed.error) return reply({ error: "removal_pending" }, 503);
      }
      const finished = await db.rpc("admin_community_manage", {
        p_actor: auth.user.id,
        p_action: "finish_removal",
        p_payload: payload,
      });
      if (finished.error) return reply({ error: "removal_pending" }, 503);
      return reply({ removed: true });
    }
    if (
      ["members", "listings", "member", "grant", "revoke"].includes(data.action)
    ) {
      const result = await db.rpc("admin_community_manage", {
        p_actor: auth.user.id,
        p_action: data.action,
        p_payload: "payload" in data ? data.payload : {},
      });
      if (result.error) {
        const safe = [
          "forbidden",
          "invalid_input",
          "member_unavailable",
          "courtesy_unavailable",
          "courtesy_limit",
          "request_conflict",
        ].includes(result.error.message)
          ? result.error.message
          : "community_unavailable";
        return reply({ error: safe }, safe === "forbidden" ? 403 : 409);
      }
      // Sign only the cover; private drafts remain inaccessible to public image routes.
      const items =
        data.action === "listings"
          ? result.data.items
          : (result.data.listings ?? []);
      for (const item of items) {
        const cover = item.images?.find(
          (a: { status: string }) => a.status === "ready",
        );
        if (!cover) continue;
        const signed = await db.storage
          .from("member-media")
          .createSignedUrl(cover.path, 300);
        if (signed.data?.signedUrl) cover.url = signed.data.signedUrl;
      }
      return reply(result.data);
    }
    if (data.action === "metrics") {
      const result = await db.rpc("admin_member_metrics", {
        p_actor: auth.user.id,
        p_days: data.days,
      });
      if (result.error) return reply({ error: "metrics_unavailable" }, 503);
      return reply(result.data);
    }
    if (data.action === "remove_image") {
      const check = await db.rpc("admin_channel_classifieds", {
        p_actor: auth.user.id,
        p_action: "get",
        p_payload: { id: data.payload.id },
      });
      if (check.error || check.data?.status !== "draft")
        return reply({ error: "listing_not_draft" }, 409);
      const asset = await db
        .from("member_media_assets")
        .select("object_path")
        .eq("id", data.payload.assetId)
        .eq("listing_id", data.payload.id)
        .neq("status", "removed")
        .maybeSingle();
      if (asset.error || !asset.data)
        return reply({ error: "listing_unavailable" }, 404);
      const removed = await db.storage
        .from("member-media")
        .remove([asset.data.object_path]);
      if (removed.error) return reply({ error: "media_unavailable" }, 503);
    }
    const result = await db.rpc("admin_channel_classifieds", {
      p_actor: auth.user.id,
      p_action: data.action,
      p_payload: "payload" in data ? data.payload : {},
    });
    if (result.error) {
      const code = String(result.error.message);
      const safe =
        /^(listing_[a-z_]+|media_[a-z_]+|invalid_input|forbidden)$/.test(code)
          ? code
          : "classifieds_unavailable";
      return reply({ error: safe }, code === "forbidden" ? 403 : 409);
    }
    if (data.action === "reserve_image") {
      const asset = result.data;
      const signed = await db.storage
        .from("member-media")
        .createSignedUploadUrl(asset.path);
      if (signed.error || !signed.data)
        return reply({ error: "media_unavailable" }, 503);
      return reply({ ...asset, token: signed.data.token });
    }
    if (data.action === "list" || data.action === "get") {
      const items = data.action === "list" ? result.data : [result.data];
      for (const item of items) {
        for (const image of item.images ?? []) {
          if (image.status !== "ready") continue;
          const signed = await db.storage
            .from("member-media")
            .createSignedUrl(image.path, 300);
          if (signed.error) throw new Error("media_unavailable");
          image.url = signed.data?.signedUrl;
        }
      }
      return reply(data.action === "list" ? items : items[0]);
    }
    return reply(result.data);
  } catch (error) {
    return reply(
      {
        error:
          error instanceof SyntaxError
            ? "invalid_input"
            : "classifieds_unavailable",
      },
      error instanceof SyntaxError ? 400 : 503,
    );
  }
}
