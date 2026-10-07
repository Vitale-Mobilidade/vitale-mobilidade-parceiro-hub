import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  newsletterWindow,
  renderResendNewsletter,
  type NewsletterContent,
  type NewsletterSegment,
} from "./newsletter";
import { automaticNewsletter } from "./newsletter-sources.server";
import {
  ResendNewsletter,
  ResendFault,
  type ResendUsage,
} from "./resend-newsletter.server";

export type NewsletterSettings = {
  enabled: boolean;
  from_email: string;
  reply_to: string;
  segments: Partial<Record<NewsletterSegment, string>>;
  last_error: string | null;
  retry_until?: string | null;
};
type Campaign = {
  id: string;
  edition_day: string;
  segment: NewsletterSegment;
  status: string;
  payload: { content: NewsletterContent };
  resend_id: string | null;
};
type Recipient = {
  id: string;
  person_name: string;
  email: string;
  resend_contact_id: string | null;
  consent_at: string;
  synced: boolean;
};
const GROUPS: NewsletterSegment[] = ["general", "radar", "content"];
const UUID = /^[0-9a-f-]{36}$/i;
const errorCode = (error: unknown) =>
  error instanceof ResendFault
    ? error.message
    : error instanceof Error && /^[a-z_]+$/.test(error.message)
      ? error.message
      : "newsletter_operation_failed";
function dbClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database_not_configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function provider() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("resend_not_configured");
  return new ResendNewsletter(key, fetch, 650, process.env.LOVABLE_API_KEY);
}
async function must<T>(
  operation: PromiseLike<{ data: T; error: unknown }>,
): Promise<T> {
  const { data, error } = await operation;
  if (error) throw new Error("newsletter_database_failed");
  return data;
}
async function settings(db: SupabaseClient): Promise<NewsletterSettings> {
  const result = await must(
    db
      .from("newsletter_settings")
      .select("enabled,from_email,reply_to,segments,last_error,retry_until")
      .eq("singleton", true)
      .single(),
  );
  if (!result) throw new Error("newsletter_database_failed");
  return result;
}
async function updateCampaign(
  db: SupabaseClient,
  id: string,
  change: Record<string, unknown>,
) {
  await must(db.from("newsletter_campaigns").update(change).eq("id", id));
}
async function lock(db: SupabaseClient) {
  const token = await must(db.rpc("newsletter_acquire"));
  if (!token) throw new Error("newsletter_busy");
  return token as string;
}
async function renew(db: SupabaseClient, tok: string) {
  if ((await must(db.rpc("newsletter_renew", { tok }))) !== true)
    throw new Error("newsletter_lease_expired");
}
async function currentRecipients(
  db: SupabaseClient,
  id: string,
): Promise<Recipient[]> {
  return (
    (await must(db.rpc("newsletter_live_recipients", { p_campaign: id }))) ?? []
  );
}
async function suppress(db: SupabaseClient, id: string) {
  await must(
    db
      .from("newsletter_subscriptions")
      .update({
        status: "unsubscribed",
        delivery_enabled: false,
        suppressed_at: new Date().toISOString(),
      })
      .eq("id", id),
  );
}
async function ensureSegment(
  db: SupabaseClient,
  resend: ResendNewsletter,
  s: NewsletterSettings,
  _group: NewsletterSegment,
) {
  // One dedicated provider segment, reused only after the previous broadcast finishes.
  // Declared-interest cohorts remain exclusive in the private ledger.
  const segmentName = "Vitale newsletter";
  if (s.segments.general) {
    const found = await resend.call<{ id: string; name: string }>(
      `/segments/${s.segments.general}`,
    );
    if (found.name !== segmentName) throw new Error("segment_not_dedicated");
    return s.segments.general!;
  }
  const list = await resend.list<{ id: string; name: string }>("/segments");
  let id = list.find((x) => x.name === segmentName)?.id;
  if (!id) {
    const usage = await resend.call<ResendUsage>("/usage");
    if (
      !Number.isFinite(usage.segments?.used) ||
      usage.segments.used >= Math.min(3, usage.segments.limit ?? 3)
    )
      throw new Error("free_segment_limit");
    const created = await resend.call<{ id: string }>("/segments", "POST", {
      name: segmentName,
    });
    id = created.id;
  }
  if (!id || !UUID.test(id)) throw new Error("invalid_segment_ack");
  s.segments = Object.fromEntries(GROUPS.map((group) => [group, id]));
  await must(
    db
      .from("newsletter_settings")
      .update({ segments: s.segments })
      .eq("singleton", true),
  );
  return id;
}
async function pause(db: SupabaseClient, code: string) {
  // OFF stops every later stage and the signed dispatcher, while preserving the ledger.
  await must(
    db
      .from("newsletter_settings")
      .update({ enabled: false, last_error: code })
      .eq("singleton", true),
  );
}
export async function processNewsletterCampaign(
  db: SupabaseClient,
  resend: ResendNewsletter,
  s: NewsletterSettings,
  c: Campaign,
  tok: string,
) {
  if (["creating", "submitting", "uncertain"].includes(c.status)) {
    // A killed process may have already submitted. Reconcile by immutable provider ID; never submit again.
    if (c.resend_id) {
      const remote = await resend.call<{ status: string; sent_at?: string }>(
        `/broadcasts/${c.resend_id}`,
      );
      if (["queued", "sending", "scheduled", "sent"].includes(remote.status)) {
        await updateCampaign(db, c.id, {
          status: remote.status === "sent" ? "sent" : "submitted",
          submitted_at: new Date().toISOString(),
          sent_at: remote.sent_at ?? null,
        });
        return;
      }
    }
    await updateCampaign(db, c.id, {
      status: "uncertain",
      last_error: "manual_reconciliation_required",
    });
    await pause(db, "manual_reconciliation_required");
    return;
  }
  const segment = await ensureSegment(db, resend, s, c.segment);
  let live = await currentRecipients(db, c.id);
  if (live.length > 1000) throw new Error("free_contact_limit");
  for (const recipient of live.filter((r) => !r.synced).slice(0, 50)) {
    await renew(db, tok);
    const contact = await resend.ensureContact(
      recipient.email,
      recipient.person_name,
    );
    if (!contact) {
      await suppress(db, recipient.id);
      continue;
    }
    // Recheck consent after network calls, before adding a contact to the sending segment.
    const stillLive = (await currentRecipients(db, c.id)).find(
      (r) => r.id === recipient.id,
    );
    if (!stillLive) continue;
    await resend.call(`/contacts/${contact.id}/segments/${segment}`, "POST");
    await must(
      db
        .from("newsletter_subscriptions")
        .update({ resend_contact_id: contact.id })
        .eq("id", recipient.id),
    );
    await must(
      db
        .from("newsletter_recipients")
        .update({ synced: true })
        .eq("campaign_id", c.id)
        .eq("subscription_id", recipient.id),
    );
  }
  live = await currentRecipients(db, c.id);
  if (live.some((r) => !r.synced)) return;
  let members = await resend.members(segment);
  for (const member of members.filter((m) => m.unsubscribed)) {
    const recipient = live.find((r) => r.resend_contact_id === member.id);
    if (recipient) await suppress(db, recipient.id);
  }
  live = await currentRecipients(db, c.id);
  const wanted = new Set(live.map((r) => r.resend_contact_id));
  const extra = members.filter((m) => !wanted.has(m.id));
  for (const member of extra.slice(0, 50)) {
    await renew(db, tok);
    await resend.call(`/contacts/${member.id}/segments/${segment}`, "DELETE");
  }
  if (extra.length > 50) return;
  members = await resend.members(segment);
  const actual = members
    .filter((m) => !m.unsubscribed)
    .map((m) => m.id)
    .sort();
  const expected = live.map((r) => r.resend_contact_id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("audience_mismatch");
  if (!live.length) {
    await updateCampaign(db, c.id, {
      status: "skipped",
      last_error: "no_eligible_recipients",
    });
    return;
  }
  // Snapshot is frozen. A creating marker survives a crash before saving the upstream ID.
  if (!c.resend_id) {
    await renew(db, tok);
    await updateCampaign(db, c.id, { status: "creating" });
    const rendered = renderResendNewsletter(c.payload.content, c.segment);
    let created: { id: string };
    try {
      created = await resend.call("/broadcasts", "POST", {
        segment_id: segment,
        from: `Vitale Mobilidade <${s.from_email}>`,
        reply_to: s.reply_to,
        name: `Vitale ${c.edition_day} ${c.segment} ${c.id}`,
        subject: c.payload.content.subject,
        ...rendered,
      });
    } catch (e) {
      const uncertain = e instanceof ResendFault && e.uncertain;
      await updateCampaign(db, c.id, {
        status: uncertain ? "uncertain" : "syncing",
        last_error: errorCode(e),
      });
      if (uncertain) await pause(db, "broadcast_create_uncertain");
      throw e;
    }
    if (!created.id || !UUID.test(created.id)) {
      await updateCampaign(db, c.id, { status: "uncertain" });
      await pause(db, "invalid_broadcast_ack");
      return;
    }
    c.resend_id = created.id;
    await updateCampaign(db, c.id, { status: "ready", resend_id: created.id });
  }
  if (
    !newsletterWindow(new Date()).due ||
    c.edition_day !== newsletterWindow(new Date()).day
  )
    return;
  // Final safety boundary: active settings + current consent + exact audience before submission.
  const fresh = await settings(db);
  if (
    !fresh.enabled ||
    fresh.from_email !== s.from_email ||
    fresh.reply_to !== s.reply_to
  )
    return;
  const latest = await currentRecipients(db, c.id);
  if (
    JSON.stringify(latest.map((r) => r.resend_contact_id).sort()) !==
    JSON.stringify(expected)
  )
    return;
  await renew(db, tok);
  await updateCampaign(db, c.id, {
    status: "submitting",
    submitted_at: new Date().toISOString(),
  });
  try {
    const sent = await resend.call<{ id: string }>(
      `/broadcasts/${c.resend_id}/send`,
      "POST",
      {},
    );
    if (sent.id !== c.resend_id) throw new ResendFault(200, true);
  } catch (e) {
    const uncertain = e instanceof ResendFault && e.uncertain;
    await updateCampaign(db, c.id, {
      status: uncertain ? "uncertain" : "ready",
      last_error: errorCode(e),
    });
    if (uncertain) await pause(db, "broadcast_send_uncertain");
    throw e;
  }
  // Persisting an acknowledged send can fail. Leave submitting intact so the next tick reconciles, never resends.
  await updateCampaign(db, c.id, { status: "submitted", last_error: null });
}
export async function newsletterTick(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (
    !request.headers.get("x-worker-signature") ||
    !request.headers.get("x-worker-issued-at")
  )
    return new Response(null, { status: 403 });
  let db: SupabaseClient;
  try {
    db = dbClient();
  } catch {
    return Response.json({ error: "database_not_configured" }, { status: 503 });
  }
  const { data: authorized, error } = await db.rpc("newsletter_authorize", {
    signature: request.headers.get("x-worker-signature"),
    issued_at: request.headers.get("x-worker-issued-at"),
  });
  if (error || authorized !== true) return new Response(null, { status: 403 });
  let tok: string | undefined;
  try {
    const s = await settings(db);
    if (!s.enabled) return Response.json({ ok: true, enabled: false });
    if (s.retry_until && Date.parse(s.retry_until) > Date.now())
      return Response.json({ ok: true, waiting: true });
    const resend = provider();
    tok = await lock(db);
    // Requests from a disabled/misconfigured project cannot claim or send.
    await resend.verifySender(s.from_email);
    const submitted = ((await must(
      db
        .from("newsletter_campaigns")
        .select("id,edition_day,segment,status,payload,resend_id")
        .eq("status", "submitted"),
    )) ?? []) as Campaign[];
    for (const c of submitted) {
      const remote = await resend.call<{ status: string; sent_at?: string }>(
        `/broadcasts/${c.resend_id}`,
      );
      if (remote.status === "sent")
        await updateCampaign(db, c.id, {
          status: "sent",
          sent_at: remote.sent_at ?? new Date().toISOString(),
        });
      else if (["failed", "canceled"].includes(remote.status)) {
        await pause(db, "provider_campaign_failed");
        return Response.json({ ok: false, error: "provider_campaign_failed" });
      } else return Response.json({ ok: true, waiting: true }); // Keep segment frozen while Resend processes it.
    }
    const unfinished = ((await must(
      db
        .from("newsletter_campaigns")
        .select("id,edition_day,segment,status,payload,resend_id")
        .in("status", [
          "syncing",
          "creating",
          "ready",
          "submitting",
          "uncertain",
        ])
        .order("created_at")
        .limit(1),
    )) ?? []) as Campaign[];
    if (unfinished.length) {
      if (unfinished[0].edition_day !== newsletterWindow(new Date()).day) {
        await updateCampaign(db, unfinished[0].id, {
          status: "paused",
          last_error: "missed_sending_window",
        });
        await pause(db, "missed_sending_window");
        return Response.json({ ok: false, error: "missed_sending_window" });
      }
      await processNewsletterCampaign(db, resend, s, unfinished[0], tok);
      return Response.json({ ok: true });
    }
    const window = newsletterWindow(new Date());
    if (!window.due) return Response.json({ ok: true, due: false });
    // Once all cohorts exist for the day, never pay to rewrite the same edition on every cron tick.
    const existing = await must(
      db
        .from("newsletter_campaigns")
        .select("segment,payload,fingerprint")
        .eq("edition_day", window.day),
    );
    if ((existing?.length ?? 0) >= GROUPS.length)
      return Response.json({ ok: true, prepared: false });
    const saved = existing?.find(
      (c: { payload?: { content?: NewsletterContent } }) => c.payload?.content,
    );
    const previous = saved
      ? null
      : await must(
          db
            .from("newsletter_campaigns")
            .select("created_at,payload")
            .lt("edition_day", window.day)
            .in("status", ["sent", "submitted"])
            .order("created_at", { ascending: false })
            .limit(6),
        );
    const since = previous?.[0]?.created_at
      ? new Date(previous[0].created_at)
      : undefined;
    const edition = saved
      ? { content: saved.payload.content, fingerprint: saved.fingerprint }
      : await automaticNewsletter(
          window.weekday,
          since,
          (previous ?? [])
            .map(
              (p: { payload: { content: NewsletterContent } }) =>
                p.payload.content,
            )
            .filter(Boolean),
        );
    for (const group of GROUPS)
      await must(
        db.rpc("newsletter_form_campaign", {
          p_day: window.day,
          p_segment: group,
          p_payload: { content: edition.content },
          p_fingerprint: edition.fingerprint,
          tok,
        }),
      );
    return Response.json({ ok: true, prepared: true });
  } catch (e) {
    const code = errorCode(e);
    if (
      tok &&
      !["newsletter_sources_unavailable", "newsletter_no_active_bike"].includes(
        code,
      ) &&
      !(
        e instanceof ResendFault &&
        (e.status === 429 || e.status >= 500 || e.status === 0)
      )
    )
      await pause(db, code).catch(() => undefined);
    else
      await db
        .from("newsletter_settings")
        .update({
          last_error: code,
          ...(e instanceof ResendFault && e.status === 429
            ? {
                retry_until: new Date(
                  Math.max(Date.now() + 300_000, e.retryAt ?? 0),
                ).toISOString(),
              }
            : {}),
        })
        .eq("singleton", true);
    return Response.json(
      { ok: false, error: code },
      { status: code === "newsletter_busy" ? 409 : 503 },
    );
  } finally {
    if (tok) await db.rpc("newsletter_release", { tok });
  }
}

const configSchema = z
  .object({
    action: z.literal("configure"),
    from_email: z.string().email().max(254),
    reply_to: z.string().email().max(254),
  })
  .strict();
export async function newsletterAdmin(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  let db: SupabaseClient;
  try {
    db = dbClient();
  } catch {
    return Response.json(
      { error: "database_not_configured" },
      { status: 503, headers },
    );
  }
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 4000)
    return new Response(null, { status: 401, headers });
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return new Response(null, { status: 401, headers });
  const membership = await db
    .from("editorial_admin_memberships")
    .select("role,active")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (
    membership.error ||
    membership.data?.active !== true ||
    membership.data.role !== "admin"
  )
    return new Response(null, { status: 403, headers });
  let tok: string | undefined;
  try {
    if (request.method === "GET") {
      const s = await settings(db);
      const [eligible, legacy, suppressed, campaigns] = await Promise.all([
        db
          .from("newsletter_subscriptions")
          .select("id", { head: true, count: "exact" })
          .eq("status", "interested")
          .eq("consent_version", "v2")
          .is("suppressed_at", null),
        db
          .from("newsletter_subscriptions")
          .select("id", { head: true, count: "exact" })
          .neq("consent_version", "v2"),
        db
          .from("newsletter_subscriptions")
          .select("id", { head: true, count: "exact" })
          .eq("status", "unsubscribed"),
        db.rpc("newsletter_campaign_report"),
      ]);
      if ([eligible, legacy, suppressed, campaigns].some((r) => r.error))
        throw new Error("newsletter_database_failed");
      return Response.json(
        {
          settings: s,
          configured: !!process.env.RESEND_API_KEY,
          webhookConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
          audience: {
            eligible: eligible.count,
            legacy: legacy.count,
            suppressed: suppressed.count,
          },
          campaigns: campaigns.data,
        },
        { headers },
      );
    }
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers });
    const raw = await request.text();
    if (raw.length > 2000) return new Response(null, { status: 413, headers });
    const body = JSON.parse(raw) as Record<string, unknown>;
    tok = await lock(db);
    const s = await settings(db);
    if (body.action === "configure") {
      const config = configSchema.parse(body);
      if (s.enabled) throw new Error("pause_before_configuring");
      await must(
        db
          .from("newsletter_settings")
          .update({
            from_email: config.from_email.toLowerCase(),
            reply_to: config.reply_to.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("singleton", true),
      );
    } else if (body.action === "prepare") {
      if (s.enabled) throw new Error("pause_before_configuring");
      const resend = provider();
      await resend.verifySender(s.from_email);
      const interests = await must(
        db
          .from("newsletter_subscriptions")
          .select("interest")
          .eq("consent_version", "v2")
          .eq("status", "interested")
          .is("suppressed_at", null),
      );
      const groups = new Set<NewsletterSegment>([
        "general",
        ...(interests ?? []).map((x) => x.interest as NewsletterSegment),
      ]);
      for (const group of groups) await ensureSegment(db, resend, s, group);
    } else if (body.action === "enable" || body.action === "pause") {
      if (body.action === "enable") {
        const resend = provider();
        await resend.verifySender(s.from_email);
        if (!process.env.RESEND_WEBHOOK_SECRET)
          throw new Error("webhook_not_configured");
        const problems = await must(
          db
            .from("newsletter_campaigns")
            .select("id")
            .in("status", [
              "uncertain",
              "creating",
              "submitting",
              "paused",
              "failed",
            ])
            .limit(1),
        );
        if (problems?.length) throw new Error("manual_reconciliation_required");
        if (!s.segments.general) throw new Error("prepare_segments_first");
        const usage = await resend.call<ResendUsage>("/usage");
        if (usage.contacts.used >= Math.min(1000, usage.contacts.limit))
          throw new Error("free_contact_limit");
      }
      await must(
        db.rpc("newsletter_set_enabled", {
          p_enabled: body.action === "enable",
          actor_id: auth.user.id,
        }),
      );
    } else if (body.action === "preview") {
      const edition = await automaticNewsletter(new Date().getUTCDay());
      return Response.json(
        {
          content: edition.content,
          ...renderResendNewsletter(edition.content),
        },
        { headers },
      );
    } else throw new Error("invalid_action");
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return Response.json({ error: errorCode(e) }, { status: 400, headers });
  } finally {
    if (tok) await db.rpc("newsletter_release", { tok });
  }
}
