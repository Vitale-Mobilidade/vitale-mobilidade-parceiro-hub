# Pessoas e alertas do Radar no Admin — 16/10/2026

Classificação estrutural: consulta privada a cadastros/contatos Supabase e Radar. Base origin/main `296fcb6`. Checkout de referência preservado; implementação na branch `codex/radar-alert-people`.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Card abre operação de alertas com contato/bike/preços | Confundir pessoas com alertas | Uma linha por pessoa/bike; explicar múltiplos alertas | Prosseguir |
| Arquitetura | Endpoint SSR privado read-only paginado; sem Edge/migration | Preço antigo aparecer como atual | Mesma seleção de oferta válida do Radar, preço de cadastro separado | Prosseguir |
| IA | Nenhum agente/modelo afetado | Nenhum | Nenhuma | N/A |
| Segurança | Contatos pessoais disponíveis ao Admin existente | Exposição pública/cache, busca manipulada, papel indevido | JWT validado no servidor + membership ativa admin; no-store; campos explícitos; busca no corpo | Prosseguir condicionado a testes negativos |
| UX/UI | Card/link e menu Radar; lista compacta com valores visíveis e detalhes | Voltar a esconder o essencial ou exigir hover | Nome/contato/preços visíveis, detalhes via teclado, estados vazio/erro/loading | Prosseguir |
| CX | Investigar pessoas e desejo de preço | Ação involuntária de contato/entrega | Apenas leitura; links de contato sem disparo, consentimento distinguido | Prosseguir |
| Growth | Conectar demanda de preço às bikes | Interpretar cadastro como entrega/venda | Condição qualquer queda versus preço alvo explícita | Prosseguir |
| PMO/QA | Novo fluxo restrito | Regressão de auth/rotas e dedupe | Fixtures fictícias, testes direcionados e pnpm validate | Prosseguir localmente |

## Conflitos e decisão consolidada

Exibir contatos é necessário à operação, mas não justifica exportar a base ou ampliar permissões. A API exige admin a cada request, não entrega dados no SSR público e não usa cache compartilhado. Busca de nome/telefone/email/bike vai por POST read-only para evitar PII em URL. Paginação de 25 alertas (uma pessoa pode ter várias bikes); ativos + consentidos por padrão, todos disponíveis para conferência com status/consentimento visíveis. Contato sem consentimento não oferece link de envio. Sem automação, envio, modificação de dados ou inclusão em newsletter.

Preço atual: somente oferta is_current, ended_at nulo, preço positivo e URL afiliada válida; não reutilizar reference_price se oferta faltar. Contato/dados de origem não vão para logs, documentação nem fixtures reais. Falha de preço não vira zero e falha de consulta não vira lista vazia.

Escopo: card clicável em /admin, navegação para /admin/radar, listagem privada com busca/paginação, contato, bike, preço atual, alvo ou qualquer queda, preço no cadastro, status e datas. Dependências: autenticação/membership e tabelas existentes. Aceite: clique leva à lista; admin pode ler campos; demais papéis/sem JWT recebem negação; preço atual nunca usa referência histórica; consulta/erro/sem oferta tratados; validação passa. Rollback: reverter componentes/rota/API; nenhum dado/schema/writer alterado. Fora: captura de novos dados, envio de WhatsApp/email, ativação de alertas, alteração de RLS e publicação automática. Publicação deste novo escopo requer autorização específica após conclusão local.

## Revisão pós-implementação

| Perspectiva | Status | Evidência / limite |
| --- | --- | --- |
| Produto | Pass | Card navegável e item Radar no menu; campos de pessoa/bike/contato/preços visíveis; uma linha por alerta |
| Arquitetura | Pass | Endpoint server-only paginado sobre tabelas existentes; preço de oferta e referência histórica separados; nenhuma migration/Edge |
| IA | N/A | Sem prompts, modelos, geração ou agentes alterados |
| Segurança | Pass | Testes sem token/token inválido/papel content/operation/admin inativo negam leitura; entradas manipuladas rejeitadas; campos limitados e no-store; erro sem contatos/tokens |
| UX/UI | Pass | Prévia interativa desktop e 390px; clique no card navega; nome expande; busca filtra; preços lado a lado no mobile, contato sempre visível |
| CX | Pass | Qualquer queda separado de alvo; fonte indisponível não vira preço antigo/zero; consentimento/status e entrega distinguidos |
| Growth | Pass | Demanda por bike/preço consultável; não confunde alerta/pessoa/entrega; nenhum clique afiliado real |
| PMO/QA | Pass | 26 testes direcionados; lint dos arquivos novos; pnpm validate (64 testes, typecheck, build); GET real do endpoint local sem login retornou 401 com private/no-store e Vary Authorization |

Fixtures e prévia em `artifacts/radar-alert-people/` usam apenas dados fictícios, nunca cópia da base real. Card → listagem, busca e expansão exercitados no browser com API simulada. Contato WhatsApp/e-mail não foi acionado. Preview/mobile screenshots locais não serão versionados. Smoke autenticado com dados reais continua condicionado à publicação autorizada; não declarar funcionamento produtivo antes disso.

Estado: implementação local concluída, pronta para revisão/publicação, sem push/merge/deploy nem consulta/escrita em banco produtivo. Custos externos: nenhum. Risco residual: conferir ambiente do servidor, consultas e permissões existentes em smoke autenticado após publicar; não inclui garantia de envio dos alertas. Rollback: revert da rota/API/componentes e menu/card, sem alteração de dados.

## Publicação autorizada e verificada — 16/10/2026

O responsável autorizou: “pode publicar”. PR #51 integrada: código `0745e07a6c510c87f886e86155b4a9edc436bd81`, merge `373ed4d23d739cf9462c11be0bdae6eae74a69b0`. O projeto Lovable confirmou esse merge antes da publicação. Deployment solicitado `4c89ed74-5f67-449d-b576-dadef5a15163`; retorno inicial pending não foi tratado como conclusão.

Aceite produtivo concluído pelo domínio e sessão Admin: `/admin/radar` respondeu 200 com metadata correta; `/api/admin/radar-alerts` sem login respondeu 401, private/no-store, Vary Authorization e noindex. Card da visão geral com 14 pessoas abriu a lista com 15 alertas; 15 ações de WhatsApp e 15 de e-mail estavam visíveis. Nomes/contatos foram conferidos apenas na sessão privada, sem registro neste documento ou exportação. Clique no nome expandiu preço no cadastro, data de verificação da oferta, datas de cadastro/atualização e consentimento. Busca pela bike pública BW1 retornou um alerta sem erro; lista voltou ao padrão após limpar a busca. Nenhuma ação de contato foi acionada.

Evidência visual local: `artifacts/radar-alert-people/published-overview.png`, da visão geral/card e sem lista de contatos; não versionada. A aba de newsletter preexistente foi preservada. Nenhuma migration, RLS, Edge, dado, mensagem, sync ou geração de IA alterado neste release. Sem uso do agente Lovable ou créditos adicionais. O check Vercel falhou também no baseline `296fcb6`, anterior à mudança; não é o hosting operacional e não foi reconfigurado. O build local/validate e o smoke no Lovable/domínio efetivo passaram.

Matriz final: Produto Pass; Arquitetura Pass; IA N/A; Segurança Pass; UX/UI Pass; CX Pass; Growth Pass; PMO/QA Pass. Estado: **publicado e verificado**. Os preços continuam dependentes da oferta vigente e a tela não comprova entrega de alertas. Rollback continua revert da PR #51 e republicação, sem reverter dados.
