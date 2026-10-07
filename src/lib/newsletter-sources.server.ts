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
} from "./newsletter-writer.server";
import {
  selectNewsletterDrops,
  type NewsletterDropBike,
} from "./newsletter-pauta";
import {
  curateNewsletter,
  selectFeaturedNewsletterBike,
  newsletterCategoryLabel,
} from "./newsletter-curation";
import { newsletterTranscripts } from "./newsletter-transcripts.server";
import { createHash } from "node:crypto";
export async function automaticNewsletter(
  weekday: number,
  since = new Date(Date.now() - (weekday === 4 ? 3 : 4) * 86_400_000),
  previousEditions: NewsletterContent[] = [],
  editionNumber = 1,
): Promise<{ content: NewsletterContent; fingerprint: string }> {
  const [articles, radar, videos, catalog] = await Promise.all([
    fetchPublishedIndex(),
    fetchTrackerSplit(),
    fetchVideoCatalog(),
    fetchBikeCatalogFromDb(),
  ]);
  if (!articles?.length || !radar.ok || !videos.length || !catalog?.length)
    throw new Error("newsletter_sources_unavailable");
  const curated = curateNewsletter(
    articles.filter(
      (a) =>
        !previousEditions.some((p) =>
          p.articles.some(
            (x) => new URL(x.url).pathname === `/conteudos/${a.slug}`,
          ),
        ),
    ),
    videos.filter(
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
    since,
    new Date(),
    previousEditions.flatMap((p) =>
      [...p.articles, ...p.videos].map((x) => x.title),
    ),
  );
  const pickedArticles = curated.articles;
  let pickedVideos = curated.videos;
  if (!pickedArticles.length || !pickedVideos.length)
    throw new Error("newsletter_sources_insufficient_diversity");
  const drops = selectNewsletterDrops(
    radar.data.active as NewsletterDropBike[],
    since,
    new Date(),
  );
  const related = [
    ...pickedVideos.flatMap((v) => v.bikeIds),
    ...pickedArticles.flatMap((a) => [a.primaryBikeId, ...a.relatedBikeIds]),
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
    previousEditions
      .slice(0, 6)
      .map((p) => new URL(p.bike.url).pathname.split("/").pop() ?? ""),
  );
  if (!bike) throw new Error("newsletter_no_active_bike");
  const details = catalog.find((c) => c.bikeId === bike.id)!;
  const fullArticles = await Promise.all(
    pickedArticles.map((a) => fetchPublishedArticle(a.slug)),
  );
  if (fullArticles.some((a) => !a))
    throw new Error("newsletter_sources_unavailable");
  pickedVideos = pickedVideos.filter(
    (v) => !fullArticles.some((a) => a?.videoId === v.videoId),
  );
  if (!pickedVideos.length)
    throw new Error("newsletter_sources_insufficient_diversity");
  const transcripts = await newsletterTranscripts([
    ...fullArticles.map((a) => a!.videoId),
    ...pickedVideos.map((v) => v.videoId),
  ]);
  const brl = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  const dropText = drops
    .map(
      (d) =>
        `${d.name}: de ${brl(d.previous)} (fechamento verificado de ${d.baselineDate}) para ${brl(d.current)}; queda de ${d.percent.toFixed(1).replace(".", ",")}%. Última verificação: ${d.verifiedAt}.`,
    )
    .join("\n");
  const sources: NewsletterEvidence[] = [
    ...pickedArticles.map((a, i) => ({
      id: `article-${i}`,
      title: a.title,
      text: [
        a.publishedAt ? `Publicado em ${a.publishedAt}.` : "",
        a.summary,
        transcripts.get(fullArticles[i]!.videoId) ?? "",
        ...fullArticles[i]!.blocks.filter((b) => !b.planned).map((b) =>
          [b.heading, b.text].filter(Boolean).join("\n"),
        ),
      ]
        .join("\n\n")
        .slice(0, 12_000),
    })),
    {
      id: "radar",
      title: "Preço e histórico: consulte antes de escolher",
      text:
        "O Radar da Vitale reúne preço atual e histórico de bikes elétricas. Preços e disponibilidade podem mudar. Confira os dados vigentes na página de cada bike antes de decidir. Não existe desconto garantido nem promessa de menor preço. " +
        (dropText ||
          "Não foram confirmadas quedas com comparativo e verificação recentes neste período."),
    },
    {
      id: "bike",
      title: bike.name,
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
  const draft = await writeNewsletter(
    sources,
    weekday,
    undefined,
    previousEditions.map((p) => p.curiosity?.text ?? p.intro),
  );
  const enrich = (id: string) => {
    const s = draft.sections.find((s) => s.id === id)!;
    return { paragraphs: s.paragraphs, bullets: s.bullets };
  };
  const image = (url: string | null | undefined) =>
    url && newsletterImageSchema.safeParse(url).success ? { image: url } : {};
  const content: NewsletterContent = {
    editionNumber,
    subject: numberNewsletterSubject(draft.subject, editionNumber),
    curiosity: draft.curiosity,
    headline: draft.headline,
    preheader: draft.preheader,
    intro: draft.opening.join("\n\n"),
    articles: pickedArticles.map((a, i) => ({
      title: a.title,
      category: newsletterCategoryLabel(a.title, a.contentType),
      url: `https://vitalemobilidade.com/conteudos/${a.slug}`,
      ...image(a.ogImageUrl),
      ...enrich(`article-${i}`),
    })),
    radar: {
      title: sources.find((s) => s.id === "radar")!.title,
      url: "https://vitalemobilidade.com/radar",
      ...enrich("radar"),
    },
    drops: drops.map((d) => ({
      title: d.name,
      previousPrice: brl(d.previous),
      currentPrice: brl(d.current),
      priceRatio: d.current / d.previous,
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
      paragraphs: [
        `De ${brl(d.previous)} (${d.baselineDate}) para ${brl(d.current)}: queda de ${d.percent.toFixed(1).replace(".", ",")}%. Verificação: ${new Date(d.verifiedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Confira o preço vigente no Radar.`,
      ],
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
      ...image(v.thumbnail),
      ...enrich(`video-${i}`),
    })),
  };
  renderResendNewsletter(content);
  return { content, fingerprint };
}
