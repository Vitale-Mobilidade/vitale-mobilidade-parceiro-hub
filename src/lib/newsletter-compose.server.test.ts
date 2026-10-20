import { readFile, writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import jpeg from "jpeg-js";
import { composeNewsletterImage } from "./newsletter-compose.server";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
it("composes the fixed brand without title or bottom shading using portable JavaScript", async () => {
  const input = await readFile(
    new URL(
      "../../supabase/functions/_shared/cover-renderer/fixture.png",
      import.meta.url,
    ),
  );
  const result = composeNewsletterImage(input, "image/png");
  expect(inspectJpeg(result)).toEqual({ width: 1280, height: 720 });
  const pixels = jpeg.decode(result, { useTArray: true });
  // Fixture's lower right remains bright: no title or dark overlay.
  const at = (680 * 1280 + 1200) * 4;
  expect(pixels.data[at]).toBeGreaterThan(150);
  expect(pixels.data[at + 1]).toBeGreaterThan(150);
  await writeFile("/tmp/vitale-newsletter-portable.jpg", result);
  expect(inspectJpeg(composeNewsletterImage(result, "image/jpeg"))).toEqual({
    width: 1280,
    height: 720,
  });
});
it("rejects oversized or malformed images before decompression", () => {
  expect(() => composeNewsletterImage(new Uint8Array(30), "image/png")).toThrow(
    "newsletter_background_invalid",
  );
  const header = new Uint8Array(24);
  header.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(header.buffer);
  view.setUint32(16, 9000);
  view.setUint32(20, 9000);
  expect(() => composeNewsletterImage(header, "image/png")).toThrow(
    "newsletter_background_invalid",
  );
});
