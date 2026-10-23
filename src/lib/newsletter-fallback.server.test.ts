vi.mock("./newsletter-images.server", () => ({
  newsletterVideoImage: async (id: string, original: string) =>
    original ?? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
}));
vi.mock("./newsletter-article-image.server", () => ({
  newsletterArticleImage: () => {
    throw new Error("New editions must not compose another article image");
  },
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
} from "./newsletter-sources.server";
afterEach(() => vi.resetAllMocks());
it.each([
  {
    cover:
      "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&id=mock",
    expected:
      "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&id=mock",
  },
  {
    cover: null,
    expected: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
  },
  {
    cover: "https://private.invalid/cover.jpg",
    expected: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
  },
])(
  "reuses the published cover or existing source thumbnail without composing another image ($cover)",
  async ({ cover, expected }) => {
    mocked.index.mockResolvedValue([
      {
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
