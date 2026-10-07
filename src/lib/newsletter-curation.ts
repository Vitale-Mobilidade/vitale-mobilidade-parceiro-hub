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
  primaryBikeId?: string | null;
  relatedBikeIds?: string[];
  bikeIds?: string[];
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
  // Entire published archive is eligible; newest unseen content first.
  void since;
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
      .filter((x) => Number.isFinite(date(x)) && date(x) <= now.getTime())
      .sort((a, b) => date(b) - date(a));
  const used = new Set<NewsletterCategory>();
  const videoIds = new Set<string>();
  const titles = new Set<string>();
  const bikeIds = new Set<string>();
  const modelKeys = (x: NewsletterCandidate) => {
    const explicit = [
      x.primaryBikeId,
      ...(x.relatedBikeIds ?? []),
      ...(x.bikeIds ?? []),
    ].filter((id): id is string => Boolean(id));
    const named =
      x.title
        .toLowerCase()
        .match(/\b(?:s20\s*pro|v9\s*max|v20\s*max|vl20|gt2000|bw02)\b/g) ?? [];
    return [...explicit, ...named].map((v) =>
      v.replace(/[^a-z0-9]/gi, "").toLowerCase(),
    );
  };
  const chosenA: A[] = [],
    chosenV: V[] = [];
  const take = <T extends NewsletterCandidate>(item: T, target: T[]) => {
    const category = newsletterCategory(item.title, item.contentType);
    const title = item.title.trim().toLowerCase();
    if (
      used.has(category) ||
      modelKeys(item).some((id) => bikeIds.has(id)) ||
      titles.has(title) ||
      (item.videoId && videoIds.has(item.videoId))
    )
      return;
    used.add(category);
    modelKeys(item).forEach((id) => bikeIds.add(id));
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
    if (chosenA.length < 3) take(a, chosenA);
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

export function selectFeaturedNewsletterBike<T extends { id: string }>(
  bikes: T[],
  radarIds: string[],
  relatedIds: string[],
  recentIds: string[] = [],
): T | undefined {
  const eligible = bikes.filter((b) => !radarIds.includes(b.id));
  const fresh = eligible.filter((b) => !recentIds.includes(b.id));
  const pool = fresh.length ? fresh : eligible;
  return pool.find((b) => !relatedIds.includes(b.id)) ?? pool[0];
}
