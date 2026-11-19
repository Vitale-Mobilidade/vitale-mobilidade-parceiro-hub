const issues: Record<string, string> = {
  instagram_original_missing:
    "A fonte não tem foto original. A preparação automática precisa gerar uma capa vertical.",
  instagram_framing_review_required:
    "A foto disponível precisa de uma capa vertical própria.",
  instagram_auto_generation_pending:
    "A preparação continuará na próxima execução. Cada execução gera no máximo uma capa.",
  instagram_auto_generation_busy:
    "Uma capa está sendo preparada por outra execução.",
  instagram_auto_generation_unconfirmed:
    "Uma geração anterior precisa de conferência antes de uma nova tentativa para essa fonte.",
  instagram_auto_generation_limit:
    "O limite de seis tentativas de capa de hoje foi atingido. A preparação pode continuar amanhã.",
  instagram_ai_credits:
    "A geração automática parou por falta de créditos de imagem no Lovable.",
  instagram_cover_generation_failed:
    "O serviço de imagem falhou ao preparar a próxima capa.",
  instagram_cover_ratio_invalid:
    "A imagem gerada veio fora do formato vertical. A tentativa ficou registrada para conferência.",
  instagram_auto_generation_invalid:
    "A capa gerada não passou na validação. A tentativa ficou registrada para conferência.",
  instagram_caption_evidence_missing:
    "A próxima fonte precisa de revisão da legenda e de sua evidência.",
  instagram_caption_incomplete:
    "A próxima fonte ainda não tem uma legenda completa.",
};

export function instagramAutomationIssue(code: string) {
  return (
    issues[code] ??
    "A próxima fonte precisa de revisão de capa ou conteúdo antes de entrar na fila."
  );
}
