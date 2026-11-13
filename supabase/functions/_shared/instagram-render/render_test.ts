// Deno-only codec fixtures for the Edge compositor (run: deno test -A supabase/functions/_shared/instagram-render/).
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { containPhoto, decodePhoto, photoFormat, renderSlide, slideGeometry } from "./index.ts";
import { inspectJpeg } from "../editorial-cover.ts";
const root = new URL("../../../../", import.meta.url);
const read = (path: string) => Deno.readFile(new URL(path, root));
const slide = { title: "Ladeira no teste", body: "Neste teste a bike subiu a ladeira.", layout: "review" as const, theme: "petroleum" as const, bikeIds: ["bike1"], scene: null, alt: "Foto real." };

Deno.test("decodes a real catalog WebP with complete dimensions and contains it without crop", async () => {
  const bytes = await read("src/assets/bikes/v20-ultra-landing.webp");
  assertEquals(photoFormat(bytes), "image/webp");
  const p = await decodePhoto(bytes, "image/jpeg");
  assertEquals([p.width, p.height, p.buffer.length], [1150, 1082, 1150 * 1082 * 4]);
  const out = new Uint8Array(1080 * 1350 * 4);
  assertEquals(containPhoto(out, p, 0, 0, 600, 800), { x: 0, y: 118, width: 600, height: 564 });
  const scale = 600 / 1150;
  for (const [x, y] of [[0, 0], [599, 0], [0, 563], [599, 563]]) {
    const from = (Math.floor(y / scale) * p.width + Math.floor(x / scale)) * 4, to = ((y + 118) * 1080 + x) * 4;
    for (let c = 0; c < 3; c++) assertEquals(out[to + c], Math.trunc(p.buffer[from + c] * p.buffer[from + 3] / 255));
  }
});
Deno.test("rejects oversized inputs before decoder allocation", async () => {
  await assertRejects(() => decodePhoto(new Uint8Array(12 * 1024 * 1024 + 1)), Error, "too_large");
  const b = new Uint8Array(24); b.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const v = new DataView(b.buffer); v.setUint32(16, 10000); v.setUint32(20, 10000);
  await assertRejects(() => decodePhoto(b), Error, "dimensions");
  const w = await read("src/assets/bikes/v20-ultra-landing.webp");
  const at = new TextDecoder("latin1").decode(w).indexOf("VP8 ") + 8;
  new DataView(w.buffer).setUint16(at + 6, 10000, true);
  await assertRejects(() => decodePhoto(w), Error, "dimensions");
});
Deno.test("detects JPEG and PNG independently of declared MIME", async () => {
  const jpg = renderSlide(null).bytes, pngBytes = await read("supabase/functions/_shared/cover-renderer/fixture.png");
  assertEquals(photoFormat(jpg), "image/jpeg"); assertEquals((await decodePhoto(jpg, "image/png")).width, 1080);
  assertEquals(photoFormat(pngBytes), "image/png"); assert((await decodePhoto(pngBytes, "image/jpeg")).width > 0);
});
Deno.test("renders sRGB 1080x1350 JPEGs with photo, scene and the fixed final slide", async () => {
  const photo = await decodePhoto(await read("src/assets/bikes/v20-ultra-landing.webp"));
  const scene = await decodePhoto(await read("supabase/functions/_shared/cover-renderer/fixture.png"));
  const started = performance.now();
  for (const layout of ["opening", "review", "comparison", "numbers", "diagram", "conclusion"] as const) {
    for (const theme of ["petroleum", "deep", "light"] as const) {
      const r = renderSlide({ ...slide, layout, theme }, [photo], layout === "opening" ? scene : null);
      assertEquals(inspectJpeg(r.bytes), { width: 1080, height: 1350 }); assertEquals(r.actions, []);
      assert(new TextDecoder("latin1").decode(r.bytes.subarray(0, 64)).includes("Exif"));
    }
  }
  const final = renderSlide(null);
  assertEquals(final.actions, ["Curta", "Compartilhe", "Comente", "Salve"]);
  assertEquals(inspectJpeg(final.bytes), { width: 1080, height: 1350 });
  await Deno.mkdir("/tmp/browser/instagram", { recursive: true }).catch(() => {});
  await Deno.writeFile("/tmp/browser/instagram/edge-review.jpg", renderSlide(slide, [photo]).bytes).catch(() => {});
  await Deno.writeFile("/tmp/browser/instagram/edge-final.jpg", final.bytes).catch(() => {});
  console.log(`per-slide ms ≈ ${((performance.now() - started) / 18).toFixed(0)}`);
  assert(slideGeometry("opening", true).photoY !== slideGeometry("numbers", true).photoY);
});
