// Sanitiza texto vindo da IA (ou de fallbacks) antes de exibir ao usuário.
// Remove qualquer menção a identificadores internos das bikes (id, slug,
// bike_id) e qualquer citação a origem/campanha/UTM/vídeo/anúncio/conteúdo.

const INTERNAL_ID_RE =
  /\s*[\(\[]?\s*(?:id|bike_id|slug|item_id)\s*[:=]\s*["']?[a-z0-9_\-]+["']?\s*[\)\]]?/gi;

// Frases inteiras que fazem referência à origem do lead (conteúdo, campanha,
// anúncio, vídeo, YouTube, Meta, Instagram, Facebook, UTM, source_url).
const ORIGIN_SENTENCE_RE =
  /(?:^|(?<=[.!?…]\s))[^.!?…]*?(?:conteúdo|conteudo|campanha|anúncio|anuncio|utm|youtube|instagram|facebook|meta ads|source_url|traffic_origin|origem do lead|veio do|chegou (?:pelo|por|ao|através))[^.!?…]*[.!?…]?/gi;

export function sanitizeAssistantText(input: string | null | undefined): string {
  if (!input) return "";
  let out = String(input);
  out = out.replace(INTERNAL_ID_RE, "");
  out = out.replace(ORIGIN_SENTENCE_RE, "");
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}
