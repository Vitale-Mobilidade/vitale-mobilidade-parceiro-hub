/**
 * Hashes separados do catálogo.
 *
 * - commercialHash: preço, link e dados comerciais → muda a cada sync comercial.
 * - technicalHash: identidade + Descrição → dispara o perfil técnico de IA
 *   EXATAMENTE uma vez por versão. Preço e link NÃO entram aqui.
 *
 * Módulo puro (usado pelas Edge Functions e pelos testes vitest).
 */

/** FNV-1a hex estável + comprimento (colisão praticamente irrelevante aqui). */
export function stableHash(payload: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + payload.length.toString(16);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export interface HashableBike {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  linkVitale?: string;
  autonomyKm?: number;
  capacity?: number;
}

/** Muda quando preço, link, nome, autonomia ou capacidade mudam. */
export function commercialHash(bike: HashableBike): string {
  return stableHash(JSON.stringify([
    bike.id,
    normalizeText(bike.name),
    bike.price ?? null,
    bike.linkVitale ?? null,
    bike.autonomyKm ?? null,
    bike.capacity ?? null,
  ]));
}

/** Muda SOMENTE quando a bike é nova ou a Descrição muda. */
export function technicalHash(bike: HashableBike): string {
  return stableHash(JSON.stringify([bike.id, normalizeText(bike.description)]));
}

/** Chave determinística e segura do arquivo de imagem no bucket. */
export function imageStorageKey(bikeId: string, sourceUrl: string, ext: string): string {
  const safeId = String(bikeId).replace(/[^a-z0-9_-]/gi, "").slice(0, 60) || "bike";
  const safeExt = String(ext).replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
  const digest = stableHash(String(sourceUrl)).replace(/[^a-z0-9]/gi, "");
  return `${safeId}/${digest}.${safeExt}`;
}
