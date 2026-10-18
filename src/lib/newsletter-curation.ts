import { excludedNewsletterMotorcycle } from "./newsletter-bike-policy";
import {
  newsletterCandidateModels,
  newsletterModelFamily,
} from "./newsletter-models";
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
  recentBikeIds: string[] = [],
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
  const modelKeys = newsletterCandidateModels;
  const recentModels = new Set(recentBikeIds.map(newsletterModelFamily));
  const chosenA: A[] = [],
    chosenV: V[] = [];
  const take = <T extends NewsletterCandidate>(
    item: T,
    target: T[],
    flexible = false,
  ) => {
    const category = newsletterCategory(item.title, item.contentType);
    const title = item.title.trim().toLowerCase();
    if (
      (!flexible &&
        (modelKeys(item).some((id) => recentModels.has(id)) ||
          used.has(category) ||
          modelKeys(item).some((id) => bikeIds.has(id)))) ||
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
  const eligible = (x: NewsletterCandidate) =>
    !excludedNewsletterMotorcycle(
      x.title,
      x.primaryBikeId,
      ...(x.relatedBikeIds ?? []),
      ...(x.bikeIds ?? []),
    );
  const aa = order(articles.filter(eligible)),
    vv = order(videos.filter(eligible));
  // One fresh reading and one different video first; then fill distinct categories.
  for (const a of aa) {
    take(a, chosenA);
    if (chosenA.length) break;
  }
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
  // Finite catalogs must not require six editions of entirely new models.
  // Exhaust diverse options first; then fill with unused sources ranked by
  // model/category variety. Title and underlying-source exclusions stay hard.
  const penalty = (x: NewsletterCandidate) =>
    modelKeys(x).reduce(
      (n, id) =>
        n + (bikeIds.has(id) ? 30 : 0) + (recentModels.has(id) ? 3 : 0),
      0,
    ) + (used.has(newsletterCategory(x.title, x.contentType)) ? 10 : 0);
  const fill = <T extends NewsletterCandidate>(
    list: T[],
    target: T[],
    count: number,
  ) => {
    while (target.length < count) {
      const before = target.length;
      for (const x of [...list].sort((a, b) => penalty(a) - penalty(b))) {
        take(x, target, true);
        if (target.length > before) break;
      }
      if (target.length === before) break;
    }
  };
  fill(aa, chosenA, 3);
  fill(vv, chosenV, 2);
  return { articles: chosenA, videos: chosenV };
}

export function newsletterCategoryLabel(title: string, type?: string) {
  return /pre[cç]o de maluco/i.test(title)
    ? "Preço de maluco"
    : NEWSLETTER_CATEGORY_LABELS[newsletterCategory(title, type)];
}

export function selectFeaturedNewsletterBike<
  T extends { id: string; name?: string },
>(
  bikes: T[],
  radarIds: string[],
  relatedIds: string[],
  recentIds: string[] = [],
): T | undefined {
  const matches = (ids: string[], b: T) =>
    ids.some((id) => newsletterModelFamily(id) === newsletterModelFamily(b.id));
  const score = (b: T) =>
    (matches(relatedIds, b) ? 30 : 0) +
    (matches(radarIds, b) ? 10 : 0) +
    (matches(recentIds, b)
      ? 3 +
        (recentIds.length -
          recentIds.findIndex(
            (id) => newsletterModelFamily(id) === newsletterModelFamily(b.id),
          )) /
          recentIds.length
      : 0);
  return bikes
    .filter((b) => !excludedNewsletterMotorcycle(b.id, b.name))
    .sort((a, b) => score(a) - score(b))[0];
}
