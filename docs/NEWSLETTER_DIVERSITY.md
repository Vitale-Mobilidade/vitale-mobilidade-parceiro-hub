# Memória editorial da newsletter — 11/10/2026

Classificação estrutural: IA, seleção Radar e histórico de campanhas. Base operacional 3ccfc19. Preparação local, sem publicação ou geração paga.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Variar edições; escassez pode interromper geração; depende de acervo suficiente; prosseguir sem repetir silenciosamente. |
| CTO | Derivar flags do ledger existente; não duplicar estado em coluna; depende de campanhas e catálogos; prosseguir com função pura. |
| IA | Contexto de seis edições e bikes citadas; prompt sozinho não garante variação; seleção determinística e revisor; prosseguir. |
| Segurança | Apenas dados editoriais no contexto, sem destinatários; sem novas permissões; prosseguir. |
| UX | Layout preservado, edição editorial renovada; sem mudança visual; prosseguir. |
| CX | Falta de diversidade deve falhar explicitamente; histórico enviado não inclui prévias; prosseguir mantendo essa distinção. |
| Growth | Evitar fadiga sem esconder quedas reais de preço; preço continua fato atual; prosseguir. |
| PMO | Testes sintéticos e validate obrigatórios; produção depende de autorização; prosseguir localmente. |

Decisão: flag `newsletterUsed` calculada a partir de todo histórico enviado/submetido; artigos nunca reutilizados automaticamente. Bikes citadas por artigo/vídeo/destaque entram na janela de seis edições distintas (não seis coortes). A bike em destaque não repete na janela nem duplica modelos de outras seções. Memória do redator inclui assunto, título e abertura de seis edições. Quedas verificadas continuam elegíveis como atualização de preço: conflito entre relevância factual e rotação resolvido em favor da atualização, mas entram na memória para impedir destaque redundante. Escassez bloqueia composição, sem inventar conteúdo. Sem backfill produtivo, migração ou coluna redundante. Rollback: reverter estes arquivos, preservar ledger.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Artigos usados excluídos e bikes recentes bloqueadas, sem fallback repetitivo. |
| CTO | Pass | Flag derivada do ledger; snapshot opcional mentionedBikeIds no payload existente, sem migration. |
| IA | Pass | Redator/revisor recebem seis assuntos/títulos/aberturas; seleção impõe rotação de fontes/modelos. Validação sem chamadas pagas. |
| Segurança | Pass | Contexto editorial sem PII; nenhum grant/secret alterado. |
| UX | Pass | Renderer e navegação preservados; metadado opcional não altera conteúdo visual. |
| CX | Pass | Falha explícita na escassez; prévias não consomem artigos; coortes deduplicadas por edição. |
| Growth | Pass | Quedas verificadas preservadas; destaque evita artigos/vídeos/Radar da própria edição. |
| PMO | Pass | 39 testes direcionados (memória/curadoria/redator/serviço), lint alvo, diff check e pnpm validate (types/59 regressões/build) aprovados. |

Riscos e limites: seis edições podem consumir disponibilidade de modelos e bloquear pauta; bloqueio é preferível à repetição silenciosa. Histórico antigo sem snapshot depende dos vínculos atuais de artigos/vídeos ainda catalogados, sem inventar IDs ausentes. Campo opcional permite compatibilidade com campanhas existentes. Variação estilística depende do redator e revisor: instruções reforçadas não comprovam qualidade de geração real, que exige homologação autorizada. Não foi feita mudança no painel para mostrar a flag; ela é usada automaticamente pela curadoria. Não consumimos rascunhos ou prévias como edições enviadas. Flags não são resetadas ao trocar título/UTM.

Estado: preparado localmente no branch codex/newsletter-diversity, base origin/main 3ccfc19. Sem publicação, merge, migration, chamadas IA ou envios. Avisos preexistentes de inputValidator deprecated no build. Release depende de autorização específica; depois de publicar, homologar geração antes de ativar envios.
