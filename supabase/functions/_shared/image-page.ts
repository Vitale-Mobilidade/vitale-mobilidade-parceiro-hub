/**
 * Resolução da imagem principal a partir de uma PÁGINA de produto
 * (ex.: link curto meli.la -> página do Mercado Livre).
 *
 * Usado quando a planilha não traz "Imagem da Bike": a origem passa a ser o
 * próprio Link Vitale. Nada de IA aqui — apenas parsing de metadados.
 *
 * `extractPageImage` é PURA (testada por vitest); `resolvePageImageUrl` faz o
 * fetch em Deno com as mesmas proteções SSRF do download de imagem.
 */

import { checkImageUrl, isRedirectStatus, MAX_REDIRECTS } from "./image-safety.ts";

export const MAX_PAGE_BYTES = 2 * 1024 * 1024; // 2MB de HTML é mais que suficiente
const PAGE_TIMEOUT_MS = 15_000;

export class PageImageError extends Error {}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  return content ? decodeEntities(content.trim()) : null;
}

/** Procura a primeira imagem declarada em blocos JSON-LD. */
function fromJsonLd(html: string): string | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    const match = body.match(/"image"\s*:\s*(?:\[\s*)?"([^"]+)"/);
    if (match) return decodeEntities(match[1].trim());
  }
  return null;
}

/**
 * Extrai a URL da imagem principal do HTML.
 * Ordem: og:image -> og:image:secure_url -> twitter:image -> JSON-LD.
 */
export function extractPageImage(html: string): string | null {
  const source = String(html ?? "");
  if (!source) return null;
  const candidates = [
    firstMeta(source, "og:image"),
    firstMeta(source, "og:image:secure_url"),
    firstMeta(source, "twitter:image"),
    fromJsonLd(source),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = candidate.startsWith("//") ? `https:${candidate}` : candidate;
    if (checkImageUrl(url).ok) return url;
  }
  return null;
}

/** true quando a origem é uma página de produto (e não um arquivo de imagem). */
export function looksLikePageUrl(raw: string): boolean {
  const clean = String(raw ?? "").trim().toLowerCase();
  if (!clean) return false;
  return !/\.(jpe?g|png|webp|avif)(\?|#|$)/.test(clean);
}

async function fetchPage(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VitaleMobilidade-ImageWorker/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw new PageImageError("Timeout ao abrir a página do produto");
    throw new PageImageError("Falha de rede ao abrir a página do produto");
  } finally {
    clearTimeout(timer);
  }
}

async function readCappedText(res: Response): Promise<string> {
  const body = res.body;
  if (!body) throw new PageImageError("Página sem conteúdo");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      chunks.push(value);
      if (total > MAX_PAGE_BYTES) break; // og:image fica no <head>: o início basta
    }
  } finally {
    try { await reader.cancel(); } catch { /* noop */ }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Segue o link curto com limite de redirects (validando CADA hop contra SSRF)
 * e devolve a URL da imagem principal da página.
 */
export async function resolvePageImageUrl(pageUrl: string): Promise<string> {
  let current = pageUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = checkImageUrl(current);
    if (!check.ok) throw new PageImageError(`Link rejeitado: ${check.reason}`);

    const res = await fetchPage(check.url);

    if (isRedirectStatus(res.status)) {
      const location = res.headers.get("location");
      try { res.body?.cancel(); } catch { /* noop */ }
      if (!location) throw new PageImageError("Redirect sem cabeçalho Location");
      try {
        current = new URL(location, check.url).toString();
      } catch {
        throw new PageImageError("Redirect com Location inválido");
      }
      continue;
    }

    if (res.status !== 200) {
      try { res.body?.cancel(); } catch { /* noop */ }
      throw new PageImageError(`HTTP ${res.status} ao abrir a página do produto`);
    }

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml")) {
      try { res.body?.cancel(); } catch { /* noop */ }
      throw new PageImageError("A página do produto não retornou HTML");
    }

    const html = await readCappedText(res);
    const image = extractPageImage(html);
    if (!image) throw new PageImageError("Imagem principal não encontrada na página do produto");
    return image;
  }
  throw new PageImageError(`Excedeu o máximo de ${MAX_REDIRECTS} redirects`);
}
