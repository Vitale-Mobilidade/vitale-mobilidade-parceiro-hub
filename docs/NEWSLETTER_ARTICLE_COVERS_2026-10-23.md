# Próximas newsletters: reutilizar a capa publicada

Autorização nesta conversa: “prioriza a capa pronta do artigo nas próximas newsletters, sem gerar outra imagem. Mantém a de hoje como está”. Implementar e publicar somente a escolha de imagem para novas composições. Não regenerar nem editar o draft #6 de23/10; preservar agendamento e imagens já gravadas.

Classificação: estrutural pelo fluxo editorial/IA integrado. Escopo mínimo: selecionar `ogImageUrl` publicado e permitido; na ausência de capa válida, usar thumbnail existente do vídeo-fonte. Não chamar o compositor da newsletter na preparação de novas edições. Manter o endpoint antigo para imagens já referenciadas por drafts/campanhas.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Capa com identidade e texto já publicados; não inventar nova chamada; prosseguir com reutilização. |
| CTO | Remover composição derivada na preparação; risco de quebrar imagens antigas mitigado mantendo endpoint antigo; prosseguir. |
| IA | Nenhuma geração adicional de imagem ou chamada ao modelo; writer textual preservado; prosseguir. |
| Segurança | URLs continuam na allowlist existente; nenhuma escrita produtiva ou credencial nova; prosseguir. |
| UX/UI | Capa mantém texto e foto do artigo; fallback só thumbnail real, gate de ausência continua; prosseguir. |
| CX | Edição de hoje deve permanecer idêntica e agendada; comparar hash/revisão/config antes/depois; prosseguir sem regenerar. |
| Growth/CRO | Links e gates de oferta intactos; imagem consistente com destino; prosseguir. |
| PMO/QA | Regressão da composição com capa válida/ausente/inválida e compositor proibido, validate obrigatório; prosseguir. |

Decisão consolidada: alterar apenas preparação de imagens das próximas composições, teste e documentação. Não modificar renderer, endpoint histórico, banco, cron, writer ou capas dos artigos. Trade-off: quando não existir capa publicada válida, usar thumbnail já existente em vez de criar derivada; não gastar créditos de imagem. Rollback: reverter apenas a escolha de imagem, preservando os drafts gravados. Publicação autorizada pelo pedido de seguir a regra; nenhum disparo de email ou regeneração está autorizado neste delta.

Código/testes/release: pendentes nesta revisão prévia. O checkout local é referência; aplicar no projeto Lovable ativo após testes e comparar diff exato. Credenciais Git já negaram gravação403 nesta conversa; integração Lovable é o caminho necessário para sincronizar o diff validado, com custo pequeno previsto de execução, sem gateway de imagem.

## Revisão posterior local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Capa pronta passa a ser primeira escolha em novas composições. |
| CTO | Pass | Removida chamada ao compositor; endpoint histórico e conteúdo persistido intactos. |
| IA | Pass | Sem geração de imagem nem alteração do redator textual. |
| Segurança | Pass | Allowlist existente mantida e capa em host não permitido descartada. |
| UX/UI | Pass | Capa pronta preserva texto existente; thumbnail real disponível como alternativa. |
| CX | Pass | Snapshot pré-release da edição23/10: revision4, hash1125f1e736db45d7d4cf4f584b8140e5; enabled=true, cron ativo; nenhuma escrita nesse draft. |
| Growth/CRO | Pass | Links, recomendações e validação de ofertas preservados. |
| PMO/QA | Pass | 10 testes direcionados incluindo geração da edição7 sem compositor, endpoint histórico, capa ausente/inválida; lint e pnpm validate (tipos,64 regressões,build) passaram. |

Publicação do delta pendente; risco baixo e rollback restrito à seleção de imagem. Nenhum email ou nova imagem gerada na validação.
