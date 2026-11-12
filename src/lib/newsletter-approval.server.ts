import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { newsletterDraftContentSchema } from "./newsletter-drafts";
import { newsletterHistory } from "./newsletter-edition-history.server";
import { newsletterSendAllowed, newsletterWindow } from "./newsletter";
import { newsletterDraftNeedsHold } from "./newsletter-schedule";
import { assertRewriteTime } from "./newsletter-rewrites.server";
import { validateScheduledNewsletter } from "./newsletter-sources.server";

const approvalRequest = z
  .object({
    action: z.enum([
      "draft_approve",
      "draft_send_now",
      "draft_unschedule",
      "draft_reschedule",
    ]),
    id: z.string().uuid(),
    revision: z.number().int().positive(),
  })
  .strict();

async function must<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  if (error) throw new Error("newsletter_database_failed");
  return data;
}

/** Called under the global newsletter lease after authenticating an active admin. */
export async function approveNewsletterDraft(
  db: SupabaseClient,
  userId: string,
  tok: string,
  body: Record<string, unknown>,
) {
  const request = approvalRequest.parse(body);
  const hold = request.action === "draft_unschedule";
  const reschedule = request.action === "draft_reschedule";
  const sendNow = request.action === "draft_send_now";
  const draft = await must(
    db
      .from("newsletter_drafts")
      .select(
        "id,revision,edition_day,fingerprint,content,generation_mode,approved_revision,manual_send_until,schedule_hold",
      )
      .eq("id", request.id)
      .maybeSingle(),
  );
  if (!draft || draft.revision !== request.revision)
    throw new Error("newsletter_draft_conflict");
  if (!draft.edition_day || !draft.fingerprint)
    throw new Error("newsletter_scheduled_draft_invalid");
  const day: string = draft.edition_day;
  const start = Date.parse(`${day}T06:30:00-03:00`);
  if (![1, 3, 5].includes(newsletterWindow(new Date(start)).weekday))
    throw new Error("newsletter_scheduled_draft_invalid");
  const now = new Date();
  const clock = newsletterWindow(now);
  if (hold) assertRewriteTime(day, now);
  if (
    !hold &&
    !sendNow &&
    (day < clock.day || now.getTime() >= start + 120 * 60_000)
  )
    throw new Error("newsletter_approval_window_closed");
  if (reschedule && now.getTime() >= start)
    throw new Error("newsletter_reschedule_window_open");
  if (sendNow && (day !== clock.day || now.getTime() < start))
    throw new Error("newsletter_manual_send_unavailable");

  const campaigns = await must(
    db
      .from("newsletter_campaigns")
      .select("id")
      .eq("edition_day", day)
      .limit(1),
  );
  if (campaigns?.length) throw new Error("newsletter_draft_frozen");
  if (hold) {
    if (!newsletterDraftNeedsHold(draft))
      throw new Error("newsletter_draft_conflict");
    if ((await must(db.rpc("newsletter_renew", { tok }))) !== true)
      throw new Error("newsletter_lease_expired");
    assertRewriteTime(day);
    const saved = await must(
      db
        .from("newsletter_drafts")
        .update({
          revision: draft.revision + 1,
          schedule_hold: true,
          approved_revision: null,
          approved_by: null,
          approved_at: null,
          manual_send_until: null,
        })
        .eq("id", draft.id)
        .eq("revision", draft.revision)
        .select("id")
        .maybeSingle(),
    );
    if (!saved) throw new Error("newsletter_draft_conflict");
    return { held: true, revision: draft.revision + 1 };
  }
  if (!sendNow && reschedule !== !!draft.schedule_hold)
    throw new Error("newsletter_draft_conflict");
  if (sendNow) {
    const settings = await must(
      db
        .from("newsletter_settings")
        .select("enabled")
        .eq("singleton", true)
        .single(),
    );
    if (!settings?.enabled) throw new Error("newsletter_manual_send_paused");
  }
  const alreadyApproved = draft.approved_revision === draft.revision;
  if (
    alreadyApproved &&
    (!sendNow ||
      (draft.manual_send_until &&
        Date.parse(draft.manual_send_until) > now.getTime()))
  )
    return { approved: true, manualUntil: draft.manual_send_until };

  const content = newsletterDraftContentSchema.parse(draft.content);
  const history = await newsletterHistory(db, day);
  await validateScheduledNewsletter(
    content,
    history.map((item) => item.payload.content),
    "human",
  );
  const approvedAt = new Date();
  const manualUntil = sendNow
    ? new Date(
        Math.min(
          approvedAt.getTime() + 30 * 60_000,
          Date.parse(`${day}T00:00:00-03:00`) + 24 * 60 * 60_000,
        ),
      ).toISOString()
    : null;
  if (sendNow && !newsletterSendAllowed(day, manualUntil, approvedAt))
    throw new Error("newsletter_manual_send_unavailable");
  if (reschedule && approvedAt.getTime() >= start)
    throw new Error("newsletter_reschedule_window_open");
  if (!sendNow && approvedAt.getTime() >= start + 120 * 60_000)
    throw new Error("newsletter_approval_window_closed");
  if ((await must(db.rpc("newsletter_renew", { tok }))) !== true)
    throw new Error("newsletter_lease_expired");
  const saved = await must(
    db
      .from("newsletter_drafts")
      .update({
        schedule_hold: false,
        approved_revision: draft.revision,
        approved_by: userId,
        approved_at: approvedAt.toISOString(),
        manual_send_until: manualUntil,
      })
      .eq("id", draft.id)
      .eq("revision", draft.revision)
      .select("id")
      .maybeSingle(),
  );
  if (!saved) throw new Error("newsletter_draft_conflict");
  return { approved: true, manualUntil };
}
