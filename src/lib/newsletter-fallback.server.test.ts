vi.mock("./newsletter-images.server", () => ({
  newsletterVideoImage: async (id: string, original: string) =>
    original ?? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
}));
vi.mock("./newsletter-article-image.server", () => ({
  newsletterArticleImage: mocked.derivative,
}));
import { afterEach, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  index: vi.fn(),
  article: vi.fn(),
  radar: vi.fn(),
  videos: vi.fn(),
  bikes: vi.fn(),
  writer: vi.fn(),
  transcripts: vi.fn(),
  derivative: vi.fn(),
}));
vi.mock("./editorial-repository.server", () => ({
  fetchPublishedIndex: mocked.index,
  fetchPublishedArticle: mocked.article,
}));
vi.mock("./radar-repository.server", () => ({
  fetchTrackerSplit: mocked.radar,
}));
vi.mock("./video-catalog.server", () => ({ fetchVideoCatalog: mocked.videos }));
vi.mock("./bikes-repository.server", () => ({
  fetchBikeCatalogFromDb: mocked.bikes,
}));
vi.mock("./newsletter-transcripts.server", () => ({
  newsletterTranscripts: mocked.transcripts,
}));
vi.mock("./newsletter-writer.server", () => ({
  writeNewsletter: mocked.writer,
}));
import {
  automaticNewsletter,
  validateNewsletterCurrentOffers,
  recoverNewsletterAvailability,
} from "./newsletter-sources.server";
afterEach(() => vi.resetAllMocks());
it.each([
  {
    cover:
      "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&id=mock",
    expected:
      "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&id=mock",
    createCover: false,
    derivativeStatus: 200,
  },
  {
    cover: null,
    expected:
      "https://vitalemobilidade.com/api/public/newsletter-image?id=638f4032-8ff8-45dd-b03b-e69c0c064154",
    createCover: true,
    derivativeStatus: 200,
  },
  {
    cover: null,
    expected: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
    createCover: true,
    derivativeStatus: 404,
  },
  {
    cover: "https://private.invalid/cover.jpg",
    expected:
      "https://vitalemobilidade.com/api/public/newsletter-image?id=638f4032-8ff8-45dd-b03b-e69c0c064154",
    createCover: true,
    derivativeStatus: 200,
  },
  {
    cover: "https://private.invalid/cover.jpg",
    expected: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
    createCover: true,
    derivativeStatus: 503,
  },
])(
  "prefers the published cover, then a composed cover, then the source thumbnail ($cover, $derivativeStatus)",
  async ({ cover, expected, createCover, derivativeStatus }) => {
    mocked.derivative.mockResolvedValue(
      new Response(null, { status: derivativeStatus }),
    );
    mocked.index.mockResolvedValue([
      {
        id: "638f4032-8ff8-45dd-b03b-e69c0c064154",
        slug: "cuidados",
        title: "Como cuidar da bike",
        contentType: "education",
        publishedAt: "2026-10-09T12:00:00Z",
        summary: "Cuidados publicados",
        primaryBikeId: null,
        relatedBikeIds: [],
        ogImageUrl: cover,
      },
    ]);
    mocked.article.mockResolvedValue({ videoId: "abcdefghijk", blocks: [] });
    mocked.videos.mockResolvedValue([
      {
        videoId: "abc123",
        title: "Conheça a bike elétrica",
        url: "https://www.youtube.com/watch?v=abc123",
        date: "2026-10-09",
        bikeIds: [],
        thumbnail: null,
      },
    ]);
    mocked.radar.mockResolvedValue({
      ok: true,
      data: { active: [{ id: "mock_bike", name: "Bike publicada" }] },
    });
    mocked.bikes.mockResolvedValue([
      {
        bikeId: "mock_bike",
        name: "Bike publicada",
        description: "Ficha publicada",
      },
    ]);
    const edition = await automaticNewsletter(
      1,
      undefined,
      [],
      7,
      undefined,
      "fallback",
    );
    expect(edition.content.articles).toHaveLength(1);
    expect(edition.content.videos).toHaveLength(1);
    expect(edition.content.subject).toContain("#7");
    expect(edition.content.articles[0].image).toBe(expected);
    expect(mocked.derivative).toHaveBeenCalledTimes(createCover ? 1 : 0);
    expect(edition.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(mocked.writer).not.toHaveBeenCalled();
    expect(mocked.transcripts).not.toHaveBeenCalled();
    expect(edition.content.articles[0].url).toBe(
      "https://vitalemobilidade.com/conteudos/cuidados",
    );
    mocked.radar.mockResolvedValue({ ok: false });
    await expect(
      automaticNewsletter(1, undefined, [], 2, undefined, "fallback"),
    ).rejects.toThrow("newsletter_sources_unavailable");
  },
);

it("excludes an unavailable V35 video during selection and blocks a saved draft after offer loss", async () => {
  mocked.derivative.mockResolvedValue(new Response(null, { status: 404 }));
  mocked.index.mockResolvedValue([
    {
      slug: "care",
      title: "Como cuidar da corrente",
      publishedAt: "2026-10-10",
      contentType: "education",
      summary: "Cuidados com a corrente.",
    },
  ]);
  mocked.article.mockResolvedValue({ videoId: "article-source", blocks: [] });
  const generic = {
    videoId: "generic",
    title: "Como ajustar o banco",
    url: "https://www.youtube.com/watch?v=generic",
    date: "2026-10-10",
    bikeIds: [],
    thumbnail: null,
  };
  const v35 = {
    ...generic,
    videoId: "v35-source",
    title: "Inow V35 é a melhor bike hoje?",
    url: "https://www.youtube.com/watch?v=v35-source",
    date: "2026-10-11",
  };
  mocked.videos.mockResolvedValue([v35, generic]);
  mocked.bikes.mockResolvedValue([
    { bikeId: "v35", name: "V35" },
    { bikeId: "v10_max", name: "V10 Max" },
  ]);
  mocked.radar.mockResolvedValue({
    ok: true,
    data: { active: [{ id: "v10_max", name: "V10 Max" }] },
  });
  const edition = await automaticNewsletter(
    5,
    undefined,
    [],
    2,
    undefined,
    "fallback",
  );
  expect(edition.content.videos.map((v) => v.url)).toEqual([generic.url]);
  expect(edition.content.mentionedBikeIds).not.toContain("v35");
  const copy = (item: typeof edition.content.bike) => ({
    ...item,
    paragraphs: ["Um texto editorial próprio para acompanhar este assunto."],
    bullets: [],
  });
  const approved = {
    ...edition.content,
    intro: "Uma abertura editorial própria para acompanhar a edição.",
    articles: edition.content.articles.map(copy),
    videos: edition.content.videos.map(copy),
    bike: copy(edition.content.bike),
  };
  await expect(
    validateNewsletterCurrentOffers(approved),
  ).resolves.toBeUndefined();
  // A display title cannot conceal the original unavailable video model.
  await expect(
    validateNewsletterCurrentOffers({
      ...approved,
      videos: [{ ...copy(v35), title: "Duas baterias em pauta" }],
    }),
  ).rejects.toThrow("newsletter_offer_unavailable");
  await expect(
    validateNewsletterCurrentOffers({
      ...approved,
      intro: "Conheça também a Inow V35 nesta edição.",
    }),
  ).rejects.toThrow("newsletter_offer_unavailable");
  mocked.radar.mockResolvedValue({ ok: true, data: { active: [] } });
  await expect(validateNewsletterCurrentOffers(approved)).rejects.toThrow(
    "newsletter_offer_unavailable",
  );
  expect(mocked.writer).not.toHaveBeenCalled();
});

it("recovers an approved edition by removing only newly ineligible optional blocks", async () => {
  const safe = { title: "V8 Pro", slug: "v8", primaryBikeId: "v8_pro" };
  const changed = {
    title: "Comparativo V8 Pro",
    slug: "variants",
    primaryBikeId: "v8_pro",
  };
  const video = {
    title: "Mobilidade",
    url: "https://www.youtube.com/watch?v=abcdefghijk",
  };
  mocked.index.mockResolvedValue([safe, changed]);
  mocked.videos.mockResolvedValue([video]);
  mocked.bikes.mockResolvedValue([
    { bikeId: "v8_pro", name: "V8 Pro" },
    { bikeId: "v9_max_s", name: "V9 Max S" },
  ]);
  mocked.radar.mockResolvedValue({
    ok: true,
    data: { active: [{ id: "v8_pro" }] },
  });
  const base = {
    subject: "Uma edição para acompanhar",
    intro: "Novas leituras para acompanhar a mobilidade.",
    sourceVideoIds: ["old"],
    articles: [
      { title: "V8 Pro", url: "https://vitalemobilidade.com/conteudos/v8" },
      {
        title: "Comparativo",
        url: "https://vitalemobilidade.com/conteudos/variants",
        paragraphs: ["A V9 Max S também aparece nesta comparação de modelos."],
      },
    ],
    bike: { title: "V8 Pro", url: "https://vitalemobilidade.com/radar/v8_pro" },
    videos: [video],
    drops: [
      { title: "V9 Max S", url: "https://vitalemobilidade.com/radar/v9_max_s" },
    ],
  };
  const result = await recoverNewsletterAvailability(base);
  expect(result.changed).toBe(true);
  expect(result.content.articles).toEqual([base.articles[0]]);
  expect(result.content.drops).toEqual([]);
  expect(result.content.sourceVideoIds).toBeUndefined();
  expect(result.content.bike).toBe(base.bike);
  expect(mocked.writer).not.toHaveBeenCalled();
  await expect(
    recoverNewsletterAvailability({ ...base, articles: [base.articles[1]] }),
  ).rejects.toThrow("newsletter_recovery_insufficient_content");
  await expect(
    recoverNewsletterAvailability({
      ...base,
      intro: "Conheça a V9 Max S nesta edição.",
    }),
  ).rejects.toThrow("newsletter_offer_unavailable");
  // A network outage must never be mistaken for a catalog disappearance.
  mocked.radar.mockResolvedValue({ ok: false });
  await expect(recoverNewsletterAvailability(base)).rejects.toThrow(
    "newsletter_sources_unavailable",
  );
});
