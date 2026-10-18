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
/** Bike/motorcycle comparisons are bike themes; a motorcycle-only review is not. */
export function newsletterBikeTopic(title: string) {
  const text = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    !excludedNewsletterMotorcycle(title) &&
    (!/\b(moto|motos|motocicleta|motocicletas|motocicleta[s]?)\b/.test(text) ||
      /\b(bike|bikes|bicicleta|bicicletas|pedal|pedais|ciclismo|ciclista)\b/.test(
        text,
      ))
  );
}
export function validateNewsletterBikeFocus(content: {
  subject: string;
  headline?: string;
  preheader?: string;
  intro: string;
  bike: { title: string; url: string };
  articles?: { title: string }[];
}) {
  if (
    (content.articles?.[0] &&
      !newsletterBikeTopic(content.articles[0].title)) ||
    !newsletterBikeTopic(content.subject) ||
    (content.headline && !newsletterBikeTopic(content.headline)) ||
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
