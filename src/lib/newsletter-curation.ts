export type NewsletterCategory =
  "comparison" | "practical" | "review" | "guide" | "price" | "variety";
export const NEWSLETTER_CATEGORY_LABELS = {
  comparison: "Comparativo",
  practical: "Teste na prática",
  review: "Conheça a bike",
  guide: "Guia e dicas",
  price: "Preços e mercado",
  variety: "Variedades",
} as const satisfies Record<NewsletterCategory, string>;
export function newsletterCategory(
  title: string,
  type?: string,
): NewsletterCategory {
  const t = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (
    ["direct_comparison", "use_comparison", "comparison"].includes(
      type ?? "",
    ) ||
    /\b(vs|versus|comparativo|comparando)\b|\bou\b.+\b(escolha|melhor|qual|vale|zurbe|bike)\b/.test(
      t,
    )
  )
    return "comparison";
  if (
    type === "real_world_test" ||
    /teste (na pratica|pratico|real)|testando|\btestei\b|\bsubida\b|\bna pratica\b/.test(
      t,
    )
  )
    return "practical";
  if (
    type === "market_price" ||
    /preco de maluco|por menos de r\$|\b(preco|promocao|desconto|oferta|barata|barato)\b/.test(
      t,
    )
  )
    return "price";
  if (
    [
      "buying_guide",
      "audience_need",
      "education",
      "guide",
      "tips",
      "economy",
    ].includes(type ?? "") ||
    /\b(como|dicas|guia|cuidados|manutencao)\b/.test(t)
  )
    return "guide";
  if (
    type === "product_review" ||
    type === "test" ||
    /\b(review|analise|apresentando|conheca)\b/.test(t)
  )
    return "review";
  return "variety";
}
export type NewsletterCandidate = {
  title: string;
  contentType?: string;
  publishedAt?: string | null;
  date?: string | null;
  videoId?: string;
};
/** Diversity across media, not just within each list. Never fill scarce slots with duplicates. */
export function curateNewsletter<
  A extends NewsletterCandidate,
  V extends NewsletterCandidate,
>(
  articles: A[],
  videos: V[],
  since: Date,
  now = new Date(),
  excludedTitles: string[] = [],
) {
  const cutoff = Math.min(since.getTime(), now.getTime()) - 30 * 86_400_000;
  const date = (x: NewsletterCandidate) =>
    Date.parse(x.publishedAt ?? x.date ?? "");
  const order = <T extends NewsletterCandidate>(list: T[]) =>
    list
      .filter(
        (x) =>
          !excludedTitles.some(
            (t) => t.trim().toLowerCase() === x.title.trim().toLowerCase(),
          ),
      )
      .filter(
        (x) =>
          Number.isFinite(date(x)) &&
          date(x) >= cutoff &&
          date(x) <= now.getTime(),
      )
      .sort((a, b) => date(b) - date(a));
  const used = new Set<NewsletterCategory>();
  const videoIds = new Set<string>();
  const titles = new Set<string>();
  const chosenA: A[] = [],
    chosenV: V[] = [];
  const take = <T extends NewsletterCandidate>(item: T, target: T[]) => {
    const category = newsletterCategory(item.title, item.contentType);
    const title = item.title.trim().toLowerCase();
    if (
      used.has(category) ||
      titles.has(title) ||
      (item.videoId && videoIds.has(item.videoId))
    )
      return;
    used.add(category);
    titles.add(title);
    if (item.videoId) videoIds.add(item.videoId);
    target.push(item);
  };
  const aa = order(articles),
    vv = order(videos);
  // One fresh reading and one different video first; then fill distinct categories.
  if (aa[0]) take(aa[0], chosenA);
  for (const v of vv) {
    take(v, chosenV);
    if (chosenV.length) break;
  }
  for (const a of aa) {
    if (chosenA.length < 2) take(a, chosenA);
  }
  for (const v of vv) {
    if (chosenV.length < 2) take(v, chosenV);
  }
  return { articles: chosenA, videos: chosenV };
}

export function newsletterCategoryLabel(title: string, type?: string) {
  return /pre[cç]o de maluco/i.test(title)
    ? "Preço de maluco"
    : NEWSLETTER_CATEGORY_LABELS[newsletterCategory(title, type)];
}
