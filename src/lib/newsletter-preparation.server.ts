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
/** A valid simple edition is persisted before paying for prose. Crashes cannot consume the safety copy. */
export async function prepareNewsletterDraft(
  db: SupabaseClient,
  day: string,
  weekday: number,
  token: string,
  history: { created_at: string; payload: { content: NewsletterContent } }[],
  number: number,
  sendingWindow: boolean,
  now = new Date(),
  forceFallback = false,
) {
  let draft = await required(
    db
      .from("newsletter_drafts")
      .select("id,revision,edited_by,generation_mode")
      .eq("edition_day", day)
      .maybeSingle(),
  );
  if (draft && (draft.edited_by || draft.generation_mode !== "fallback"))
    return { ok: true, draftPrepared: false };
  const state = await required(
    db
      .from("newsletter_preparations")
      .select("attempts,next_attempt_at,last_error,feedback")
      .eq("edition_day", day)
      .maybeSingle(),
  );
  if (draft && (forceFallback || sendingWindow || (state?.attempts ?? 0) >= 2))
    return { ok: true, draftPrepared: false };
  if (
    !forceFallback &&
    !sendingWindow &&
    state?.next_attempt_at &&
    Date.parse(state.next_attempt_at) > now.getTime()
  )
    return { ok: true, preparationWaiting: true };
  const attempts = Math.min(3, (state?.attempts ?? 0) + 1);
  const feedback: string[] = Array.isArray(state?.feedback)
    ? state.feedback
    : [];
  const next = new Date(now.getTime() + 30 * 60_000).toISOString();
  const record = (extra: Record<string, unknown>) =>
    required(
      db.from("newsletter_preparations").upsert(
        {
          edition_day: day,
          attempts,
          next_attempt_at: next,
          last_error: "newsletter_preparation_in_progress",
          feedback,
          ...extra,
        },
        { onConflict: "edition_day" },
      ),
    );
  const contentHistory = history.map((p) => p.payload.content).filter(Boolean);
  const generate = (mode: "agent" | "fallback") => {
    const args = [
      weekday,
      history[0]?.created_at ? new Date(history[0].created_at) : undefined,
      contentHistory,
      number,
    ] as const;
    return mode === "fallback"
      ? automaticNewsletter(...args, undefined, "fallback")
      : automaticNewsletter(
          ...args,
          (event) => {
            if (event.stage === "review")
              feedback.splice(
                0,
                feedback.length,
                ...event.issues.slice(0, 10).map((s) => s.slice(0, 2000)),
              );
          },
          "agent",
          { feedback },
        );
  };
  let created = false;
  try {
    await record({}); // Persist the retry/cost budget before any external generation.
    if (!draft) {
      const safety = await generate("fallback");
      const content = newsletterDraftContentSchema.parse(safety.content);
      if ((await required(db.rpc("newsletter_renew", { tok: token }))) !== true)
        throw new Error("newsletter_lease_expired");
      draft = await required(
        db
          .from("newsletter_drafts")
          .insert({
            content,
            fingerprint: safety.fingerprint,
            edition_day: day,
            origin: "agent",
            generation_mode: "fallback",
            edited_by: null,
          })
          .select("id,revision,edited_by,generation_mode")
          .single(),
      );
      created = true;
    }
    if (forceFallback || sendingWindow || attempts >= 3) {
      await record({ next_attempt_at: null, last_error: null });
      return { ok: true, draftPrepared: created, fallback: true };
    }
    if (!draft) throw new Error("newsletter_database_failed");
    const edition = await generate("agent");
    const content = newsletterDraftContentSchema.parse(edition.content);
    if ((await required(db.rpc("newsletter_renew", { tok: token }))) !== true)
      throw new Error("newsletter_lease_expired");
    const campaigns = await required(
      db
        .from("newsletter_campaigns")
        .select("id")
        .eq("edition_day", day)
        .limit(1),
    );
    if (campaigns?.length) return { ok: true, draftPrepared: false };
    const saved = await required(
      db
        .from("newsletter_drafts")
        .update({
          content,
          fingerprint: edition.fingerprint,
          generation_mode: "agent",
          revision: draft.revision + 1,
          updated_at: now.toISOString(),
        })
        .eq("id", draft.id)
        .eq("revision", draft.revision)
        .is("edited_by", null)
        .select("id")
        .maybeSingle(),
    );
    if (!saved) throw new Error("newsletter_draft_conflict");
    await record({ next_attempt_at: null, last_error: null });
    return { ok: true, draftPrepared: true, fallback: false };
  } catch (error) {
    const code =
      error instanceof Error && /^[a-z_]+$/.test(error.message)
        ? error.message
        : "newsletter_preparation_failed";
    if (
      [
        "newsletter_database_failed",
        "newsletter_lease_expired",
        "newsletter_draft_conflict",
      ].includes(code)
    )
      throw error;
    await record({
      last_error: code,
      next_attempt_at: draft && attempts >= 2 ? null : next,
      feedback,
    });
    return {
      ok: !!draft,
      draftPrepared: created,
      fallback: !!draft,
      preparationRetry: !draft || attempts < 2,
      error: code,
    };
  }
}
