/** Editorial eligibility only; catalog records and public routes remain intact. */
export function excludedNewsletterMotorcycle(
  ...values: (string | null | undefined)[]
) {
  return values.some((value) =>
    /\b(?:evs|ev\s*1)\b/.test(
      (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " "),
    ),
  );
}
export function validateNewsletterBikeFocus(content: {
  subject: string;
  headline?: string;
  preheader?: string;
  intro: string;
  bike: { title: string; url: string };
}) {
  if (
    excludedNewsletterMotorcycle(
      content.subject,
      content.headline,
      content.preheader,
      content.intro,
      content.bike.title,
      content.bike.url,
    )
  ) {
    throw new Error("newsletter_motorcycle_highlight_excluded");
  }
}
