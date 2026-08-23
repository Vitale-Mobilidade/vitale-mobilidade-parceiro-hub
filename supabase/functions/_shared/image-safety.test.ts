import { describe, expect, it } from "vitest";
import {
  checkImageUrl,
  declaredSizeExceeds,
  detectImageType,
  isBlockedIp,
  isRedirectStatus,
  MAX_IMAGE_BYTES,
  MAX_REDIRECTS,
  normalizeContentType,
  sanitizeBikeId,
} from "./image-safety";

describe("checkImageUrl (SSRF)", () => {
  it("aceita URL https pública", () => {
    const r = checkImageUrl("https://cdn.exemplo.com/img/bike.jpg?x=1");
    expect(r.ok).toBe(true);
  });

  it("rejeita http, credenciais e porta não-padrão", () => {
    expect(checkImageUrl("http://exemplo.com/a.png").ok).toBe(false);
    expect(checkImageUrl("https://user:pass@exemplo.com/a.png").ok).toBe(false);
    expect(checkImageUrl("https://exemplo.com:8443/a.png").ok).toBe(false);
  });

  it("rejeita localhost e hosts internos", () => {
    for (const u of [
      "https://localhost/a.png",
      "https://127.0.0.1/a.png",
      "https://metadata.google.internal/a.png",
      "https://app.local/a.png",
      "https://db.internal/a.png",
    ]) {
      expect(checkImageUrl(u).ok).toBe(false);
    }
  });

  it("rejeita IPs privados, reservados, link-local e metadata", () => {
    for (const u of [
      "https://10.0.0.5/a.png",
      "https://172.16.0.1/a.png",
      "https://192.168.1.1/a.png",
      "https://169.254.169.254/latest/meta-data",
      "https://0.0.0.0/a.png",
      "https://[::1]/a.png",
      "https://[fe80::1]/a.png",
      "https://[fd00::1]/a.png",
    ]) {
      expect(checkImageUrl(u).ok).toBe(false);
    }
  });

  it("rejeita IPv4-mapped em IPv6 que aponta para rede privada", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:10.1.2.3")).toBe(true);
    expect(isBlockedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("isBlockedIp cobre faixas públicas e privadas", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("203.0.113.10")).toBe(true); // TEST-NET-3 reservado
    expect(isBlockedIp("100.64.0.1")).toBe(true); // CGNAT
    expect(isBlockedIp("224.0.0.1")).toBe(true); // multicast
  });
});

describe("redirects", () => {
  it("reconhece os códigos de redirect e o limite é 5", () => {
    for (const s of [301, 302, 303, 307, 308]) expect(isRedirectStatus(s)).toBe(true);
    for (const s of [200, 204, 400, 404, 500]) expect(isRedirectStatus(s)).toBe(false);
    expect(MAX_REDIRECTS).toBe(5);
  });
});

describe("content-type e tamanho", () => {
  it("normaliza e valida Content-Type permitido", () => {
    expect(normalizeContentType("image/jpeg")).toBe("image/jpeg");
    expect(normalizeContentType("Image/PNG; charset=binary")).toBe("image/png");
    expect(normalizeContentType("image/webp")).toBe("image/webp");
    expect(normalizeContentType("image/avif")).toBe("image/avif");
    expect(normalizeContentType("application/octet-stream")).toBe("application/octet-stream");
  });

  it("rejeita Content-Type ausente ou fora da allowlist", () => {
    expect(normalizeContentType(null)).toBeNull();
    expect(normalizeContentType("text/html")).toBeNull();
    expect(normalizeContentType("image/svg+xml")).toBeNull();
    expect(normalizeContentType("application/json")).toBeNull();
  });

  it("detecta Content-Length acima do limite", () => {
    expect(declaredSizeExceeds(String(MAX_IMAGE_BYTES))).toBe(false);
    expect(declaredSizeExceeds(String(MAX_IMAGE_BYTES + 1))).toBe(true);
    expect(declaredSizeExceeds(null)).toBe(false);
    expect(declaredSizeExceeds("abc")).toBe(false);
    expect(MAX_IMAGE_BYTES).toBe(8 * 1024 * 1024);
  });
});

describe("magic bytes", () => {
  it("detecta JPEG, PNG, WebP e AVIF", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("image/png");
    const webp = new Uint8Array(12);
    "RIFF".split("").forEach((c, i) => (webp[i] = c.charCodeAt(0)));
    "WEBP".split("").forEach((c, i) => (webp[8 + i] = c.charCodeAt(0)));
    expect(detectImageType(webp)).toBe("image/webp");
    const avif = new Uint8Array(12);
    "ftyp".split("").forEach((c, i) => (avif[4 + i] = c.charCodeAt(0)));
    "avif".split("").forEach((c, i) => (avif[8 + i] = c.charCodeAt(0)));
    expect(detectImageType(avif)).toBe("image/avif");
  });

  it("rejeita HTML, PDF e conteúdo arbitrário", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html>");
    const pdf = new TextEncoder().encode("%PDF-1.7 abc");
    expect(detectImageType(html)).toBeNull();
    expect(detectImageType(pdf)).toBeNull();
    expect(detectImageType(new Uint8Array(12))).toBeNull();
  });
});

describe("sanitizeBikeId", () => {
  it("aceita ids válidos e normaliza caixa", () => {
    expect(sanitizeBikeId("ft03")).toBe("ft03");
    expect(sanitizeBikeId(" V8_Ultra ")).toBe("v8_ultra");
  });

  it("rejeita path traversal, espaços internos e caracteres especiais", () => {
    expect(sanitizeBikeId(null)).toBeNull();
    expect(sanitizeBikeId("")).toBeNull();
    expect(sanitizeBikeId("../secrets")).toBeNull();
    expect(sanitizeBikeId("a/b")).toBeNull();
    expect(sanitizeBikeId("a b")).toBeNull();
    expect(sanitizeBikeId("bike.png")).toBeNull();
    expect(sanitizeBikeId("x".repeat(65))).toBeNull();
  });
});

describe("idempotência do asset (decisões puras)", () => {
  it("mesma URL de origem + ready = skip; URL nova + ready = needs_review", () => {
    const asset = { status: "ready", stored_source_url: "https://a.com/x.jpg", source_url: "https://a.com/x.jpg" };
    const sameSource = asset.status === "ready" && asset.stored_source_url === asset.source_url;
    expect(sameSource).toBe(true);
    const changed = { ...asset, source_url: "https://a.com/y.jpg" };
    const changedSource = changed.status === "ready" && changed.stored_source_url !== changed.source_url;
    expect(changedSource).toBe(true);
  });
});
