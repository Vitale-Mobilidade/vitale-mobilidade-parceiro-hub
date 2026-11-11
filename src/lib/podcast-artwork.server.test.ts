import jpeg from "jpeg-js";
import { expect, it } from "vitest";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
import { composeSquarePodcastCover } from "../../supabase/functions/_shared/cover-renderer/index";
import { servePodcastArtwork } from "./podcast-artwork.server";
import { podcastArticleCoverSource } from "./podcast-editorial";

it("composes a separate square JPEG with a full-bleed photo", async () => {
  const source = new Uint8Array([
    240, 10, 20, 255, 240, 10, 20, 255, 10, 20, 240, 255, 10, 20, 240, 255,
    240, 10, 20, 255, 240, 10, 20, 255, 10, 20, 240, 255, 10, 20, 240, 255,
  ]);
  const landscape = jpeg.encode({ data: source, width: 4, height: 2 }, 100).data;
  const { bytes: art, lines } = await composeSquarePodcastCover({ bytes: landscape, mime: "image/jpeg" }, "Mangosteen FT07 em teste");
  expect(lines.join(" ")).toBe("Mangosteen FT07 em teste");
  expect(inspectJpeg(art)).toEqual({ width: 1400, height: 1400 });
  const pixels = jpeg.decode(art, { useTArray: true }).data;
  const pixel = (x: number, y: number) => pixels.subarray((y * 1400 + x) * 4, (y * 1400 + x) * 4 + 3);
  expect(pixel(50, 700)[0]).toBeGreaterThan(150);
  expect(pixel(1350, 700)[2]).toBeGreaterThan(150);
  expect(pixel(50, 50)[0]).toBeGreaterThan(220);
  expect(pixel(1350, 50)[2]).toBeGreaterThan(220);
  // The former Podcast label extended the green badge into this part of the photo.
  expect(pixel(550, 114)[0]).toBeGreaterThan(100);
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


it("resolve o novo arquivo e encaminha a versão para o cache da função de imagens", () => {
  const url = "https://vitalemobilidade.com/podcast/capas/teste-ft07.v3.jpg?layout=3&download=1";
  const response = servePodcastArtwork(new Request(url), "teste-ft07.v3.jpg");
  const destination = new URL(response.headers.get("Location")!);
  expect(destination.searchParams.get("slug")).toBe("teste-ft07");
  expect(destination.searchParams.get("layout")).toBe("3");
  expect(destination.searchParams.get("download")).toBe("1");
});
