vi.mock("./newsletter-images.server", () => ({
  newsletterVideoImage: async (_id: string, original: string) => original,
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
import { automaticNewsletter } from "./newsletter-sources.server";
afterEach(() => vi.resetAllMocks());
it("renders a reduced edition using published sources without models or transcript calls", async () => {
  mocked.index.mockResolvedValue([
    {
      slug: "cuidados",
      title: "Como cuidar da bike",
      contentType: "education",
      publishedAt: "2026-10-09T12:00:00Z",
      summary: "Cuidados publicados",
      primaryBikeId: null,
      relatedBikeIds: [],
    },
  ]);
  mocked.article.mockResolvedValue({ videoId: "other", blocks: [] });
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
    2,
    undefined,
    "fallback",
  );
  expect(edition.content.articles).toHaveLength(1);
  expect(edition.content.videos).toHaveLength(1);
  expect(edition.content.subject).toContain("#2");
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
});
