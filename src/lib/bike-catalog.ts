// Catálogo editorial read-only a partir da aba oficial de bikes (gid=0).
// Inclui TODAS as linhas nomeadas, inclusive "Não Elegível" (elegibilidade só afeta o Quiz).
// Não escreve em lugar nenhum; o writer Sheets→banco segue intacto.
import {
  parseCsvRows,
  normalizeName,
  resolveBikeId,
  buildStableId,
  parseVitaleLink,
  parseImageUrl,
  parseBrlPrice,
} from "../../supabase/functions/_shared/bike-sheet";

export type CatalogBike = {
  bikeId: string; // ID canônico técnico (igual ao usado no Radar/Quiz)
  slug: string; // slug editorial de URL, separado do bikeId
  name: string;
  link: string | null; // meli.la exato da planilha, ou null
  sheetPrice: number | null; // preço de referência na planilha (não verificado como "hoje")
  autonomy: string | null;
  capacity: string | null;
  description: string | null;
  image: string | null;
  category: string | null;
};

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slug editorial explícito: bikeId com "_" -> "-". Determinístico e reversível só via o catálogo. */
export function slugFromBikeId(bikeId: string): string {
  return bikeId.replace(/_/g, "-");
}

function cell(v: string | undefined): string | null {
  const t = String(v ?? "").replace(/\s+/g, " ").trim();
  return t ? t : null;
}

export function buildBikeCatalog(csv: string): CatalogBike[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => normalizeName(h));
  const idx = (k: string) => head.indexOf(k);
  const iName = idx("nome");
  if (iName < 0) return [];
  const iLink = idx("link_vitale");
  const iPrice = head.findIndex((h) => h.startsWith("pre_o") || h.startsWith("preco"));
  const iAut = idx("autonomia");
  const iCap = idx("capacidade");
  const iDesc = head.findIndex((h) => h.startsWith("descri"));
  const iImg = idx("imagem_da_bike");
  const iCat = idx("categoria");

  const out: CatalogBike[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const r of rows.slice(1)) {
    const name = cell(r[iName]);
    if (!name) continue;
    const bikeId = resolveBikeId(name) ?? buildStableId("", name);
    if (!bikeId) continue;
    const slug = slugFromBikeId(bikeId);
    // Colisão: mantém a primeira linha; nunca sobrescreve.
    if (seenIds.has(bikeId) || seenSlugs.has(slug) || !SLUG_RE.test(slug)) continue;
    seenIds.add(bikeId);
    seenSlugs.add(slug);
    const rawLink = String(r[iLink] ?? "").trim();
    const valid = parseVitaleLink(rawLink);
    out.push({
      bikeId,
      slug,
      name,
      link: valid && valid === rawLink ? rawLink : null, // byte-a-byte ou nada
      sheetPrice: iPrice >= 0 ? parseBrlPrice(String(r[iPrice] ?? "")) : null,
      autonomy: iAut >= 0 ? cell(r[iAut]) : null,
      capacity: iCap >= 0 ? cell(r[iCap]) : null,
      description: iDesc >= 0 ? String(r[iDesc] ?? "").trim() || null : null,
      image: iImg >= 0 ? parseImageUrl(String(r[iImg] ?? "")) : null,
      category: iCat >= 0 ? cell(r[iCat]) : null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
