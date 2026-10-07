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
import { createHash } from "node:crypto";
export async function automaticNewsletter(
  weekday: number,
  since = new Date(Date.now() - (weekday === 5 ? 4 : 3) * 86_400_000),
): Promise<{ content: NewsletterContent; fingerprint: string }> {
  const [articles, radar, videos, catalog] = await Promise.all([
    fetchPublishedIndex(),
    fetchTrackerSplit(),
    fetchVideoCatalog(),
    fetchBikeCatalogFromDb(),
  ]);
  if (!articles?.length || !radar.ok || !videos.length || !catalog?.length)
    throw new Error("newsletter_sources_unavailable");
  const freshArticles = articles.filter(
    (a) => a.publishedAt && Date.parse(a.publishedAt) > since.getTime(),
  );
  const pickedArticles = [...(freshArticles.length ? freshArticles : articles)]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 2);
  const drops = selectNewsletterDrops(
    radar.data.active as NewsletterDropBike[],
    since,
    new Date(),
  );
  const related = pickedArticles.flatMap((a) => [
    a.primaryBikeId,
    ...a.relatedBikeIds,
  ]);
  const bikes = (radar.data.active as { id: string; name: string }[]).filter(
    (b) =>
      typeof b.id === "string" &&
      /^[a-z0-9_]+$/.test(b.id) &&
      typeof b.name === "string" &&
      catalog.some((c) => c.bikeId === b.id),
  );
  const bike =
    bikes.find((b) => b.id === drops[0]?.id) ??
    bikes.find((b) => related.includes(b.id)) ??
    bikes[0];
  if (!bike) throw new Error("newsletter_no_active_bike");
  const details = catalog.find((c) => c.bikeId === bike.id)!;
  const fullArticles = await Promise.all(
    pickedArticles.map((a) => fetchPublishedArticle(a.slug)),
  );
  if (fullArticles.some((a) => !a))
    throw new Error("newsletter_sources_unavailable");
  const freshVideos = videos.filter(
    (v) => v.date && Date.parse(v.date) > since.getTime(),
  );
  const pickedVideos = [...(freshVideos.length ? freshVideos : videos)]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 2);
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
      text: `Título do vídeo: ${v.title}. Data informada no catálogo: ${v.date ?? "não informada"}. Sem transcrição fornecida: a única pauta confirmada é a do título. Não afirmar resultados, recomendações ou testes feitos no vídeo.`,
    })),
  ];
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([sources, drops]))
    .digest("hex");
  const draft = await writeNewsletter(sources, weekday);
  const enrich = (id: string) => {
    const s = draft.sections.find((s) => s.id === id)!;
    return { paragraphs: s.paragraphs, bullets: s.bullets };
  };
  const image = (url: string | null | undefined) =>
    url && newsletterImageSchema.safeParse(url).success ? { image: url } : {};
  const content: NewsletterContent = {
    subject: draft.subject,
    headline: draft.headline,
    preheader: draft.preheader,
    intro: draft.opening.join("\n\n"),
    articles: pickedArticles.map((a, i) => ({
      title: a.title,
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
      url: v.url,
      ...image(v.thumbnail),
      ...enrich(`video-${i}`),
    })),
  };
  renderResendNewsletter(content);
  return { content, fingerprint };
}
