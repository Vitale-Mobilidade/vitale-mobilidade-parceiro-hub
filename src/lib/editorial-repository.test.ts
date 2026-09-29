import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublishedArticleResult } from "./editorial-repository.server";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.com");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-public-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("editorial public reads", () => {
  it("distinguishes successful absence from backend failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("null"))
        .mockResolvedValueOnce(new Response("unavailable", { status: 503 })),
    );
    expect(await fetchPublishedArticleResult("missing")).toEqual({
      ok: true,
      article: null,
    });
    expect(await fetchPublishedArticleResult("published")).toEqual({
      ok: false,
    });
  });
  it("rejects unsafe slugs without querying the database", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPublishedArticleResult("../draft")).toEqual({
      ok: true,
      article: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("removes evidence excerpts from SSR/hydration while preserving public narrative", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            slug: "published",
            title: "Public article",
            videoId: "abcdefghijk",
            blocks: [
              {
                type: "text",
                text: "Public narrative",
                sourceExcerpt: "Private evidence",
              },
            ],
            faq: [
              {
                question: "Question",
                answer: "Public answer",
                sourceExcerpt: "Private evidence",
              },
            ],
          }),
        ),
      ),
    );
    const result = await fetchPublishedArticleResult("published");
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain("Private evidence");
    expect(JSON.stringify(result)).toContain("Public narrative");
  });
});
