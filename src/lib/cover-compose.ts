/** Browser-side composition of AI cover backgrounds: exact title + Vitale brand, JPG 1280×720. */
export const COVER_W = 1280;
export const COVER_H = 720;
export const COVER_MAX_BYTES = 4 * 1024 * 1024;

/** Greedy word wrap. Returns null when the text does not fit in maxLines (caller shrinks the font). */
export function wrapTitle(text: string, measure: (s: string) => number, maxWidth: number, maxLines: number): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) { line = next; continue; }
    if (!line || measure(word) > maxWidth) return null; // a single word never gets cut or hyphenated
    lines.push(line);
    line = word;
    if (lines.length >= maxLines) return null;
  }
  if (line) lines.push(line);
  return lines.length <= maxLines ? lines : null;
}

/** Largest font size (step 4px) whose wrap fits; the exact title is never truncated. */
export function fitTitle(text: string, measureAt: (s: string, size: number) => number, maxWidth: number, maxLines = 3,
  sizes: number[] = [76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36]): { size: number; lines: string[] } | null {
  for (const size of sizes) {
    const lines = wrapTitle(text, (s) => measureAt(s, size), maxWidth, maxLines);
    if (lines) return { size, lines };
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem gerada."));
    img.src = src;
  });
}

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

export async function composeCover(background: string, title: string): Promise<{ dataUrl: string; bytes: number }> {
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const img = await loadImage(background);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W; canvas.height = COVER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  // Cover-fit crop of the AI background.
  const scale = Math.max(COVER_W / img.naturalWidth, COVER_H / img.naturalHeight);
  const w = img.naturalWidth * scale; const h = img.naturalHeight * scale;
  ctx.drawImage(img, (COVER_W - w) / 2, (COVER_H - h) / 2, w, h);
  // Legibility gradient (canvas pixels, not UI tokens).
  const grad = ctx.createLinearGradient(0, COVER_H * 0.35, 0, COVER_H);
  grad.addColorStop(0, "rgba(6, 24, 18, 0)");
  grad.addColorStop(1, "rgba(6, 24, 18, 0.88)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, COVER_W, COVER_H);
  // Brand pill.
  ctx.font = `700 26px ${FONT}`;
  const brand = "Vitale Mobilidade";
  const bw = ctx.measureText(brand).width + 44;
  ctx.fillStyle = "#047857";
  ctx.beginPath(); ctx.roundRect(64, 56, bw, 52, 26); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.textBaseline = "middle"; ctx.fillText(brand, 86, 83);
  // Exact title.
  const maxWidth = COVER_W - 128;
  const fit = fitTitle(title, (s, size) => { ctx.font = `800 ${size}px ${FONT}`; return ctx.measureText(s).width; }, maxWidth);
  if (!fit) throw new Error("O título é longo demais para caber na capa sem cortes. Encurte o título.");
  ctx.font = `800 ${fit.size}px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 12;
  const lineH = Math.round(fit.size * 1.15);
  let y = COVER_H - 64 - lineH * (fit.lines.length - 1);
  for (const line of fit.lines) { ctx.fillText(line, 64, y); y += lineH; }
  for (const q of [0.88, 0.8, 0.7, 0.6]) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    const bytes = Math.floor((dataUrl.length - "data:image/jpeg;base64,".length) * 3 / 4);
    if (bytes <= COVER_MAX_BYTES) return { dataUrl, bytes };
  }
  throw new Error("A capa ficou acima de 4 MB.");
}
