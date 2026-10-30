# Prioridade de bikes por interesse real

Decisão do responsável em 30/10/2026: o padrão de relevância do site é a posição por **cliques para ofertas nos últimos 30 dias civis**, incluindo o dia atual em `America/Sao_Paulo`. Essa prioridade orienta Radar, Home, newsletter e contexto de criação editorial.

- Autoridade única: RPC `get_radar_offer_click_ranks_30d()`. Usa CTAs do Quiz e demais cliques de oferta do site sem duplicar seus espelhos. Não usa acessos, termos de busca, recomendações automáticas ou vendas como substitutos. Empates do site são A–Z. Contagens, eventos e leads permanecem privados; só identidade e rank são públicos.
- Relevância de audiência não comprova qualidade técnica, segurança, desempenho, superioridade ou venda. Oferta atual válida, pertinência ao leitor, contexto e fatos verificáveis são pré-condições.
- Radar da newsletter: somente quedas verificadas e ofertas atuais; preferir modelos/famílias que não apareceram nas seis edições recentes, depois os menos recentes quando o catálogo é finito; dentro de candidatos equivalentes, priorizar rank de cliques antes de percentual de queda. Preferir famílias diferentes nos três cards. Não inventar três ofertas quando faltam candidatas.
- Destaque da newsletter: diversidade em relação às leituras, vídeos e cards da mesma edição, rotação entre edições e depois rank. O ranking não é licença para repetir sempre a líder.
- Leituras e vídeos: nunca reutilizar artigo, título ou vídeo subjacente já enviado. Entre fontes inéditas e pertinentes, usar relevância das bikes associadas, preservando a diversidade de famílias e temas. Guias sem modelo explícito continuam elegíveis.
- Artigos: a fonte integral define assunto e identidade dos modelos. Rank só prioriza exemplos/módulos de bikes já associadas e pertinentes. Não inserir uma bike popular ausente, mudar protagonista, resolver ambiguidade por clique, copiar argumentos ou transformar todo assunto em avaliação de produto. QA e evidências mantêm autoridade.
- Falha de analytics: Radar continua em A–Z com aviso; nova preparação automática da newsletter aguarda fontes completas; artigo conserva a fonte sem inventar rank. Não reprocessar conteúdo histórico nem invalidar estágios pagos só porque o ranking mudou.
- Não reescrever edições enviadas, disparar campanhas, gerar artigos pagos ou mudar agenda como efeito de atualizar esta política.

A coleta do site começou em 08/10/2026; não preencher dias anteriores com zero presumido ou estimativa. A métrica conta eventos, não pessoas únicas, e depende da exposição prévia de cada modelo. Governança, testes, release e rollback: [registro de implementação](RADAR_RELEVANCE_30D_2026-10-30.md).
