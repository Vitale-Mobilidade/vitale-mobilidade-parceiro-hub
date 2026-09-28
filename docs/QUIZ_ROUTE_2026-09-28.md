# Quiz em `/quiz` e QR Codes antigos na Home

## Classificação e contexto

Mudança **estrutural**: Quiz, SEO e migração de URL. Solicitação do responsável em 28/09/2026: mover o Quiz para `/quiz` e levar `/escolherbike` à Home `/`, pois QR Codes de vídeos antigos apontam para esse endereço. Esta decisão substitui a preservação anterior de `/escolherbike` como página do Quiz; demais migrações não são aprovadas por esta task.

Implementação local no repositório operacional `Vitale-Mobilidade/vitale-mobilidade-parceiro-hub`, branch `codex/quiz-route-home-redirect`, base `66804f70451f27d7ecbaf3fdbca5d85611b14b6c`. O repositório `vitale-codex` é referência técnica e não deve substituir o site real. Aplicam-se os gates de `vitale-codex/docs/SQUAD_GOVERNANCE.md` e `EXECUTION_GUARDRAILS.md`.

## Revisão pré-implementação

| Perspectiva            | Impacto                                                                        | Risco                                                       | Dependências                                                    | Recomendação                                                |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Produto e Estratégia   | Quiz ganha `/quiz`; QR antigo entra no hub                                     | Visitante antigo precisa de mais um clique para o Quiz      | Home com CTA para `/quiz`; decisão explícita do responsável     | Prosseguir conforme destino solicitado                      |
| CTO e Arquitetura      | Nova rota conserva loader SSR e componente; antiga redireciona antes do loader | Loader vinculado à rota antiga ou redirect só no cliente    | Atualizar `useLoaderData`, árvore gerada e verificar HTTP       | Prosseguir com redirect 301 server-side                     |
| IA e Agent Engineering | Exclusões de widget acompanham nova URL                                        | Launcher global duplicado no Quiz                           | Atualizar root e RadarAssistant; preservar resultado/manualOnly | Prosseguir com exclusões atualizadas                        |
| Segurança              | Destino local fixo, sem mudança de backend                                     | Redirect externo ou perda/manipulação de query              | Destino `/` fixo; conservar query literal; não ler secrets      | Prosseguir sem escrita em dados                             |
| UX/UI                  | CTAs, reinício e compartilhamento chegam ao Quiz novo                          | Reinício/compartilhamento levarem à Home                    | Atualizar todos os paths executáveis; preservar reloadDocument  | Prosseguir sem redesign                                     |
| CX e Operação          | QR Codes impressos continuam válidos, com destino Home                         | URLs de campanhas anteriores mudam de jornada               | Manter query/UTM; preservar CRM, Sheets, jobs e scoring         | Prosseguir; informar novo endereço                          |
| Growth e CRO           | Canonical/OG, sitemap e llms apontam para `/quiz`                              | Tráfego de URL antiga termina na Home; 301 cacheado         | Decisão do responsável; CTA na Home; inspeção SSR               | Prosseguir sem prometer ganho SEO                           |
| PMO e QA               | Delta isolado de frontend                                                      | Declarar publicado antes do deploy ou testar serviços reais | Testes dirigidos, `pnpm validate`, smoke local sem backend      | Prosseguir localmente; publicação exige autorização própria |

## Conflitos e trade-offs

- A política anterior preservava `/escolherbike` para conversão e atribuição. O responsável agora escolheu explicitamente Home como destino dos QR Codes. Essa orientação prevalece; a mudança de jornada é intencional.
- Um 301 é permanente e pode ser cacheado. Adotado por ser uma migração definitiva; rollback de código não elimina caches já existentes.
- Query/UTM será preservada no redirect, sem alterar identificadores históricos de analytics (`form_name` e `button_location`) nem contratos de CRM. Não reimplementar atribuição ou backend.

## Decisão consolidada antes da implementação

- **Escopo:** Quiz existente em `/quiz`; `/escolherbike` → `301 /` preservando query; links internos, reinício, compartilhamento, exclusões de widget, metadata, sitemap/llms e documentação atualizados.
- **Dependências:** versão atual do projeto real; árvore de rotas regenerada; módulos operacionais preservados. Nenhum Lovable pago, migration, sync ou lead real necessário.
- **Critérios de aceite:** `/quiz` retorna 200 com intro SSR e canonical/OG corretos; URL antiga retorna 301 para `/`, inclusive com query e barra final; Home e entradas do Quiz apontam para `/quiz`; URL antiga ausente do sitemap; scoring e atribuição passam nos testes offline.
- **Fora de escopo:** redesign, conteúdo, scoring, CRM, dados/RLS, afiliados, demais redirects, deploy/merge e configurações externas de campanhas.
- **Rollback:** reverter o commit desta branch no frontend, restaurando rota, metadata e links anteriores. Base identificada acima; sem rollback de banco. Caches de 301 podem persistir após reversão.

## Revisão pós-implementação

| Perspectiva            | Status | Evidência ou justificativa                                                                                                   |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Produto e Estratégia   | Pass   | Destinos implementados conforme decisão; Home SSR tem sete links `/quiz` e nenhum link antigo                                |
| CTO e Arquitetura      | Pass   | `/quiz` 200 com intro SSR e loader existente; antiga 301 antes do SSR; árvore regenerada e typecheck aprovado                |
| IA e Agent Engineering | Pass   | Exclusões do root e RadarAssistant atualizadas para `/quiz`; resultado/manualOnly e chamadas IA intactos                     |
| Segurança              | Pass   | Destino relativo fixo; query literal preservada; testes sem rede; nenhum dado, secret, RLS ou `.env` alterado                |
| UX/UI                  | Pass   | Header desktop/mobile, footer, Home, ferramentas, reinício e compartilhamento apontam para `/quiz`; conteúdo do Quiz intacto |
| CX e Operação          | Pass   | `/escolherbike` e `/escolherbike/` levam à Home; contratos de CRM, scoring, Sheets, jobs e eventos preservados               |
| Growth e CRO           | Pass   | Canonical e OG `/quiz` confirmados no HTML; sitemap e llms atualizados; query/UTM literal no redirect                        |
| PMO e QA               | Pass   | 63 testes direcionados; `pnpm validate` (49 testes do gate, typecheck e build); lint direcionado e diff-check aprovados      |

### Evidências HTTP locais

Backend real desativado por variáveis de teste apontando para loopback; nenhum formulário, lead, compra, IA ou mensagem real acionado.

| Requisição                                                          | Status | Resultado                                                                 |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `/escolherbike`                                                     | 301    | `Location: /`                                                             |
| `/escolherbike/`                                                    | 301    | `Location: /`                                                             |
| `/escolherbike?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2` | 301    | `Location: /?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2`         |
| `/escolherbike/?utm_source=yt`                                      | 301    | `Location: /?utm_source=yt`                                               |
| `/quiz`                                                             | 200    | Intro no HTML; canonical e `og:url` = `https://vitalemobilidade.com/quiz` |
| `/`                                                                 | 200    | Sete `href="/quiz"`, nenhum `href="/escolherbike"`                        |

### Fechamento

- **Validações:** sete arquivos/63 testes de rotas, scoring/Radar, redirects, sitemap, atribuição, funil e analytics; gate `pnpm validate`; lint dos sete arquivos de rota/redirect/sitemap e testes; `git diff --check`; seis requests HTTP locais. Ajustes de formatação do lint aplicados; gate repetido após esses ajustes.
- **Documentação:** este registro, ROADMAP, TAXONOMY, PAGE_INTENT_AND_SYNERGY e llms; direção normativa também atualizada no repositório de referência `vitale-codex`.
- **Trade-offs/riscos:** destino Home é intencional; 301 pode permanecer em caches após rollback. Não houve teste com produção nem mudança de integrações preservadas. Avisos de depreciação de dependências no build não impedem o gate e não foram ampliados nesta task.
- **Estado:** implementação local concluída e validada. Envio da branch recusado com HTTP 403; conta GitHub `gpalmerio` tem `pull: true` e `push: false`, confirmado também pelo conector. Nenhuma PR criada. Patch preparado para aplicação por conta com escrita. Nenhum merge, deploy ou Publish executado.
- **Decisão:** GO para revisão da mudança; publicação depende de autorização explícita no escopo e ambiente atuais. Smoke do domínio após publicação deve confirmar os mesmos destinos e metadata.

## Publicação confirmada — 28/09/2026

O responsável autorizou implementar e publicar nesta conversa. Aplicação no mesmo projeto Lovable: commit `f7153262d169276571011675c0eca16e04b796e0`, base já publicada `5c0ec7949575dbd1a7e806ad2dff4984fda00586`. Comparação independente: nenhum desvio frente ao patch validado, 30 arquivos do escopo, nenhum arquivo extra. Lovable confirmou `pnpm validate` (typecheck, 49 testes, build), 57 testes direcionados e smoke HTTP local (Quiz 200; antiga 301 para Home, query preservada). Custo da única rodada: 1,8 crédito.

Deployment `57ab79b2-2171-4879-9544-dade5ed02da0` iniciado pela API; interface confirmou “Seu site foi atualizado”. No Chrome sobre `https://vitalemobilidade.com`: `/quiz` exibe intro e botão Começar agora, canonical e OG `/quiz`; `/escolherbike` termina em `/`; entrada antiga com UTMs, `%2B` e parâmetros repetidos mantém query literal na Home; CTA da Home abre `/quiz`. Nenhum formulário, lead, compra, conversa ou serviço real acionado no smoke. O terminal externo recebeu 403 de acesso, por isso a evidência de domínio é a navegação no navegador; status 301 foi confirmado localmente e no servidor do Lovable.

Estado final: concluído e publicado, oito perspectivas Pass conforme revisão registrada, agora com evidência de aplicação e release. Rollback de frontend: reverter somente o delta `f715326` para a base `5c0ec79` e republicar; caches de 301 podem persistir. Sem alteração de banco, scoring, CRM, RLS, Sheets, jobs, afiliados ou Edge Functions. Este adendo substitui o estado anterior “não publicado”.

## Correção de atribuição Home → Quiz (2026-09-28)

Classificação estrutural: Quiz/aquisição/legado. Diagnóstico: o 301 preserva query, mas o CTA Home → /quiz remove parâmetros antes da única captura, que ficava no Quiz. Consulta agregada somente leitura confirmou entradas com e sem fonte; não prova causa de todos os casos. A validação anterior não cobriu essa passagem.

### Revisão prévia das oito perspectivas

| Perspectiva | Impacto                                    | Risco                                              | Dependência                     | Recomendação                  |
| ----------- | ------------------------------------------ | -------------------------------------------------- | ------------------------------- | ----------------------------- |
| Produto     | Manter QR na Home e atribuição no Quiz     | Alterar jornada desejada                           | Redirect vigente                | Prosseguir sem mudar destinos |
| CTO         | Captura na raiz pública                    | SSR/hidratação/navegação cliente                   | beforeLoad + efeito da URL      | Prosseguir com guards SSR     |
| IA          | Preservar fonte usada no interesse de bike | Inventar contexto de campanha                      | Payload existente               | Prosseguir sem alterar IA     |
| Segurança   | Mesmo storage por sessão                   | Storage bloqueado interromper site/admin capturado | Leitura segura e exclusão admin | Prosseguir com proteções      |
| UX          | Sem etapa visual adicional                 | Atrasar clique                                     | Captura local sem rede          | Prosseguir                    |
| CX          | Fonte nos novos leads                      | Prometer recuperar histórico                       | Contrato lead/CRM               | Prosseguir sem alterar dados  |
| Growth      | Cinco UTMs e URL de entrada preservados    | Misturar campanhas/herdar outra sessão             | Resolver existente              | Prosseguir com testes         |
| PMO/QA      | Corrigir lacuna da validação               | Testar somente redirect                            | Percurso até payload/gate       | Prosseguir após validação     |

Decisão: captura na entrada pública com beforeLoad e efeito na hidratação/mudança de URL, utilizando o mesmo sessionStorage. Preservar SSR, /escolherbike → / e /quiz. Proteger leitura de storage; excluir admin. Testar redirect real e beforeLoad da raiz real até payload final, campanha nova, sessão nova e storage bloqueado. Sem migration, RLS, CRM real, IA, escrita de leads ou reprocessamento. Trade-off: pequena captura local em páginas públicas necessária para não perder campanha na navegação. Storage indisponível só permite UTMs da URL atual; não prometer persistência entre documentos nesse caso. Origem sem utm_source permanece null, sem padrões inventados.

### Revisão posterior

| Perspectiva | Status | Evidência                                                                                                                                             |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Pass   | Destinos desejados mantidos                                                                                                                           |
| CTO         | Pass   | Guard SSR; typecheck/build client e server passaram                                                                                                   |
| IA          | Pass   | Contrato real do payload mantido, sem mudança de prompts/modelos                                                                                      |
| Segurança   | Pass   | Testes admin/SSR/storage bloqueado; sem novo envio ou acesso                                                                                          |
| UX          | Pass   | Sem mudança visual ou etapa; sem espera de rede                                                                                                       |
| CX          | Pass   | Sem escrita de dados, contrato de CRM preservado                                                                                                      |
| Growth      | Pass   | Cinco UTMs e traffic_origin preservados no payload após Home/Radar/Quiz; source_url completo; campanha nova substitui conjunto; sessão nova não herda |
| PMO/QA      | Pass   | 44 testes dirigidos; pnpm validate: 51 testes + typecheck + build; lint dos quatro arquivos                                                           |

Release: src/routes/__root.tsx, src/lib/quiz-attribution.ts e os dois testes correspondentes. Risco baixo; limite: não criado lead produtivo para validação, nem acionado CRM/IA. Não recuperar automaticamente origem perdida de leads antigos. Rollback: reverter somente esta correção para base 815cd19 e republicar, mantendo as rotas novas. Autorização de implementar/publicar a migração já dada nesta thread cobre a correção do fluxo. Edição direta no Code Editor, sem créditos de agente Lovable. Evidência local completa: docs/QUIZ_UTM_FIX_2026-09-28.md no worktree de correção.
