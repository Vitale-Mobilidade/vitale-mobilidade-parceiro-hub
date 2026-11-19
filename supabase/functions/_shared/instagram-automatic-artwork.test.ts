import { expect, it, vi } from "vitest";
import {
  automaticInstagramArtwork,
  automaticArtworkKey,
} from "../editorial-admin/instagram-automatic-artwork.ts";
import type { EditorialArticle } from "./editorial-contract.ts";

const jpeg = Uint8Array.of(255, 216, 255, 192, 0, 7, 8, 5, 70, 4, 56, 255, 217);
const article = {
  id: "11223344-1234-1234-1234-123456789abc",
  revision: 1,
  title: "Foto da Bike",
  summary: "Uma bicicleta para a cidade.",
  primary_bike_id: "bike",
  related_bike_ids: [],
} as unknown as EditorialArticle;

function fixture() {
  const files = new Map<string, Blob>();
  const writes: string[] = [];
  const storage = {
    download: vi.fn(async (path: string) =>
      files.has(path)
        ? { data: files.get(path), error: null }
        : { data: null, error: { statusCode: "404" } },
    ),
    upload: vi.fn(
      async (
        path: string,
        value: string | Uint8Array,
        options: { upsert: boolean },
      ) => {
        expect(options.upsert).toBe(false);
        writes.push(path);
        if (files.has(path)) return { error: { statusCode: "409" } };
        files.set(path, new Blob([value]));
        return { error: null };
      },
    ),
  };
  const generate = vi.fn(async () => jpeg);
  const db = { storage: { from: () => storage } } as unknown as Parameters<
    typeof automaticInstagramArtwork
  >[0];
  const now = () => new Date("2026-11-19T13:00:00Z");
  return { db, files, writes, generate, storage, now };
}

it("charges once and reuses the validated portrait across later executions", async () => {
  const f = fixture();
  const create = automaticInstagramArtwork(f.db, f.generate, f.now);
  expect(await create(article)).toEqual(jpeg);
  expect(
    await automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).toEqual(jpeg);
  expect(f.generate).toHaveBeenCalledTimes(1);
  expect(f.writes.some((path) => path.endsWith(".attempt.json"))).toBe(true);
});

it("two workers racing for one revision can make only one paid request", async () => {
  const f = fixture();
  const outcomes = await Promise.allSettled([
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ]);
  expect(outcomes.some((result) => result.status === "fulfilled")).toBe(true);
  expect(f.generate).toHaveBeenCalledTimes(1);
});

it("does not replay an uncertain request on the next worker", async () => {
  const f = fixture();
  f.generate.mockRejectedValue(Error("instagram_cover_generation_failed"));
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).rejects.toThrow("instagram_cover_generation_failed");
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).rejects.toThrow("instagram_auto_generation_unconfirmed");
  expect(f.generate).toHaveBeenCalledTimes(1);
});

it("limits each execution to one generation but still serves cached artwork", async () => {
  const f = fixture();
  const create = automaticInstagramArtwork(f.db, f.generate, f.now);
  await create(article);
  await expect(create({ ...article, revision: 2 })).rejects.toThrow(
    "instagram_auto_generation_pending",
  );
  expect(await create(article)).toEqual(jpeg);
  expect(f.generate).toHaveBeenCalledTimes(1);
});

it("admits at most six attempts per São Paulo day and can admit tomorrow", async () => {
  const f = fixture();
  for (let revision = 1; revision <= 6; revision++)
    await automaticInstagramArtwork(
      f.db,
      f.generate,
      f.now,
    )({ ...article, revision });
  const seventh = { ...article, revision: 7 };
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(seventh),
  ).rejects.toThrow("instagram_auto_generation_limit");
  const key = await automaticArtworkKey(seventh);
  expect(f.files.has(key + ".attempt.json")).toBe(false);
  await expect(
    automaticInstagramArtwork(
      f.db,
      f.generate,
      () => new Date("2026-11-20T03:00:00Z"),
    )(seventh),
  ).resolves.toEqual(jpeg);
  expect(f.generate).toHaveBeenCalledTimes(7);
});

it("does not spend when private Storage is unavailable", async () => {
  const f = fixture();
  f.storage.download.mockResolvedValue({
    data: null,
    error: { statusCode: "503" },
  });
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).rejects.toThrow("instagram_asset_read_failed");
  expect(f.generate).not.toHaveBeenCalled();
});

it("does not cache an invalid JPEG and does not regenerate it automatically", async () => {
  const f = fixture();
  f.generate.mockResolvedValue(Uint8Array.of(1));
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).rejects.toThrow("instagram_auto_generation_invalid");
  expect(f.files.has((await automaticArtworkKey(article)) + ".jpg")).toBe(
    false,
  );
  await expect(
    automaticInstagramArtwork(f.db, f.generate, f.now)(article),
  ).rejects.toThrow("instagram_auto_generation_unconfirmed");
  expect(f.generate).toHaveBeenCalledTimes(1);
});
