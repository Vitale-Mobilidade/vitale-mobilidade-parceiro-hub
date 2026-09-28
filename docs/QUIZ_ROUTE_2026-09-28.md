# Quiz em `/quiz` e QR Codes antigos na Home

## Classificação e contexto

Mudança **estrutural**: Quiz, SEO e migração de URL. Solicitação do responsável em 28/09/2026: mover o Quiz para `/quiz` e levar `/escolherbike` à Home `/`, pois QR Codes de vídeos antigos apontam para esse endereço. Esta decisão substitui a preservação anterior de `/escolherbike` como página do Quiz; demais migrações não são aprovadas por esta task.

Implementação local no repositório operacional `Vitale-Mobilidade/vitale-mobilidade-parceiro-hub`, branch `codex/quiz-route-home-redirect`, base `66804f70451f27d7ecbaf3fdbca5d85611b14b6c`. O repositório `vitale-codex` é referência técnica e não deve substituir o site real. Aplicam-se os gates de `vitale-codex/docs/SQUAD_GOVERNANCE.md` e `EXECUTION_GUARDRAILS.md`.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Quiz ganha `/quiz`; QR antigo entra no hub | Visitante antigo precisa de mais um clique para o Quiz | Home com CTA para `/quiz`; decisão explícita do responsável | Prosseguir conforme destino solicitado |
| CTO e Arquitetura | Nova rota conserva loader SSR e componente; antiga redireciona antes do loader | Loader vinculado à rota antiga ou redirect só no cliente | Atualizar `useLoaderData`, árvore gerada e verificar HTTP | Prosseguir com redirect 301 server-side |
| IA e Agent Engineering | Exclusões de widget acompanham nova URL | Launcher global duplicado no Quiz | Atualizar root e RadarAssistant; preservar resultado/manualOnly | Prosseguir com exclusões atualizadas |
| Segurança | Destino local fixo, sem mudança de backend | Redirect externo ou perda/manipulação de query | Destino `/` fixo; conservar query literal; não ler secrets | Prosseguir sem escrita em dados |
| UX/UI | CTAs, reinício e compartilhamento chegam ao Quiz novo | Reinício/compartilhamento levarem à Home | Atualizar todos os paths executáveis; preservar reloadDocument | Prosseguir sem redesign |
| CX e Operação | QR Codes impressos continuam válidos, com destino Home | URLs de campanhas anteriores mudam de jornada | Manter query/UTM; preservar CRM, Sheets, jobs e scoring | Prosseguir; informar novo endereço |
| Growth e CRO | Canonical/OG, sitemap e llms apontam para `/quiz` | Tráfego de URL antiga termina na Home; 301 cacheado | Decisão do responsável; CTA na Home; inspeção SSR | Prosseguir sem prometer ganho SEO |
| PMO e QA | Delta isolado de frontend | Declarar publicado antes do deploy ou testar serviços reais | Testes dirigidos, `pnpm validate`, smoke local sem backend | Prosseguir localmente; publicação exige autorização própria |

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

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Destinos implementados conforme decisão; Home SSR tem sete links `/quiz` e nenhum link antigo |
| CTO e Arquitetura | Pass | `/quiz` 200 com intro SSR e loader existente; antiga 301 antes do SSR; árvore regenerada e typecheck aprovado |
| IA e Agent Engineering | Pass | Exclusões do root e RadarAssistant atualizadas para `/quiz`; resultado/manualOnly e chamadas IA intactos |
| Segurança | Pass | Destino relativo fixo; query literal preservada; testes sem rede; nenhum dado, secret, RLS ou `.env` alterado |
| UX/UI | Pass | Header desktop/mobile, footer, Home, ferramentas, reinício e compartilhamento apontam para `/quiz`; conteúdo do Quiz intacto |
| CX e Operação | Pass | `/escolherbike` e `/escolherbike/` levam à Home; contratos de CRM, scoring, Sheets, jobs e eventos preservados |
| Growth e CRO | Pass | Canonical e OG `/quiz` confirmados no HTML; sitemap e llms atualizados; query/UTM literal no redirect |
| PMO e QA | Pass | 63 testes direcionados; `pnpm validate` (49 testes do gate, typecheck e build); lint direcionado e diff-check aprovados |

### Evidências HTTP locais

Backend real desativado por variáveis de teste apontando para loopback; nenhum formulário, lead, compra, IA ou mensagem real acionado.

| Requisição | Status | Resultado |
| --- | --- | --- |
| `/escolherbike` | 301 | `Location: /` |
| `/escolherbike/` | 301 | `Location: /` |
| `/escolherbike?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2` | 301 | `Location: /?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2` |
| `/escolherbike/?utm_source=yt` | 301 | `Location: /?utm_source=yt` |
| `/quiz` | 200 | Intro no HTML; canonical e `og:url` = `https://vitalemobilidade.com/quiz` |
| `/` | 200 | Sete `href="/quiz"`, nenhum `href="/escolherbike"` |

### Fechamento

- **Validações:** sete arquivos/63 testes de rotas, scoring/Radar, redirects, sitemap, atribuição, funil e analytics; gate `pnpm validate`; lint dos sete arquivos de rota/redirect/sitemap e testes; `git diff --check`; seis requests HTTP locais. Ajustes de formatação do lint aplicados; gate repetido após esses ajustes.
- **Documentação:** este registro, ROADMAP, TAXONOMY, PAGE_INTENT_AND_SYNERGY e llms; direção normativa também atualizada no repositório de referência `vitale-codex`.
- **Trade-offs/riscos:** destino Home é intencional; 301 pode permanecer em caches após rollback. Não houve teste com produção nem mudança de integrações preservadas. Avisos de depreciação de dependências no build não impedem o gate e não foram ampliados nesta task.
- **Estado:** implementação local concluída e validada. Envio da branch recusado com HTTP 403; conta GitHub `gpalmerio` tem `pull: true` e `push: false`, confirmado também pelo conector. Nenhuma PR criada. Patch preparado para aplicação por conta com escrita. Nenhum merge, deploy ou Publish executado.
- **Decisão:** GO para revisão da mudança; publicação depende de autorização explícita no escopo e ambiente atuais. Smoke do domínio após publicação deve confirmar os mesmos destinos e metadata.
