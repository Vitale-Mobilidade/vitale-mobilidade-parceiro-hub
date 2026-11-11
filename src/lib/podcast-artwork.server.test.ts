import jpeg from "jpeg-js";
import { expect, it } from "vitest";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
import { squarePodcastArtwork } from "../../supabase/functions/_shared/podcast-artwork";
import { servePodcastArtwork } from "./podcast-artwork.server";
import { podcastArticleCoverSource } from "./podcast-editorial";

it("preserves both sides of the article cover in a square JPEG", () => {
  const source = new Uint8Array([
    240, 10, 20, 255, 240, 10, 20, 255, 10, 20, 240, 255, 10, 20, 240, 255,
    240, 10, 20, 255, 240, 10, 20, 255, 10, 20, 240, 255, 10, 20, 240, 255,
  ]);
  const landscape = jpeg.encode({ data: source, width: 4, height: 2 }, 100).data;
  const art = squarePodcastArtwork(landscape, jpeg);
  expect(inspectJpeg(art)).toEqual({ width: 1400, height: 1400 });
  const pixels = jpeg.decode(art, { useTArray: true }).data;
  const pixel = (x: number, y: number) => pixels.subarray((y * 1400 + x) * 4, (y * 1400 + x) * 4 + 3);
  expect(pixel(50, 700)[0]).toBeGreaterThan(220);
  expect(pixel(1350, 700)[2]).toBeGreaterThan(220);
  expect(pixel(700, 50)[1]).toBeLessThan(60);
});

it("limits artwork requests to public article cover routes", () => {
  expect(podcastArticleCoverSource("http://127.0.0.1/image.jpg")).toBeNull();
  expect(podcastArticleCoverSource("https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin")).toBeNull();
});


it("routes inline and download requests to the same square cover", () => {
  const path = "https://vitalemobilidade.com/podcast/capas/teste-ft07.jpg?v=1794000000000";
  const inline = servePodcastArtwork(new Request(path), "teste-ft07.jpg");
  const download = servePodcastArtwork(new Request(path + "&download=1"), "teste-ft07.jpg");
  expect(inline.status).toBe(307);
  expect(download.headers.get("Location")).toBe(inline.headers.get("Location") + "&download=1");
  expect(servePodcastArtwork(new Request(path), "../teste-ft07.jpg").status).toBe(404);
});
