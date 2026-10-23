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

## Release concluído

Patch de três arquivos aplicado sem divergências; commit de código `c3b210b`, commit sincronizado `02b98ad`. `git diff HEAD origin/main` vazio confirmou árvore remota idêntica à testada. Runtime repetiu os10 testes direcionados e `pnpm validate`, todos aprovados. Execução Lovable reportou2,2 créditos, separadamente de zero chamadas ao gateway editorial/imagem.

Deploy `f6f51db5-20e4-4b92-841a-16fe5a8e6662` confirmado na UI em23/10 às00h16 São Paulo com “Your website was updated”. Snapshot posterior à aplicação/deploy solicitado é idêntico ao anterior: revision4, updated_at02:56:56.79566Z e hash1125f1e736db45d7d4cf4f584b8140e5; enabled=true,last_error=null,cron ativo; nenhuma campanha de23/10 criada. Nenhum draft, setting, cron, imagem publicada ou envio foi modificado neste delta. Endpoint histórico preservado byte a byte.

As oito perspectivas mantêm Pass para o release; a condição de preservação da edição de hoje foi comprovada por comparação integral dos snapshots sanitizados. Evidência de publicação em artifacts/newsletter-future-article-covers-published.png no workspace de referência. Estado: concluído e publicado para próximas composições. A edição de23/10 e o agendamento06h30 permanecem como aprovados.

## Ajuste de direção: criar capa antes de recorrer à thumbnail

O responsável corrigiu a ordem após o release: “se não estiver disponivel, ai sim a newsletter crie a capa em vez de usar a do thumbnail -que é so em ultimo caso”. Esta decisão substitui a alternativa direta descrita acima. Novo escopo: capa publicada válida → capa própria pelo compositor existente usando o fundo armazenado do artigo → thumbnail do vídeo-fonte somente se as duas primeiras opções forem inviáveis. Não muda o endpoint/compositor nem URLs já salvas; edição de hoje permanece intacta. Não se introduz serviço de geração por IA ou outro writer.

Pré-revisão do delta (mesmas oito perspectivas): Produto prosseguir (respeitar a hierarquia solicitada); CTO prosseguir (chamar compositor apenas sem capa pronta, endpoint histórico intacto); IA prosseguir (composição gráfica existente sem chamada paga de imagem); Segurança prosseguir (mesma allowlist e arquivo pertencente ao artigo); UX prosseguir (capa própria tem prioridade sobre thumbnail); CX prosseguir (conferir mesmo hash e agendamento, sem regenerar hoje); Growth prosseguir (links e ofertas preservados); PMO/QA prosseguir com testes das três opções e validate. Risco: compositor pode não ter fundo utilizável; mitigação: thumbnail real só após falha retornada. Rollback: reverter este delta de ordem, sem tocar em dados. Autorização de publicação mantida para executar essa correção de direção.

Revisão posterior local do delta: Produto Pass (hierarquia correta); CTO Pass (compositor só acionado após capa ausente/inválida); IA Pass (composição existente, sem modelo novo); Segurança Pass (allowlist preservada); UX Pass (thumbnail fica no terceiro nível); CX Pass (nenhuma mutação ou regeneração da edição de hoje); Growth Pass (links/ofertas inalterados); PMO/QA Pass (12 testes direcionados, lint e pnpm validate com tipos/64 regressões/build). Testes cobrem capa válida sem composição, capa ausente/inválida com composição bem-sucedida, e thumbnail somente após retorno404/503 do compositor. Aplicação/publicação do delta pendentes.
