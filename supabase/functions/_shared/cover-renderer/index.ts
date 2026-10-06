/** Server-only compositor. No network, browser, language model, or remote renderer. */
import * as jpeg from "./vendor/jpeg.js";
import * as png from "./vendor/png.js";
import { Font, Layout } from "./vendor/font.js";
import { fitTitle } from "../cover-title.ts";
import {
  inspectJpeg,
  COVER_MAX_BYTES,
  COVER_WIDTH,
  COVER_HEIGHT,
} from "../editorial-cover.ts";
import { interFontBase64 } from "./assets.ts";
const W = COVER_WIDTH,
  H = COVER_HEIGHT;
const MAX_INPUT = 12 * 1024 * 1024;
const MAX_PIXELS = 4_200_000;
let fontBytes: Uint8Array | undefined;
type Raster = { width: number; height: number; buffer: Uint8Array };

function decode(background: string): Raster {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    background,
  );
  if (!match || match[2].length > Math.ceil(MAX_INPUT / 3) * 4)
    throw new Error("cover_background_invalid");
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  let dimensions: { width: number; height: number } | null = null;
  if (match[1] === "jpeg") dimensions = inspectJpeg(bytes);
  else if (
    bytes.length >= 24 &&
    bytes
      .slice(0, 8)
      .every((value, i) => value === [137, 80, 78, 71, 13, 10, 26, 10][i])
  ) {
    const view = new DataView(bytes.buffer);
    dimensions = { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width * dimensions.height > MAX_PIXELS
  )
    throw new Error("cover_background_dimensions_invalid");
  if (match[1] === "png") {
    const image = png.decode(bytes);
    return {
      width: image.width,
      height: image.height,
      buffer: image.framebuffer,
    };
  }
  const image = jpeg.decode(bytes, 0, 0);
  if (![0, 1, 2].includes(image.format))
    throw new Error("cover_background_format_unsupported");
  const channels = image.format === 0 ? 1 : image.format === 1 ? 3 : 4;
  const buffer = new Uint8Array(image.width * image.height * 4);
  for (let i = 0; i < image.width * image.height; i++) {
    for (let channel = 0; channel < 3; channel++) {
      const value = image.buffer[i * channels + (channels === 1 ? 0 : channel)];
      buffer[i * 4 + channel] =
        channels === 4
          ? 255 * (1 - value / 255) * (1 - image.buffer[i * channels + 3] / 255)
          : value;
    }
    buffer[i * 4 + 3] = 255;
  }
  return { width: image.width, height: image.height, buffer };
}
function fitBackground(source: Raster): Uint8Array {
  const out = new Uint8Array(W * H * 4);
  const scale = Math.max(W / source.width, H / source.height);
  const ox = (source.width - W / scale) / 2,
    oy = (source.height - H / scale) / 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const sx = Math.max(
        0,
        Math.min(source.width - 1, ox + (x + 0.5) / scale - 0.5),
      );
      const sy = Math.max(
        0,
        Math.min(source.height - 1, oy + (y + 0.5) / scale - 0.5),
      );
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        x1 = Math.min(source.width - 1, x0 + 1),
        y1 = Math.min(source.height - 1, y0 + 1);
      const tx = sx - x0,
        ty = sy - y0;
      const dark = Math.max(0, (y - H * 0.35) / (H * 0.65)) * 0.88;
      for (let c = 0; c < 3; c++) {
        const top =
          source.buffer[(y0 * source.width + x0) * 4 + c] * (1 - tx) +
          source.buffer[(y0 * source.width + x1) * 4 + c] * tx;
        const bottom =
          source.buffer[(y1 * source.width + x0) * 4 + c] * (1 - tx) +
          source.buffer[(y1 * source.width + x1) * 4 + c] * tx;
        out[(y * W + x) * 4 + c] =
          (top * (1 - ty) + bottom * ty) * (1 - dark) + [6, 24, 18][c] * dark;
      }
      out[(y * W + x) * 4 + 3] = 255;
    }
  return out;
}
function composite(
  out: Uint8Array,
  text: Raster,
  x: number,
  y: number,
  shadow = false,
) {
  for (let sy = 0; sy < text.height; sy++)
    for (let sx = 0; sx < text.width; sx++) {
      const px = x + sx,
        py = y + sy;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const at = (sy * text.width + sx) * 4,
        to = (py * W + px) * 4;
      const alpha = (text.buffer[at + 3] / 255) * (shadow ? 0.45 : 1);
      for (let c = 0; c < 3; c++)
        out[to + c] =
          out[to + c] * (1 - alpha) +
          (shadow ? 0 : text.buffer[at + c]) * alpha;
    }
}
function rasterText(
  font: InstanceType<typeof Font>,
  text: string,
  size: number,
): Raster {
  const layout = new Layout();
  try {
    layout.reset({
      wrap_style: "word",
      vertical_align: "top",
      horizontal_align: "left",
    });
    layout.append(font, text, { scale: size });
    return layout.rasterize(255, 255, 255);
  } finally {
    layout.free();
  }
}
export async function composeServerCover(
  background: string,
  title: string,
): Promise<{ bytes: Uint8Array; title: string; lines: string[] }> {
  if (!title.trim() || title.length > 200)
    throw new Error("cover_title_invalid");
  fontBytes ??= Uint8Array.from(atob(interFontBase64), (char) =>
    char.charCodeAt(0),
  );
  const fontData = fontBytes;
  const fonts = new Map<number, InstanceType<typeof Font>>();
  const font = (size: number) => {
    if (!fonts.has(size)) fonts.set(size, new Font(size, fontData));
    return fonts.get(size)!;
  };
  try {
    for (const char of title)
      if (!/\s/.test(char) && !font(76).has(char))
        throw new Error("cover_title_glyph_unsupported");
    const fit = fitTitle(
      title,
      (text, size) =>
        Array.from(text).reduce(
          (total, char) => total + font(size).metrics(char, size).advance_width,
          0,
        ),
      W - 128,
    );
    if (!fit) throw new Error("cover_title_does_not_fit");
    const out = fitBackground(decode(background));
    const brand = rasterText(font(26), "Vitale Mobilidade", 26);
    const pillWidth = brand.width + 44;
    for (let y = 0; y < 52; y++)
      for (let x = 0; x < pillWidth; x++) {
        const cx = Math.max(26, Math.min(pillWidth - 26, x)),
          cy = 26;
        if ((x - cx) ** 2 + (y - cy) ** 2 > 26 ** 2) continue;
        out.set([4, 120, 87, 255], ((56 + y) * W + 64 + x) * 4);
      }
    composite(out, brand, 86, 56 + Math.floor((52 - brand.height) / 2));
    const lineHeight = Math.round(fit.size * 1.15);
    for (let i = 0; i < fit.lines.length; i++) {
      const line = rasterText(font(fit.size), fit.lines[i], fit.size);
      if (line.width > W - 128) throw new Error("cover_title_does_not_fit");
      const y = H - 64 - lineHeight * (fit.lines.length - 1 - i) - line.height;
      composite(out, line, 66, y + 3, true);
      composite(out, line, 64, y);
    }
    for (const quality of [88, 80, 70, 60]) {
      const bytes = jpeg.encode(out, W, H, quality);
      if (bytes.length <= COVER_MAX_BYTES)
        return { bytes, title, lines: fit.lines };
    }
    throw new Error("cover_output_too_large");
  } finally {
    for (const item of fonts.values()) item.free();
  }
}
