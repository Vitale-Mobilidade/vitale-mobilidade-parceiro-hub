/** Server-only compositor. No network, browser, language model, or remote renderer. */
import * as jpeg from "./vendor/jpeg.js";
import * as png from "./vendor/png.js";
import { Font, Layout } from "./vendor/font.js";
import { fitTitle } from "../cover-title.ts";
import { fullBleedFrame, SINGLE_IMAGE_FORMATS, type FrameEvidence } from "../cover-framing.ts";
import {
  inspectJpeg,
  COVER_MAX_BYTES,
  COVER_WIDTH,
  COVER_HEIGHT,
} from "../editorial-cover.ts";
import { interFontBase64 } from "./assets.ts";
const MAX_INPUT = 12 * 1024 * 1024;
const MAX_PIXELS = 4_200_000;
let fontBytes: Uint8Array | undefined;
type Raster = { width: number; height: number; buffer: Uint8Array };

function decode(bytes: Uint8Array, format: "png" | "jpeg"): Raster {
  if (bytes.length > MAX_INPUT) throw new Error("cover_background_invalid");
  let dimensions: { width: number; height: number } | null = null;
  if (format === "jpeg") dimensions = inspectJpeg(bytes);
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
  if (format === "png") {
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
function fitBackground(source: Raster, W: number, H: number): Uint8Array {
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
function fitWholeInstagramPhoto(source: Raster, W: number, H: number): Uint8Array {
  const out = new Uint8Array(W * H * 4);
  for (let p = 0; p < out.length; p += 4) out.set([6, 24, 18, 255], p);
  const boxHeight = 870;
  const scale = Math.min(W / source.width, boxHeight / source.height);
  const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
  const left = Math.floor((W - width) / 2), top = Math.floor((boxHeight - height) / 2);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(source.width - 1, Math.floor(x / scale));
    const sy = Math.min(source.height - 1, Math.floor(y / scale));
    out.set(source.buffer.subarray((sy * source.width + sx) * 4, (sy * source.width + sx) * 4 + 4), ((top + y) * W + left + x) * 4);
  }
  return out;
}
function composite(
  out: Uint8Array,
  text: Raster,
  x: number,
  y: number,
  W: number,
  H: number,
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
export async function composeServerCover(background: string, title: string) {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(background);
  if (!match || match[2].length > Math.ceil(MAX_INPUT / 3) * 4)
    throw new Error("cover_background_invalid");
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return composeCover(decode(bytes, match[1] === "png" ? "png" : "jpeg"), title, false);
}

export async function composeSquarePodcastCover(
  background: { bytes: Uint8Array; mime: "image/png" | "image/jpeg" } | null,
  title: string,
) {
  const source = background
    ? decode(background.bytes, background.mime === "image/png" ? "png" : "jpeg")
    : { width: 1, height: 1, buffer: new Uint8Array([13, 89, 67, 255]) };
  return composeCover(source, title, true);
}

function composeCover(source: Raster, title: string, square: boolean, portrait = false, fullBleed?: Uint8Array) {
  const W = portrait ? 1080 : square ? 1400 : COVER_WIDTH, H = portrait ? 1350 : square ? 1400 : COVER_HEIGHT;
  const inset = portrait ? 120 : square ? 100 : 64;
  const bottom = portrait ? 100 : square ? 108 : 64;
  const top = square ? 88 : 56;
  if (!title.trim() || title.length > 200)
    throw new Error("cover_title_invalid");
  fontBytes ??= Uint8Array.from(atob(interFontBase64), (char) =>
    char.charCodeAt(0),
  );
  const fontData = fontBytes;
  const fonts = new Map<number, InstanceType<typeof Font>>();
  const font = (size: number) => {
    if (!fonts.has(size)) fonts.set(size, new Font(size, fontData));
    const value = fonts.get(size);
    if (!value) throw new Error("cover_font_missing");
    return value;
  };
  try {
    for (const char of title)
      if (!/\s/.test(char) && !font(76).has(char))
        throw new Error("cover_title_glyph_unsupported");
    const advances = new Map<string, number>();
    const measure = (text: string, size: number) => Array.from(text).reduce((total, char) => {
      const key = `${size}:${char}`;
      if (!advances.has(key)) advances.set(key, font(size).metrics(char, size).advance_width);
      return total + (advances.get(key) ?? 0);
    }, 0);
    let sizes = fullBleed ? (portrait ? [52,48,44] : square ? [56,52,48,44] : [40,36]) : [ ...(square ? [112, 104, 96, 88, 82] : []), 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36];
    let fit: ReturnType<typeof fitTitle> = null;
    let lines: Raster[] = [];
    // Glyph advances can under-estimate the final raster bounds. Validate actual lines and shrink without cutting text.
    while (sizes.length) {
      const candidate = fitTitle(title, measure, W - 2 * inset, portrait ? 4 : square ? 4 : 3, sizes);
      if (!candidate) break;
      const rendered = candidate.lines.map(line => rasterText(font(candidate.size), line, candidate.size));
      if (rendered.every(line => line.width <= W - 2 * inset)) { fit = candidate; lines = rendered; break; }
      sizes = sizes.filter(size => size < candidate.size);
    }
    if (!fit) throw new Error("cover_title_does_not_fit");
    const out = fullBleed ?? (portrait ? fitWholeInstagramPhoto(source, W, H) : fitBackground(source, W, H));
    const brandSize = square ? 34 : 26;
    const brand = rasterText(font(brandSize), square ? "VITALE MOBILIDADE" : "Vitale Mobilidade", brandSize);
    const pillWidth = brand.width + 44;
    for (let y = 0; y < 52; y++)
      for (let x = 0; x < pillWidth; x++) {
        const cx = Math.max(26, Math.min(pillWidth - 26, x)),
          cy = 26;
        if ((x - cx) ** 2 + (y - cy) ** 2 > 26 ** 2) continue;
        out.set([4, 120, 87, 255], ((top + y) * W + inset + x) * 4);
      }
    composite(out, brand, inset + 22, top + Math.floor((52 - brand.height) / 2), W, H);
    const lineHeight = Math.round(fit.size * 1.15);
    for (let i = 0; i < fit.lines.length; i++) {
      const line = lines[i];
      const y = H - bottom - lineHeight * (fit.lines.length - 1 - i) - line.height;
      if(fullBleed) for(let py=Math.max(0,y-14);py<Math.min(H,y+line.height+14);py++) for(let px=Math.max(0,inset-16);px<Math.min(W,inset+line.width+16);px++) {
        // Contrast only within glyph bounds, with feathered edges; never blanket-darken the photo.
        const feather=Math.min(1,(px-inset+16)/16,(inset+line.width+16-px)/16,(py-y+14)/14,(y+line.height+14-py)/14);
        const at=(py*W+px)*4;for(let c=0;c<3;c++)out[at+c]*=1-0.55*Math.max(0,feather);
      }
      composite(out, line, inset + 2, y + 3, W, H, true);
      composite(out, line, inset, y, W, H);
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

/** New opt-in variants only. Legacy article/RSS/IG renders above remain byte-compatible. */
export async function composeFullBleedCover(background:{bytes:Uint8Array;mime:'image/png'|'image/jpeg'},title:string,format:keyof typeof SINGLE_IMAGE_FORMATS,evidence:FrameEvidence){
 const source=decode(background.bytes,background.mime==='image/png'?'png':'jpeg'),[W,H]=SINGLE_IMAGE_FORMATS[format];
 const frame=fullBleedFrame(source.width,source.height,W,H,evidence),out=new Uint8Array(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const sx=Math.min(source.width-1,Math.floor(frame.x+x/frame.scale)),sy=Math.min(source.height-1,Math.floor(frame.y+y/frame.scale));
  out.set(source.buffer.subarray((sy*source.width+sx)*4,(sy*source.width+sx)*4+4),(y*W+x)*4);
 }
 return composeCover(source,title,format==='podcast',format==='instagram',out);
}

/** Same legacy typography/brand, Instagram-only whole-photo 4:5 with grid-safe sides. */
export async function composeInstagramPostCover(background: { bytes: Uint8Array; mime: "image/png" | "image/jpeg" }, title: string) {
  return composeCover(decode(background.bytes, background.mime === "image/png" ? "png" : "jpeg"), title, false, true);
}

/** Safe fallback: entire published JPEG, including its existing title/brand, inside the grid. */
export async function containPublishedInstagramCover(bytes: Uint8Array) {
  const source = decode(bytes, "jpeg");
  const W = 1080, H = 1350, inset = 120;
  const out = new Uint8Array(W * H * 4);
  for (let p = 0; p < out.length; p += 4) out.set([6, 24, 18, 255], p);
  const scale = Math.min((W - 2 * inset) / source.width, (H - 2 * inset) / source.height);
  const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
  const left = Math.floor((W - width) / 2), top = Math.floor((H - height) / 2);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(source.width - 1, Math.floor(x / scale));
    const sy = Math.min(source.height - 1, Math.floor(y / scale));
    out.set(source.buffer.subarray((sy * source.width + sx) * 4, (sy * source.width + sx) * 4 + 4), ((top + y) * W + left + x) * 4);
  }
  const encoded = jpeg.encode(out, W, H, 88);
  if (encoded.length > COVER_MAX_BYTES) throw new Error("cover_output_too_large");
  return { bytes: encoded };
}
