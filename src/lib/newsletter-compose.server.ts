// Pure JavaScript: portable to the hosting worker, without dynamic WASM compilation.
import { decode as decodePng } from "fast-png";
import jpeg from "jpeg-js";
import brand from "./newsletter-brand.json";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";

export function composeNewsletterImage(
  bytes: Uint8Array,
  mime: string,
): Uint8Array {
  let width = 0,
    height = 0;
  if (
    mime === "image/png" &&
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (mime === "image/jpeg") {
    const size = inspectJpeg(bytes);
    width = size?.width ?? 0;
    height = size?.height ?? 0;
  }
  if (
    !width ||
    !height ||
    width * height > 4_200_000 ||
    bytes.length > 12 * 1024 * 1024
  )
    throw new Error("newsletter_background_invalid");
  const source =
    mime === "image/png"
      ? decodePng(bytes)
      : jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 64 });
  const channels = "channels" in source ? source.channels : 4;
  if ("depth" in source && source.depth !== 8)
    throw new Error("newsletter_background_depth");
  const w = 1280,
    h = 720,
    out = new Uint8Array(w * h * 4);
  const scale = Math.max(w / width, h / height),
    ox = (width - w / scale) / 2,
    oy = (height - h / scale) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, Math.min(width - 1, ox + (x + 0.5) / scale - 0.5));
      const sy = Math.max(
        0,
        Math.min(height - 1, oy + (y + 0.5) / scale - 0.5),
      );
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        x1 = Math.min(width - 1, x0 + 1),
        y1 = Math.min(height - 1, y0 + 1),
        tx = sx - x0,
        ty = sy - y0;
      for (let c = 0; c < 3; c++) {
        const channel = channels < 3 ? 0 : c;
        const at = (xx: number, yy: number) =>
          source.data[(yy * width + xx) * channels + channel];
        out[(y * w + x) * 4 + c] =
          (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) +
          (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
      }
      out[(y * w + x) * 4 + 3] = 255;
    }
  const pillWidth = brand.width + 44;
  for (let y = 0; y < 52; y++)
    for (let x = 0; x < pillWidth; x++) {
      const cx = Math.max(26, Math.min(pillWidth - 26, x));
      if ((x - cx) ** 2 + (y - 26) ** 2 <= 26 ** 2)
        out.set([4, 120, 87, 255], ((56 + y) * w + 64 + x) * 4);
    }
  const text = Uint8Array.from(atob(brand.pixels), (c) => c.charCodeAt(0));
  for (let y = 0; y < brand.height; y++)
    for (let x = 0; x < brand.width; x++) {
      const from = (y * brand.width + x) * 4,
        to = ((56 + Math.floor((52 - brand.height) / 2) + y) * w + 86 + x) * 4,
        alpha = text[from + 3] / 255;
      for (let c = 0; c < 3; c++)
        out[to + c] = out[to + c] * (1 - alpha) + text[from + c] * alpha;
    }
  const result = jpeg.encode({ data: out, width: w, height: h }, 85).data;
  if (result.length > 4 * 1024 * 1024)
    throw new Error("newsletter_image_too_large");
  return result;
}
