/**
 * Validações de segurança para download de imagens de origem externa.
 * Módulo puro (sem APIs Deno) — testado por vitest.
 *
 * Protege contra SSRF: apenas HTTPS, sem credenciais, sem porta exótica,
 * bloqueando localhost, IPs privados/reservados/link-local e endpoints de
 * metadata de nuvem. Também valida o tipo real do arquivo por magic bytes.
 */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_REDIRECTS = 5;
export const DOWNLOAD_TIMEOUT_MS = 15_000;
export const MAX_IMAGE_ATTEMPTS = 3;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const IMAGE_EXTENSION: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function ipv4ToParts(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

/** true para IPv4/IPv6 privado, reservado, loopback, link-local ou metadata. */
export function isBlockedIp(raw: string): boolean {
  const host = String(raw ?? "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;

  const v4 = ipv4ToParts(host);
  if (v4) {
    const [a, b] = v4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 e 192.0.2.0/24
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 0) return true;
    if (a >= 224) return true; // multicast + reservado + broadcast
    return false;
  }

  if (host.includes(":")) {
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fe80") || host.startsWith("fec0")) return true; // link/site local
    if (/^f[cd]/.test(host)) return true; // unique local fc00::/7
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice(7);
      return ipv4ToParts(mapped) ? isBlockedIp(mapped) : true;
    }
    return false;
  }

  return false;
}

export interface UrlCheck {
  ok: boolean;
  reason?: string;
  url?: string;
  hostname?: string;
}

/** Valida uma URL de origem (ou de redirect) antes de qualquer requisição. */
export function checkImageUrl(raw: string): UrlCheck {
  const clean = String(raw ?? "").trim();
  if (!clean) return { ok: false, reason: "URL vazia" };
  let u: URL;
  try {
    u = new URL(clean);
  } catch {
    return { ok: false, reason: "URL inválida" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "Somente HTTPS é aceito" };
  if (u.username || u.password) return { ok: false, reason: "URL com credenciais não é aceita" };
  if (u.port && u.port !== "443") return { ok: false, reason: "Porta não permitida" };

  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, reason: "Host bloqueado" };
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "Host interno bloqueado" };
  }
  if (isBlockedIp(host)) return { ok: false, reason: "Endereço IP privado/reservado bloqueado" };
  if (!host.includes(".") && !host.includes(":")) return { ok: false, reason: "Host inválido" };

  return { ok: true, url: u.toString(), hostname: host };
}

/** Detecta o tipo real do arquivo pelos primeiros bytes. */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (!bytes || bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  const ascii = (i: number, s: string) =>
    s.split("").every((c, k) => b[i + k] === c.charCodeAt(0));
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp")) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (["avif", "avis", "av01"].includes(brand)) return "image/avif";
  }
  return null;
}
