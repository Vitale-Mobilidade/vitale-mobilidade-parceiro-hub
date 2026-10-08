import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  applyNewsletterEdit,
  newsletterDraftContentSchema,
} from "./newsletter-drafts";
import { renderResendNewsletter } from "./newsletter";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
async function required<T>(
  result: PromiseLike<{ data: T; error: unknown }>,
): Promise<T> {
  const { data, error } = await result;
  if (error) throw new Error("newsletter_drafts_unavailable");
  return data;
}
const identity = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
});
export async function newsletterDraftAction(
  db: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  if (body.action === "draft_list")
    return {
      drafts: await required(
        db
          .from("newsletter_drafts")
          .select("id,revision,origin,updated_at,content")
          .order("updated_at", { ascending: false })
          .limit(20),
      ),
    };
  if (body.action === "draft_import_test") {
    const existing = await required(
      db
        .from("newsletter_drafts")
        .select("id")
        .eq("origin", "test_import")
        .limit(1),
    );
    if (existing?.length) throw new Error("newsletter_test_already_imported");
    const content = newsletterDraftContentSchema.parse(proof.content);
    content.subject = "#1 — Banco, bateria e boas ideias para o próximo pedal";
    content.headline = "Banco, bateria e boas ideias para o próximo pedal";
    return {
      draft: await required(
        db
          .from("newsletter_drafts")
          .insert({ content, origin: "test_import", edited_by: userId })
          .select("id,revision,origin,updated_at,content")
          .single(),
      ),
    };
  }
  const key = identity.parse(body);
  const draft = await required(
    db
      .from("newsletter_drafts")
      .select("id,revision,origin,updated_at,content")
      .eq("id", key.id)
      .single(),
  );
  if (!draft || draft.revision !== key.revision)
    throw new Error("newsletter_draft_conflict");
  const content = applyNewsletterEdit(
    newsletterDraftContentSchema.parse(draft.content),
    body.edit,
  );
  if (body.action === "draft_render") return renderResendNewsletter(content);
  if (body.action !== "draft_save") throw new Error("invalid_action");
  const saved = await required(
    db
      .from("newsletter_drafts")
      .update({
        content,
        revision: key.revision + 1,
        edited_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", key.id)
      .eq("revision", key.revision)
      .select("id,revision,origin,updated_at,content")
      .maybeSingle(),
  );
  if (!saved) throw new Error("newsletter_draft_conflict");
  return { draft: saved, ...renderResendNewsletter(content) };
}
