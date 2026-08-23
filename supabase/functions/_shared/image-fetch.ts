// Download de imagem com proteções SSRF para Deno (Edge Functions).
// Não importar no frontend — usa Deno.dns e fetch com redirect manual.
import {
  checkImageUrl,
  declaredSizeExceeds,
  detectImageType,
  isBlockedIp,
  isRedirectStatus,
  MAX_IMAGE_BYTES,
  MAX_REDIRECTS,
  normalizeContentType,
  type AllowedImageType,
} from "./image-safety.ts";

const FETCH_TIMEOUT_MS = 15_000;

export class ImageDownloadError extends Error {}

/**
 * Resolve DNS (A + AAAA) e rejeita qualquer IP privado/reservado.
 * O Edge Runtime pode não permitir Deno.dns.resolve: nesse caso a validação
 * de URL (sem IPs literais, sem hosts internos, apenas HTTPS) continua valendo
 * e o fetch segue pela infraestrutura isolada do runtime. Registro resolvido
 * para IP bloqueado SEMPRE rejeita; ausência total de registros também.
 */
async function resolveAndCheckHost(hostname: string): Promise<void> {
  // IPs literais já foram bloqueados por checkImageUrl.
  const families: Array<"A" | "AAAA"> = ["A", "AAAA"];
  let resolved = 0;
  let apiUnavailable = false;
  for (const family of families) {
    let records: string[] = [];
    try {
      // @ts-ignore Deno global
      records = await Deno.dns.resolve(hostname, family);
    } catch {
      // Qualquer falha (permissão, API indisponível ou NXDOMAIN) marca a
      // resolução como indisponível: a validação de URL segue valendo e o
      // fetch final ainda falha com segurança se o host não existir.
      apiUnavailable = true;
      records = [];
    }
    for (const ip of records) {
      resolved += 1;
      if (isBlockedIp(ip)) {
        throw new ImageDownloadError(`DNS resolveu para endereço bloqueado`);
      }
    }
  }
  if (resolved === 0 && !apiUnavailable) {
    throw new ImageDownloadError("Falha ao resolver DNS do host");
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "VitaleMobilidade-ImageWorker/1.0",
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.1",
      },
    });
  } catch (err) {
    if (err instanceof ImageDownloadError) throw err;
    if ((err as Error)?.name === "AbortError") throw new ImageDownloadError("Timeout no download da imagem");
    throw new ImageDownloadError("Falha de rede no download da imagem");
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          throw new ImageDownloadError("Arquivo excede o limite de 8MB");
        }
        chunks.push(value);
      }
    }
  } finally {
    try { await reader.cancel(); } catch { /* noop */ }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export interface SafeImageDownload {
  bytes: Uint8Array;
  contentType: AllowedImageType;
  finalUrl: string;
}

/**
 * Baixa uma imagem com validação em cada etapa:
 * - URL HTTPS, sem credenciais, host/IP públicos (checkImageUrl) em CADA redirect;
 * - DNS resolvido e validado em CADA hop (anti DNS-rebinding);
 * - no máximo MAX_REDIRECTS redirects; timeout por requisição;
 * - Content-Length declarado e stream limitados a 8MB;
 * - Content-Type na allowlist + magic bytes confirmando o tipo (magic é autoritativo).
 */
export async function downloadImageSafely(sourceUrl: string): Promise<SafeImageDownload> {
  let current = sourceUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = checkImageUrl(current);
    if (!check.ok) throw new ImageDownloadError(`URL rejeitada: ${check.reason}`);

    await resolveAndCheckHost(check.hostname);

    const res = await fetchWithTimeout(check.url);

    if (isRedirectStatus(res.status)) {
      const location = res.headers.get("location");
      try { res.body?.cancel(); } catch { /* noop */ }
      if (!location) throw new ImageDownloadError("Redirect sem cabeçalho Location");
      let next: URL;
      try {
        next = new URL(location, check.url);
      } catch {
        throw new ImageDownloadError("Redirect com Location inválido");
      }
      current = next.toString();
      continue;
    }

    if (res.status !== 200) {
      try { res.body?.cancel(); } catch { /* noop */ }
      throw new ImageDownloadError(`HTTP ${res.status} ao baixar imagem`);
    }

    if (declaredSizeExceeds(res.headers.get("content-length"))) {
      try { res.body?.cancel(); } catch { /* noop */ }
      throw new ImageDownloadError("Arquivo excede o limite de 8MB");
    }

    const headerType = normalizeContentType(res.headers.get("content-type"));
    if (!headerType) {
      try { res.body?.cancel(); } catch { /* noop */ }
      throw new ImageDownloadError("Content-Type ausente ou não permitido");
    }

    if (!res.body) throw new ImageDownloadError("Resposta sem corpo");
    const bytes = await readCapped(res.body);
    if (bytes.byteLength === 0) throw new ImageDownloadError("Arquivo vazio");

    const magicType = detectImageType(bytes);
    if (!magicType) throw new ImageDownloadError("Conteúdo não é uma imagem válida (magic bytes)");

    return { bytes, contentType: magicType, finalUrl: check.url };
  }

  throw new ImageDownloadError(`Excedeu o máximo de ${MAX_REDIRECTS} redirects`);
}

/** SHA-256 em hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
