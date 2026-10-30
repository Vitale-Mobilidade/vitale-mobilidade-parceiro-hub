/** Shared by SSR, newsletter curation and editorial context. Lower rank = more offer CTA clicks in 30 days. */
export function offerClickPriority(rank: unknown): number {
  return typeof rank === "number" && Number.isSafeInteger(rank) && rank > 0 ? rank : Infinity;
}

export function compareOfferClickRelevance(
  a: { offerClickRank30d?: number | null; name?: string },
  b: { offerClickRank30d?: number | null; name?: string },
) {
  return offerClickPriority(a.offerClickRank30d) - offerClickPriority(b.offerClickRank30d) ||
    (a.name && b.name ? a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) : 0);
}

export function parseOfferClickRanks(rows: unknown): Map<string, number> | null {
  if (!Array.isArray(rows)) return null;
  const ranks = new Map<string, number>();
  for (const row of rows) {
    const id = row?.bike_id;
    const rank = row?.relevance_rank;
    if (typeof id !== "string" || !/^[a-z0-9_]{1,64}$/.test(id) || !Number.isFinite(offerClickPriority(rank)) || ranks.has(id)) return null;
    ranks.set(id, rank);
  }
  return ranks;
}

export const EDITORIAL_AUDIENCE_PRIORITY = `PRIORIDADE DE AUDIÊNCIA:
offerClickRank30d é a posição por cliques para ofertas nos últimos 30 dias; posição menor indica mais cliques registrados, não vendas nem superioridade técnica. Use apenas para priorizar exemplos e módulos entre bikes já associadas e pertinentes ao assunto sustentado pela fonte. Não acrescente um modelo por popularidade, não mude o protagonista, não resolva identidade ambígua pelo ranking e não repita argumentos de outros conteúdos. Fonte, contexto, evidência e diversidade editorial prevalecem. Ranking ausente não autoriza inventar procura ou desempenho comercial.`;
