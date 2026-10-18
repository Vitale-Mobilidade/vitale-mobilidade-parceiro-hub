import { newsletterHistory as rewriteHistory } from "./newsletter-edition-history.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  automaticNewsletter,
  validateScheduledNewsletter,
} from "./newsletter-sources.server";
import { newsletterDraftContentSchema } from "./newsletter-drafts";
import { renderResendNewsletter, newsletterWindow } from "./newsletter";
import type { NewsletterContent } from "./newsletter";
type History = {
  created_at: string;
  payload: { content: NewsletterContent };
}[];
async function must<T>(p: PromiseLike<{ data: T; error: unknown }>) {
  const r = await p;
  if (r.error) throw new Error("newsletter_database_failed");
  return r.data;
}
export function assertRewriteTime(
  day: string | null | undefined,
  now = new Date(),
) {
  const window = newsletterWindow(now);
  if (
    !day ||
    day < window.day ||
    (day === window.day && now.getTime() >= Date.parse(`${day}T06:20:00-03:00`))
  )
    throw new Error("newsletter_rewrite_too_late");
}
async function draftForRewrite(
  db: SupabaseClient,
  id: string,
  revision: number,
) {
  const draft = await must(
    db.from("newsletter_drafts").select("*").eq("id", id).single(),
  );
  if (!draft || draft.revision !== revision)
    throw new Error("newsletter_draft_conflict");
  assertRewriteTime(draft.edition_day);
  const campaigns = await must(
    db
      .from("newsletter_campaigns")
      .select("id")
      .eq("edition_day", draft.edition_day)
      .limit(1),
  );
  if (campaigns?.length) throw new Error("newsletter_draft_frozen");
  return draft;
}
/** Called only after admin authentication and while holding the existing global lease. */
export async function newsletterRewriteAction(
  db: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  if (body.action === "draft_prompt") {
    const input = z
      .object({
        action: z.literal("draft_prompt"),
        id: z.string().uuid(),
        revision: z.number().int().positive(),
        prompt: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(body);
    await draftForRewrite(db, input.id, input.revision);
    const existing = await must(
      db
        .from("newsletter_rewrites")
        .select("id,status,prompt,base_revision")
        .eq("draft_id", input.id)
        .in("status", ["queued", "running", "ready"])
        .maybeSingle(),
    );
    if (existing) throw new Error("newsletter_rewrite_pending");
    const job = await must(
      db
        .from("newsletter_rewrites")
        .insert({
          draft_id: input.id,
          base_revision: input.revision,
          prompt: input.prompt,
          actor_id: userId,
        })
        .select("id,status")
        .single(),
    );
    return { job };
  }
  const input = z
    .object({
      action: z.enum([
        "draft_prompt_preview",
        "draft_prompt_apply",
        "draft_prompt_discard",
      ]),
      jobId: z.string().uuid(),
    })
    .strict()
    .parse(body);
  const job = await must(
    db.from("newsletter_rewrites").select("*").eq("id", input.jobId).single(),
  );
  if (!job) throw new Error("newsletter_rewrite_unavailable");
  if (input.action === "draft_prompt_discard") {
    await must(
      db
        .from("newsletter_rewrites")
        .update({ status: "conflict", updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .in("status", ["queued", "running", "ready"]),
    );
    return { discarded: true };
  }
  if (job.status !== "ready" || !job.candidate)
    throw new Error("newsletter_rewrite_unavailable");
  const content = newsletterDraftContentSchema.parse(job.candidate.content);
  if (input.action === "draft_prompt_preview")
    return renderResendNewsletter(content);
  const draft = await draftForRewrite(db, job.draft_id, job.base_revision);
  if (content.editionNumber !== draft.content.editionNumber)
    throw new Error("newsletter_draft_conflict");
  await validateScheduledNewsletter(
    content,
    (await rewriteHistory(db, draft.edition_day)).map((p) => p.payload.content),
  );
  const saved = await must(
    db
      .from("newsletter_drafts")
      .update({
        content,
        fingerprint: job.candidate.fingerprint,
        generation_mode: "agent",
        edited_by: userId,
        revision: job.base_revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.draft_id)
      .eq("revision", job.base_revision)
      .select(
        "id,revision,origin,edition_day,generation_mode,updated_at,content",
      )
      .maybeSingle(),
  );
  if (!saved) throw new Error("newsletter_draft_conflict");
  await must(
    db
      .from("newsletter_rewrites")
      .update({ status: "applied", updated_at: new Date().toISOString() })
      .eq("id", job.id),
  );
  return { draft: saved, ...renderResendNewsletter(content) };
}
/** Durable supervisor: at most two paid pipeline executions; resumes after crashes without resetting attempts. */
export async function processNewsletterRewrite(
  db: SupabaseClient,
  token: string,
  now = new Date(),
) {
  const rows = await must(
    db
      .from("newsletter_rewrites")
      .select("*")
      .in("status", ["queued", "running"])
      .lte("next_attempt_at", now.toISOString())
      .order("created_at")
      .limit(1),
  );
  const job = rows?.[0];
  if (!job) return false;
  const update = (value: Record<string, unknown>) =>
    must(
      db
        .from("newsletter_rewrites")
        .update({ ...value, updated_at: now.toISOString() })
        .eq("id", job.id),
    );
  if (job.attempts >= 2) {
    await update({
      status: "failed",
      last_error: "newsletter_rewrite_attempts_exhausted",
    });
    return true;
  }
  const feedback: string[] = Array.isArray(job.feedback) ? job.feedback : [];
  try {
    const draft = await draftForRewrite(db, job.draft_id, job.base_revision);
    await update({
      status: "running",
      attempts: job.attempts + 1,
      next_attempt_at: new Date(now.getTime() + 10 * 60_000).toISOString(),
    });
    const history = await rewriteHistory(db, draft.edition_day);
    const weekday = new Date(`${draft.edition_day}T12:00:00Z`).getUTCDay();
    const edition = await automaticNewsletter(
      weekday,
      history[0]?.created_at ? new Date(history[0].created_at) : undefined,
      history.map((p) => p.payload.content),
      draft.content.editionNumber,
      (event) => {
        if (event.stage === "review")
          feedback.splice(0, feedback.length, ...event.issues.slice(0, 10));
      },
      "agent",
      { prompt: job.prompt, feedback },
    );
    const content = newsletterDraftContentSchema.parse(edition.content);
    await validateScheduledNewsletter(
      content,
      history.map((p) => p.payload.content),
    );
    renderResendNewsletter(content);
    if ((await must(db.rpc("newsletter_renew", { tok: token }))) !== true)
      throw new Error("newsletter_lease_expired");
    await draftForRewrite(db, job.draft_id, job.base_revision);
    await update({
      status: "ready",
      candidate: { content, fingerprint: edition.fingerprint },
      feedback: [],
      last_error: null,
    });
  } catch (error) {
    const code =
      error instanceof Error && /^[a-z_]+$/.test(error.message)
        ? error.message
        : "newsletter_rewrite_failed";
    if (
      ["newsletter_database_failed", "newsletter_lease_expired"].includes(code)
    )
      throw error;
    const conflict = [
      "newsletter_draft_conflict",
      "newsletter_draft_frozen",
      "newsletter_rewrite_too_late",
    ].includes(code);
    await update({
      status: conflict
        ? "conflict"
        : job.attempts + 1 >= 2
          ? "failed"
          : "queued",
      last_error: code,
      feedback,
      next_attempt_at: new Date(now.getTime() + 10 * 60_000).toISOString(),
    });
  }
  return true;
}
