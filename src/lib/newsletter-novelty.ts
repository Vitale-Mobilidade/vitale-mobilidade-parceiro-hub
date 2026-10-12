import type { NewsletterContent } from "./newsletter";
const words = (s: string) =>
  s
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^#\d+\s*[—-]?\s*/, "")
    .match(/[a-z0-9]+/g) ?? [];
const shingles = (s: string) => {
  const tokens = words(s);
  return new Set(
    tokens.slice(0, -3).map((_, i) => tokens.slice(i, i + 4).join(" ")),
  );
};
/** Catch copied structure/text locally; semantic angle also remains the reviewer's job. */
export function validateNewsletterNovelty(
  content: Pick<NewsletterContent, "subject" | "headline" | "intro">,
  history: NewsletterContent[],
) {
  for (const previous of history) {
    for (const field of ["subject", "headline"] as const) {
      if (
        content[field] &&
        previous[field] &&
        words(content[field]!).join(" ") === words(previous[field]!).join(" ")
      )
        throw new Error("newsletter_editorial_repeated");
    }
    const current = shingles(content.intro),
      past = shingles(previous.intro);
    if (
      current.size >= 10 &&
      past.size >= 10 &&
      [...current].filter((s) => past.has(s)).length /
        Math.min(current.size, past.size) >=
        0.5
    )
      throw new Error("newsletter_editorial_repeated");
  }
}
