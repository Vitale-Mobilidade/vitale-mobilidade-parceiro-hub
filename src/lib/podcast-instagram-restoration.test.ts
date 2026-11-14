import { expect, it } from "vitest";
import jpeg from "jpeg-js";
import { readFileSync } from "node:fs";
import { composeInstagramPostCover } from "../../supabase/functions/_shared/cover-renderer/index";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
import { servePodcastArtwork } from "./podcast-artwork.server";
import { preparedPodcastInstagramPath, preparedPodcastCoverPath } from "../../supabase/functions/_shared/podcast-artwork-contract";
import { podcastSlots, nextPodcastSlot } from "./podcast-dashboard-clock";

it("whole photograph, JPEG 1080×1350, 120px grid-safe title/brand and separate RSS path", async () => {
  const pixels = new Uint8Array(40 * 20 * 4);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) pixels.set(x < 20 ? [240, 10, 20, 255] : [10, 20, 240, 255], (y * 40 + x) * 4);
  const source = jpeg.encode({ data: pixels, width: 40, height: 20 }, 100).data;
  const title = "Mobylette: benefícios, análise e veredito";
  const art = await composeInstagramPostCover({ bytes: source, mime: "image/jpeg" }, title);
  expect(inspectJpeg(art.bytes)).toEqual({ width: 1080, height: 1350 });
  expect(art.lines.join(" ")).toBe(title);
  const data = jpeg.decode(art.bytes).data;
  expect(data[(400 * 1080 + 1) * 4]).toBeGreaterThan(180);
  expect(data[(400 * 1080 + 1078) * 4 + 2]).toBeGreaterThan(180);
  for (let y = 900; y < 1350; y += 10) for (const x of [0, 90, 990, 1079]) {
    const p = (y * 1080 + x) * 4;
    expect(data[p]).toBeLessThan(30); expect(data[p + 1]).toBeLessThan(40);
  }
  const id = "11223344-1234-1234-1234-123456789abc";
  expect(preparedPodcastInstagramPath(id, "123")).toBe(`${id}/podcast-instagram/v4-123.jpg`);
  expect(preparedPodcastCoverPath(id, "123")).toBe(`${id}/podcast-covers/v3-123.jpg`);
});

it("routes IG separately and does not change existing RSS artwork", () => {
  const r = servePodcastArtwork(new Request("https://vitalemobilidade.com/podcast/capas/mobylette.ig4.jpg?v=123"), "mobylette.ig4.jpg");
  expect(new URL(r.headers.get("Location") ?? "").searchParams.get("layout")).toBe("4");
  const rss = servePodcastArtwork(new Request("https://vitalemobilidade.com/podcast/capas/mobylette.v3.jpg?v=123"), "mobylette.v3.jpg");
  expect(new URL(rss.headers.get("Location") ?? "").searchParams.get("layout")).toBe("3");
});

it("existing São Paulo windows remain 06:15, 11:45, 17:45; next window is future", () => {
  expect(podcastSlots.map(s=>s.time)).toEqual([375,705,1065]);
  expect(nextPodcastSlot("2026-11-14T09:15:00Z")).toBe("Hoje, às 11h45");
  expect(nextPodcastSlot("2026-11-14T20:45:00Z")).toBe("Amanhã, às 6h15");
});

it("review SQL restores only existing definitions, blocks uncertain replay and has no backfill/cron/schema", () => {
  const sql = readFileSync("docs/sql/instagram-release/20261114060000_restore_podcast_instagram.sql", "utf8");
  expect(sql).not.toMatch(/CREATE TABLE|cron\.schedule|ALTER TABLE|UPDATE public\.podcast_distribution_settings/i);
  expect(sql.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(5);
  expect(sql).toContain("publish_attempted_at IS NULL");
  expect(sql).toContain("error_code IS DISTINCT FROM 'meta_create_uncertain'");
  expect(sql).toContain("OLD.released_at IS NULL");
  expect(sql).toContain("ON CONFLICT (youtube_id) DO NOTHING");
  const scheduled = sql.split("CREATE OR REPLACE FUNCTION public.claim_scheduled_podcast_instagram()")[1]?.split("CREATE OR REPLACE FUNCTION")[0];
  expect(scheduled).toContain("d.error_code IS DISTINCT FROM 'meta_create_uncertain'");
});