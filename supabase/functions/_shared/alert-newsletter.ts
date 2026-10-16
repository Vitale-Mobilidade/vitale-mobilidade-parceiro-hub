export const COMBINED_CONSENT_TEXT = "Autorizo a Vitale Mobilidade a guardar meu nome, WhatsApp, e-mail e preferência de preço, a me contatar sobre quedas de preço desta bike e a me inscrever na newsletter. Posso cancelar os alertas e me descadastrar da newsletter a qualquer momento.";

/** Only insert: existing preferences and suppressions must never be overwritten. */
export async function registerAlertNewsletter(
  consent: unknown,
  contact: { name: string; email: string; sourceUrl: string | null; now: string },
  insert: (row: Record<string, unknown>, options: { onConflict: "email"; ignoreDuplicates: true }) => PromiseLike<{ error: unknown }>,
): Promise<"not_requested" | "registered" | "failed"> {
  if (consent !== true) return "not_requested";
  try {
    const { error } = await insert({
      person_name: contact.name, email: contact.email, interest: "radar",
      status: "interested", delivery_enabled: false,
      consent_text: COMBINED_CONSENT_TEXT, consent_version: "v2",
      consent_at: contact.now, source_url: contact.sourceUrl,
      updated_at: contact.now,
    }, { onConflict: "email", ignoreDuplicates: true });
    return error ? "failed" : "registered";
  } catch { return "failed"; }
}
