import type { SupabaseClient } from "@supabase/supabase-js";
import { automaticNewsletter } from "./newsletter-sources.server";
import { newsletterDraftContentSchema } from "./newsletter-drafts";
import type { NewsletterContent } from "./newsletter";
async function required<T>(
  operation: PromiseLike<{ data: T; error: unknown }>,
) {
  const result = await operation;
  if (result.error) throw new Error("newsletter_database_failed");
  return result.data;
}
export async function prepareNewsletterDraft(
  db: SupabaseClient,
  day: string,
  weekday: number,
  token: string,
  history: { created_at: string; payload: { content: NewsletterContent } }[],
  number: number,
  sendingWindow: boolean,
  now = new Date(),
) {
  const draft = await required(
    db
      .from("newsletter_drafts")
      .select("id")
      .eq("edition_day", day)
      .maybeSingle(),
  );
  if (draft) return { ok: true, draftPrepared: false };
  const state = await required(
    db
      .from("newsletter_preparations")
      .select("attempts,next_attempt_at,last_error")
      .eq("edition_day", day)
      .maybeSingle(),
  );
  if (
    state?.next_attempt_at &&
    Date.parse(state.next_attempt_at) > now.getTime()
  )
    return { ok: true, preparationWaiting: true };
  const attempts = Math.min(3, (state?.attempts ?? 0) + 1);
  const fallback = sendingWindow || attempts >= 3;
  // Persist before invoking any model: a crash must not reset the paid retry budget.
  await required(
    db.from("newsletter_preparations").upsert(
      {
        edition_day: day,
        attempts,
        next_attempt_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        last_error: "newsletter_preparation_in_progress",
      },
      { onConflict: "edition_day" },
    ),
  );
  try {
    const edition = await automaticNewsletter(
      weekday,
      history[0]?.created_at ? new Date(history[0].created_at) : undefined,
      history.map((p) => p.payload.content).filter(Boolean),
      number,
      undefined,
      fallback ? "fallback" : "agent",
    );
    const content = newsletterDraftContentSchema.parse(edition.content);
    if ((await required(db.rpc("newsletter_renew", { tok: token }))) !== true)
      throw new Error("newsletter_lease_expired");
    await required(
      db.from("newsletter_drafts").insert({
        content,
        fingerprint: edition.fingerprint,
        edition_day: day,
        origin: "agent",
        generation_mode: fallback ? "fallback" : "agent",
        edited_by: null,
      }),
    );
    await required(
      db
        .from("newsletter_preparations")
        .update({ last_error: null, next_attempt_at: null })
        .eq("edition_day", day),
    );
    return { ok: true, draftPrepared: true, fallback };
  } catch (error) {
    const code =
      error instanceof Error && /^[a-z_]+$/.test(error.message)
        ? error.message
        : "newsletter_preparation_failed";
    if (
      code === "newsletter_database_failed" ||
      code === "newsletter_lease_expired"
    )
      throw error;
    await required(
      db
        .from("newsletter_preparations")
        .update({ last_error: code })
        .eq("edition_day", day),
    );
    return { ok: false, preparationRetry: true, error: code };
  }
}
