import {
  assertNewsletterEditorial,
  assertNewsletterArticleImages,
  selectNewsletterArticleImage,
  newsletterCandidateHasOffers,
} from "./newsletter-delivery-policy";
import type { NewsletterEditorialDirection } from "./newsletter-writer.server";
import { newsletterVideoImage } from "./newsletter-images.server";
import {
  newsletterReaderTopic,
  validateNewsletterBikeFocus,
} from "./newsletter-bike-policy";
import {
  newsletterUsedSources,
  curateNewsletterSources,
} from "./newsletter-source-memory";
import { validateNewsletterNovelty } from "./newsletter-novelty";
import { newsletterCandidateBikeIds } from "./newsletter-models";
import {
  newsletterMemory,
  validateNewsletterSelection,
} from "./newsletter-memory";
import {
  fetchPublishedIndex,
  fetchPublishedArticle,
} from "./editorial-repository.server";
import { fetchTrackerSplit } from "./radar-repository.server";
import { fetchVideoCatalog } from "./video-catalog.server";
import { fetchBikeCatalogFromDb } from "./bikes-repository.server";
import { persistentBikeImage } from "./bike-catalog";
import {
  renderResendNewsletter,
  numberNewsletterSubject,
  newsletterImageSchema,
  type NewsletterContent,
} from "./newsletter";
import {
  writeNewsletter,
  type NewsletterEvidence,
  type NewsletterWriterDiagnostic,
} from "./newsletter-writer.server";
import {
  selectNewsletterDrops,
  type NewsletterDropBike,
} from "./newsletter-pauta";
import {
  selectFeaturedNewsletterBike,
  newsletterCategoryLabel,
} from "./newsletter-curation";
import { newsletterTranscripts } from "./newsletter-transcripts.server";
import { sourceNewsletterFallback } from "./newsletter-fallback";
import { createHash } from "node:crypto";
export async function automaticNewsletter(
  weekday: number,
  since = new Date(Date.now() - (weekday === 1 ? 3 : 2) * 86_400_000),
  previousEditions: NewsletterContent[] = [],
  editionNumber = 1,
  onDiagnostic?: (event: NewsletterWriterDiagnostic) => void,
  mode: "agent" | "fallback" = "agent",
  direction?: NewsletterEditorialDirection,
): Promise<{
  content: NewsletterContent;
  fingerprint: string;
  recovered?: boolean;
}> {
  const [articles, radar, videos, catalog] = await Promise.all([
    fetchPublishedIndex(),
    fetchTrackerSplit(),
    fetchVideoCatalog(),
    fetchBikeCatalogFromDb(),
  ]);
  if (!articles?.length || !radar.ok || !videos.length || !catalog?.length)
    throw new Error("newsletter_sources_unavailable");
  const activeIds = new Set(
    (radar.data.active as { id: string }[]).map((b) => b.id),
  );
  const eligible = (
    candidate: Parameters<typeof newsletterCandidateHasOffers>[0],
  ) => newsletterCandidateHasOffers(candidate, catalog, activeIds);
  const memory = newsletterMemory(previousEditions, articles, videos, catalog);
  const usedSources = await newsletterUsedSources(
    previousEditions,
    fetchPublishedArticle,
  );
  const curated = await curateNewsletterSources(
    memory.articles
      .filter(
        (a) =>
          !a.newsletterUsed && newsletterReaderTopic(a.title) && eligible(a),
      )
      .map((a) => ({ ...a, bikeIds: newsletterCandidateBikeIds(a, catalog) })),
    videos
      .filter((v) => newsletterReaderTopic(v.title) && eligible(v))
      .map((v) => ({ ...v, bikeIds: newsletterCandidateBikeIds(v, catalog) }))
      .filter(
        (v) =>
          !previousEditions.some((p) =>
            p.videos.some(
              (x) =>
                new URL(x.url).pathname === new URL(v.url).pathname &&
                new URL(x.url).searchParams.get("v") ===
                  new URL(v.url).searchParams.get("v"),
            ),
          ),
      ),
    fetchPublishedArticle,
    usedSources,
    since,
    new Date(),
    previousEditions.flatMap((p) =>
      [...p.articles, ...p.videos].map((x) => x.title),
    ),
    memory.recentBikeIds,
  );
  const pickedArticles = curated.articles;
  const pickedVideos = curated.videos;
  const fullArticles = curated.fullArticles;
  if (
    (mode === "agent" ? pickedArticles.length !== 3 : !pickedArticles.length) ||
    !pickedVideos.length
  )
    throw new Error("newsletter_sources_insufficient_diversity");
  const drops = selectNewsletterDrops(
    radar.data.active as NewsletterDropBike[],
    since,
    new Date(),
  );
  const related = [
    ...pickedVideos.flatMap((v) => v.bikeIds),
    ...pickedArticles.flatMap((a) => a.bikeIds),
  ];
  const bikes = (radar.data.active as { id: string; name: string }[]).filter(
    (b) =>
      typeof b.id === "string" &&
      /^[a-z0-9_]+$/.test(b.id) &&
      typeof b.name === "string" &&
      catalog.some((c) => c.bikeId === b.id),
  );
  const bike = selectFeaturedNewsletterBike(
    bikes,
    drops.map((d) => d.id),
    related.filter((id): id is string => Boolean(id)),
    memory.recentBikeIds,
  );
  if (!bike) throw new Error("newsletter_no_active_bike");
  const details = catalog.find((c) => c.bikeId === bike.id);
  if (!details) throw new Error("newsletter_sources_unavailable");
  const transcripts =
    mode === "fallback"
      ? new Map<string, string>()
      : await newsletterTranscripts([
          ...fullArticles.flatMap((a) => (a ? [a.videoId] : [])),
          ...pickedVideos.map((v) => v.videoId),
        ]);
  const brl = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  const sources: NewsletterEvidence[] = [
    ...pickedArticles.map((a, i) => {
      const full = fullArticles[i];
      if (!full) throw new Error("newsletter_sources_unavailable");
      return {
        id: `article-${i}`,
        title: a.title,
        publishedSummary: a.summary,
        text: [
          a.publishedAt ? `Publicado em ${a.publishedAt}.` : "",
          a.summary,
          transcripts.get(full.videoId) ?? "",
          ...full.blocks
            .filter((b) => !b.planned)
            .map((b) => [b.heading, b.text].filter(Boolean).join("\n")),
        ]
          .join("\n\n")
          .slice(0, 12_000),
      };
    }),
    {
      id: "bike",
      title: bike.name,
      publishedSummary: details.description ?? undefined,
      text: [
        bike.name,
        details.description,
        details.autonomy
          ? `Autonomia informada na ficha: ${details.autonomy}. Não é garantia de alcance em todo trajeto.`
          : "",
        details.capacity
          ? `Capacidade informada na ficha: ${details.capacity}.`
          : "",
        "Consulte a ficha, o preço vigente e o histórico no Radar. A bike tem oferta ativa no momento da preparação.",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000),
    },
    ...pickedVideos.map((v, i) => ({
      id: `video-${i}`,
      title: v.title,
      text: `Título do vídeo: ${v.title}. Data informada no catálogo: ${v.date ?? "não informada"}. ${transcripts.has(v.videoId) ? "Transcrição da fonte: " + transcripts.get(v.videoId) : "Sem transcrição fornecida: a única pauta confirmada é a do título. Não afirmar resultados, recomendações ou testes feitos no vídeo."}`,
    })),
  ];
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([sources, drops]))
    .digest("hex");
  const draft =
    mode === "fallback"
      ? sourceNewsletterFallback(sources)
      : await writeNewsletter(
          sources,
          weekday,
          undefined,
          memory.previousEditorial,
          onDiagnostic,
          direction,
        );
  const enrich = (id: string) => {
    const s = draft.sections.find((s) => s.id === id);
    if (!s) throw new Error("newsletter_writer_source_mismatch");
    return {
      ...(s.title ? { title: s.title } : {}),
      paragraphs: s.paragraphs,
      bullets: s.bullets,
    };
  };
  const image = (url: string | null | undefined) =>
    url && newsletterImageSchema.safeParse(url).success ? { image: url } : {};
  const videoImages = await Promise.all(
    pickedVideos.map((v) => newsletterVideoImage(v.videoId, v.thumbnail)),
  );
  const articleImages = new Map<string, string>();
  // Prefer the finished article cover. Compose a newsletter cover only when it
  // is missing; use the source thumbnail only if neither cover is available.
  for (const [i, article] of pickedArticles.entries()) {
    let selected = selectNewsletterArticleImage(article.ogImageUrl);
    if (!selected) {
      const { newsletterArticleImage } =
        await import("./newsletter-article-image.server");
      const result = await newsletterArticleImage(article.id);
      await result.body?.cancel();
      if (result.ok)
        selected = selectNewsletterArticleImage(
          `https://vitalemobilidade.com/api/public/newsletter-image?id=${article.id}`,
        );
    }
    if (!selected)
      selected = selectNewsletterArticleImage(
        await newsletterVideoImage(fullArticles[i].videoId),
      );
    if (selected) articleImages.set(article.id, selected);
  }
  let content: NewsletterContent = {
    editionNumber,
    sourceVideoIds: [
      ...new Set([
        ...fullArticles.map((a) => a.videoId),
        ...pickedVideos.map((v) => v.videoId),
      ]),
    ],
    mentionedBikeIds: [
      ...new Set([
        bike.id,
        ...drops.map((d) => d.id),
        ...related.filter((id): id is string => Boolean(id)),
      ]),
    ],
    subject: numberNewsletterSubject(draft.subject, editionNumber),
    headline: draft.headline,
    preheader: draft.preheader,
    intro: draft.opening.join("\n\n"),
    articles: pickedArticles.map((a, i) => ({
      title: a.title,
      category: newsletterCategoryLabel(a.title, a.contentType),
      url: `https://vitalemobilidade.com/conteudos/${a.slug}`,
      ...image(articleImages.get(a.id)),
      ...enrich(`article-${i}`),
    })),
    radar: {
      title: "Radar de preços",
      url: "https://vitalemobilidade.com/radar",
    },
    drops: drops.map((d) => ({
      title: catalog.find((c) => c.bikeId === d.id)?.name ?? d.name,
      previousPrice: brl(d.previous),
      currentPrice: brl(d.current),
      baselineDate: d.baselineDate,
      dropLabel: `−${d.percent.toFixed(1).replace(".", ",")}%`,
      checkedAt: new Date(d.verifiedAt).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
      image:
        persistentBikeImage(
          d.id,
          process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
        ) ?? undefined,
      url: `https://vitalemobilidade.com/radar/${d.id}`,
    })),
    bike: {
      title: bike.name,
      url: `https://vitalemobilidade.com/radar/${bike.id}`,
      ...image(
        persistentBikeImage(
          bike.id,
          process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
        ),
      ),
      ...enrich("bike"),
    },
    videos: pickedVideos.map((v, i) => ({
      title: v.title,
      category: newsletterCategoryLabel(v.title),
      url: v.url,
      ...image(videoImages[i] ?? v.thumbnail),
      ...enrich(`video-${i}`),
    })),
  };
  validateNewsletterSelection(
    content,
    previousEditions,
    articles,
    videos,
    catalog,
  );
  validateNewsletterNovelty(content, previousEditions);
  validateNewsletterBikeFocus(content);
  if (mode === "agent") {
    assertNewsletterEditorial(content);
    assertNewsletterArticleImages(content);
  }
  let recovered = false;
  if (mode === "agent") {
    const result = await recoverNewsletterAvailability(content);
    content = result.content;
    recovered = result.changed;
  }
  renderResendNewsletter(content);
  return {
    content,
    recovered,
    fingerprint: createHash("sha256")
      .update(fingerprint + JSON.stringify(content))
      .digest("hex"),
  };
}

export async function validateScheduledNewsletter(
  content: NewsletterContent,
  history: NewsletterContent[],
) {
  assertNewsletterEditorial(content);
  assertNewsletterArticleImages(content);
  validateNewsletterBikeFocus(content);
  const [articles, videos, catalog] = await Promise.all([
    fetchPublishedIndex(),
    fetchVideoCatalog(),
    fetchBikeCatalogFromDb(),
  ]);
  if (!articles?.length || !videos.length || !catalog?.length)
    throw new Error("newsletter_sources_unavailable");
  const usedSources = await newsletterUsedSources(
    history,
    fetchPublishedArticle,
  );
  const currentSources = content.sourceVideoIds ?? [
    ...(
      await Promise.all(
        content.articles.map((a) =>
          fetchPublishedArticle(new URL(a.url).pathname.split("/").pop()!),
        ),
      )
    ).map((a) => {
      if (!a) throw new Error("newsletter_sources_unavailable");
      return a.videoId;
    }),
    ...content.videos.map(
      (v) =>
        new URL(v.url).searchParams.get("v") ??
        new URL(v.url).pathname.split("/").pop()!,
    ),
  ];
  if (currentSources.some((id) => usedSources.has(id)))
    throw new Error("newsletter_source_already_used");
  validateNewsletterSelection(content, history, articles, videos, catalog);
  await validateNewsletterCurrentOffers(content);
  validateNewsletterNovelty(content, history);
  if (
    content.articles.some((a) =>
      a.paragraphs?.some(
        (p) =>
          p ===
          "Leia o artigo completo publicado pela Vitale para acompanhar o assunto apresentado no título.",
      ),
    )
  )
    throw new Error("newsletter_generic_fallback_review_required");
}

/** Re-read atomic current offers immediately before delivery, including frozen campaigns. */
export async function validateNewsletterCurrentOffers(
  content: NewsletterContent,
) {
  assertNewsletterEditorial(content);
  const [radar, catalog, articles, videos] = await Promise.all([
    fetchTrackerSplit(),
    fetchBikeCatalogFromDb(),
    fetchPublishedIndex(),
    fetchVideoCatalog(),
  ]);
  if (!radar.ok || !catalog?.length || !articles || !videos?.length)
    throw new Error("newsletter_sources_unavailable");
  const activeIds = new Set(
    (radar.data.active as { id: string }[]).map((b) => b.id),
  );
  const eligible = (x: Parameters<typeof newsletterCandidateHasOffers>[0]) =>
    newsletterCandidateHasOffers(x, catalog, activeIds);
  for (const item of [...content.articles, ...content.videos]) {
    const source =
      articles.find(
        (a) => item.url === `https://vitalemobilidade.com/conteudos/${a.slug}`,
      ) ?? videos.find((v) => v.url === item.url);
    if (!source) throw new Error("newsletter_sources_unavailable");
    if (!eligible(source)) throw new Error("newsletter_offer_unavailable");
  }
  for (const item of [content.bike, ...(content.drops ?? [])]) {
    const id = new URL(item.url).pathname.split("/").pop()!;
    if (!activeIds.has(id)) throw new Error("newsletter_offer_unavailable");
  }
  if (
    !eligible({
      title: [
        content.subject,
        content.headline,
        content.preheader,
        content.intro,
      ]
        .filter(Boolean)
        .join(" "),
    })
  )
    throw new Error("newsletter_offer_unavailable");
  // Display edits cannot introduce an unavailable model either.
  for (const item of [...content.articles, ...content.videos, content.bike]) {
    if (
      !eligible({
        title: [
          item.title,
          ...(item.paragraphs ?? []),
          ...(item.bullets ?? []),
        ].join(" "),
      })
    )
      throw new Error("newsletter_offer_unavailable");
  }
}

/** Repair optional blocks before freezing a campaign; no model call or invented copy. */
export async function recoverNewsletterAvailability(
  content: NewsletterContent,
) {
  assertNewsletterEditorial(content);
  const [radar, catalog, articles, videos] = await Promise.all([
    fetchTrackerSplit(),
    fetchBikeCatalogFromDb(),
    fetchPublishedIndex(),
    fetchVideoCatalog(),
  ]);
  if (!radar.ok || !catalog?.length || !articles || !videos?.length)
    throw new Error("newsletter_sources_unavailable");
  const active = new Set(
    (radar.data.active as { id: string }[]).map((b) => b.id),
  );
  const eligible = (
    candidate: Parameters<typeof newsletterCandidateHasOffers>[0],
  ) => newsletterCandidateHasOffers(candidate, catalog, active);
  const keep = (item: NewsletterContent["bike"]) => {
    const source =
      articles.find(
        (a) => item.url === `https://vitalemobilidade.com/conteudos/${a.slug}`,
      ) ?? videos.find((v) => v.url === item.url);
    return (
      !!source &&
      newsletterReaderTopic(source.title) &&
      newsletterReaderTopic(item.title) &&
      eligible(source) &&
      eligible({
        title: [
          item.title,
          ...(item.paragraphs ?? []),
          ...(item.bullets ?? []),
        ].join(" "),
      })
    );
  };
  const recovered = {
    ...content,
    articles: content.articles.filter(keep),
    videos: content.videos.filter(keep),
    drops: content.drops?.filter((item) =>
      active.has(new URL(item.url).pathname.split("/").pop()!),
    ),
  };
  if (!recovered.articles.length || !recovered.videos.length)
    throw new Error("newsletter_recovery_insufficient_content");
  const changed =
    recovered.articles.length !== content.articles.length ||
    recovered.videos.length !== content.videos.length ||
    recovered.drops?.length !== content.drops?.length;
  if (!changed) return { content, changed: false };
  // Recompute source identity from the retained articles during scheduled validation.
  delete recovered.sourceVideoIds;
  recovered.mentionedBikeIds = [
    ...new Set([
      ...[recovered.bike, ...(recovered.drops ?? [])].map((x) =>
        new URL(x.url).pathname.split("/").pop()!,
      ),
      ...[...recovered.articles, ...recovered.videos].flatMap((x) =>
        newsletterCandidateBikeIds(
          {
            title: [
              x.title,
              ...(x.paragraphs ?? []),
              ...(x.bullets ?? []),
            ].join(" "),
          },
          catalog,
        ),
      ),
    ]),
  ];
  await validateNewsletterCurrentOffers(recovered);
  return { content: recovered, changed: true };
}
