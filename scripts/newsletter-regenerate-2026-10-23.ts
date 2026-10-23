// One explicitly authorized regeneration. No email API, campaign creation or settings activation.
// Run only in the existing Lovable runtime; never print or export environment credentials.
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  automaticNewsletter,
  validateScheduledNewsletter,
} from "../src/lib/newsletter-sources.server";
import { newsletterHistory } from "../src/lib/newsletter-edition-history.server";
import { newsletterDraftContentSchema } from "../src/lib/newsletter-drafts";
import { renderResendNewsletter } from "../src/lib/newsletter";

const day = "2026-10-23",
  id = "b504c856-84cf-41c8-aca9-6fd40247ef16";
for (const name of [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_API_KEY",
])
  if (!process.env[name])
    throw new Error("regeneration_runtime_not_configured");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
async function must<T>(
  p: PromiseLike<{ data: T; error: unknown }>,
): Promise<T> {
  const r = await p;
  if (r.error) throw new Error("regeneration_database_failed");
  return r.data;
}
const token = await must(db.rpc("newsletter_acquire"));
if (!token) throw new Error("newsletter_busy");
const diagnostics: unknown[] = [];
const directory = "/tmp/vitale-newsletter-2026-10-23";
mkdirSync(directory, { recursive: true, mode: 0o700 });
try {
  const check = async () => {
    const settings = await must(
      db
        .from("newsletter_settings")
        .select("enabled")
        .eq("singleton", true)
        .single(),
    );
    const draft = await must(
      db
        .from("newsletter_drafts")
        .select("id,revision,generation_mode,content,edited_by")
        .eq("id", id)
        .eq("edition_day", day)
        .single(),
    );
    const campaigns = await must(
      db
        .from("newsletter_campaigns")
        .select("id")
        .eq("edition_day", day)
        .limit(1),
    );
    if (
      settings.enabled ||
      campaigns?.length ||
      draft.revision !== 1 ||
      draft.generation_mode !== "fallback" ||
      draft.edited_by
    )
      throw new Error("regeneration_precondition_changed");
    return draft;
  };
  const original = await check();
  writeFileSync(directory + "/before.json", JSON.stringify(original, null, 2), {
    mode: 0o600,
  });
  const history = await newsletterHistory(db, day);
  const edition = await automaticNewsletter(
    5,
    history[0]?.created_at ? new Date(history[0].created_at) : undefined,
    history.map((p) => p.payload.content),
    original.content.editionNumber,
    (event) => diagnostics.push(event),
    "agent",
    {
      prompt:
        "Reescreva a newsletter com copy editorial original: abertura com um foco claro, titulos proprios para cada secao, ganchos e desenvolvimento com detalhes sustentados. Nao copie resumos nem monte um catalogo de pautas. Escolha um foco sustentado nas fontes elegiveis atuais e mantenha-o coerente no assunto, headline e abertura durante eventuais correcoes. Nao recomende bikes indisponiveis. Nao trate preco historico ou HOJE de titulo de video como oferta vigente. Use voz leve e direta do canal, sem inventar fatos ou fingir autoria dos testes.",
    },
  );
  const content = newsletterDraftContentSchema.parse(edition.content);
  await validateScheduledNewsletter(
    content,
    history.map((p) => p.payload.content),
  );
  const rendered = renderResendNewsletter(content);
  writeFileSync(
    directory + "/approved.json",
    JSON.stringify({ ...edition, reviewerApproved: true }, null, 2),
    { mode: 0o600 },
  );
  writeFileSync(directory + "/approved.html", rendered.html, { mode: 0o600 });
  await check();
  if ((await must(db.rpc("newsletter_renew", { tok: token }))) !== true)
    throw new Error("newsletter_lease_expired");
  const saved = await must(
    db
      .from("newsletter_drafts")
      .update({
        content,
        fingerprint: edition.fingerprint,
        generation_mode: "agent",
        revision: 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("edition_day", day)
      .eq("revision", 1)
      .eq("generation_mode", "fallback")
      .is("edited_by", null)
      .select("id,revision,generation_mode")
      .maybeSingle(),
  );
  if (!saved) throw new Error("newsletter_draft_conflict");
  await must(
    db.from("newsletter_preparations").upsert(
      {
        edition_day: day,
        attempts: 3,
        next_attempt_at: null,
        last_error: null,
        feedback: [],
      },
      { onConflict: "edition_day" },
    ),
  );
  console.log(
    JSON.stringify({
      saved,
      subject: content.subject,
      content,
      reviewerApproved: true,
      directory,
      sendingEnabled: false,
    }),
  );
} finally {
  writeFileSync(
    directory + "/diagnostics.json",
    JSON.stringify(diagnostics, null, 2),
    { mode: 0o600 },
  );
  await db.rpc("newsletter_release", { tok: token });
}
