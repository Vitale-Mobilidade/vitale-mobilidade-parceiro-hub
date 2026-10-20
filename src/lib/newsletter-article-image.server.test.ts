import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.create }));
import {
  validNewsletterBackground,
  newsletterArticleImage,
} from "./newsletter-article-image.server";
const id = "638f4032-8ff8-45dd-b03b-e69c0c064154";
it("allows only an article-owned base image path and matching supported MIME", () => {
  expect(
    validNewsletterBackground(id, {
      path: `${id}/backgrounds/${id}.png`,
      mime: "image/png",
    }),
  ).toBe(true);
  for (const path of [
    `${id}/backgrounds/../private.png`,
    `other/backgrounds/${id}.png`,
    `https://evil.test/${id}.png`,
  ]) {
    expect(validNewsletterBackground(id, { path, mime: "image/png" })).toBe(
      false,
    );
  }
  expect(
    validNewsletterBackground(id, {
      path: `${id}/backgrounds/${id}.png`,
      mime: "image/jpeg",
    }),
  ).toBe(false);
});
it("rejects invalid input without database access and hides unpublished articles", async () => {
  expect((await newsletterArticleImage("../private")).status).toBe(400);
  expect(mock.create).not.toHaveBeenCalled();
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test");
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  };
  mock.create.mockReturnValue({ from: () => query });
  expect((await newsletterArticleImage(id)).status).toBe(404);
  expect(query.eq).toHaveBeenCalledWith("status", "published");
  vi.unstubAllEnvs();
});
it("serves a published article derivative without exposing source capture", async () => {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test");
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(
    new URL(
      "../../supabase/functions/_shared/cover-renderer/fixture.png",
      import.meta.url,
    ),
  );
  const rows = [
    { data: { video_id: "abcdefghijk" } },
    {
      data: {
        capture: {
          coverBackground: {
            path: `${id}/backgrounds/${id}.png`,
            mime: "image/png",
          },
          private: "never public",
        },
      },
    },
  ];
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => rows.shift()),
  };
  const download = vi.fn().mockResolvedValue({ data: new Blob([bytes]) });
  mock.create.mockReturnValue({
    from: () => q,
    storage: { from: () => ({ download }) },
  });
  const response = await newsletterArticleImage(id);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(response.headers.get("cache-control")).toContain("s-maxage");
  expect(download).toHaveBeenCalledWith(`${id}/backgrounds/${id}.png`);
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  vi.unstubAllEnvs();
});
