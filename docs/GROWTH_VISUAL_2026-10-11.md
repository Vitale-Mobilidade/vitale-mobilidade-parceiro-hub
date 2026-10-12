# Growth visual — preparação local

Classificação: estrutural (consultas Supabase e métricas de Quiz/afiliados). Base: origin/main ab80236; checkout de referência preservado. Objetivo: transformar o painel em leitura de tráfego, origem de cliques e gargalos, com calendário São Paulo.

## Revisão prévia

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Tráfego e intenção separados | Confundir clique com venda | Definições visíveis | Prosseguir sem receita estimada |
| Arquitetura | Consultas com início e fim | Ontem incluir hoje | RPCs aditivas e intervalo semiaberto | Prosseguir com validação no servidor |
| IA | Sem alteração de geração/agentes | Nenhum fluxo afetado | Nenhuma | N/A |
| Segurança | Apenas agregados administrativos | PII/permissão de RPC | service_role e gate Admin | Prosseguir sem expor linhas brutas |
| UX/UI | Funil proporcional e rankings compactos | Gráfico sem valores, mobile | Texto acessível, datas rotuladas | Prosseguir |
| CX | Origens disponíveis diretamente | Fonte vazia parecer zero | Estados indisponível/vazio | Prosseguir |
| Growth | Origem por página e cliques/view | Taxa parecer conversão por usuário | Contagens de eventos e denominadores | Prosseguir com ressalvas explícitas |
| PMO/QA | Migration, Edge e UI coordenadas | UI antes da RPC | Testes direcionados e validate | Prosseguir localmente; release condicionado |

## Conflitos e decisão consolidada

Ranking visual favorece leitura; detalhe completo continua em expansão. Cliques/views pode ultrapassar 100% porque conta eventos repetidos; apresentar como cliques a cada 100 visualizações, nunca conversão de pessoas. O funil é coorte pela primeira entrada e seu progresso observado até a consulta: etapas não têm timestamps históricos completos, portanto não prometer fotografia histórica do progresso ao fim do período. Recomendações/cliques são recortados pelo timestamp do evento. Origens não serão derivadas só das páginas top 20 nem inventadas para cliques sem coleta.

Escopo: hoje, ontem, 7/30/90 dias e personalizado até 366 dias; funil visual; ranking de páginas por oferta/detalhe; recomendações em barras; tráfego com definição clara da antiga participação. Fora: tracking de todo link arbitrário, vendas, mudanças em links públicos/coleta/SSR. Rollback: reverter UI/Edge; RPCs anteriores continuam intactas. Sem escrita em dados produtivos, deploy, créditos Lovable ou publicação nesta etapa.

Aceite: fim exclusivo em São Paulo e entrada validada; páginas geradoras de oferta visíveis sem abrir bike; valores acessíveis; nenhum dado pessoal; fonte ausente não tratada como zero; testes direcionados e pnpm validate.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Métricas respondem tráfego, intenção e perdas; não estimam vendas |
| Arquitetura | Pass | RPCs aditivas, limites semiabertos; typecheck e build SSR passaram |
| IA | N/A | Nenhum fluxo de IA, prompt ou geração alterado |
| Segurança | Pass | Gate Admin preservado; PostgreSQL local verificou negação de EXECUTE a anon/authenticated; agregados sem PII |
| UX/UI | Pass | Prévia desktop e 390px sem tabela horizontal; labels e valores textuais acompanham barras; detalhes expansíveis |
| CX | Pass | Ranking direto por página, estados ausente/indisponível/vazio e distinção entre perda e abandono confirmado |
| Growth | Pass | Origem agregada independente do top 20 de tráfego; eventos/views explicitados; limites históricos do funil documentados |
| PMO/QA | Pass | 35 testes direcionados; lint do novo escopo; pnpm validate (61 testes de regressão, typecheck, build); SQL executado em PostgreSQL efêmero |

Validação SQL reproduzível em banco **descartável**, sem conexão com produção: aplicar `tests/fixtures/growth/schema.sql`, migration original `20261008160000_admin_analytics_v2.sql`, migration nova `20261011210000_admin_growth_range.sql`, depois `tests/fixtures/growth/range-assertions.sql`, usando `psql -v ON_ERROR_STOP=1`. Fixtures não representam o schema inteiro produtivo. Verificações: recorte de pageviews/cliques/recomendações/coortes, origem por página e permissões.

Prévia em `artifacts/growth-visual/index.html` e screenshot `preview.jpg`: dados fictícios; HTML estático, sem conexão com produção e sem simular interações React. Conferência visual não substitui smoke autenticado no ambiente de release.

Estado: implementação local concluída na branch `codex/growth-visual`, sem commit/push/merge/deploy. Risco residual: necessidade de rollout coordenado e smoke autenticado após implantação; funil histórico mostra progresso observado da coorte, não snapshot no término do período. Não há Fail aberto na preparação local. Liberação produtiva exige autorização, implantação da migration aditiva antes da Edge e da UI, e smoke dos filtros/origens sem cliques afiliados reais. Rollback: retornar Edge/UI à versão anterior; deixar RPCs aditivas sem uso (nenhuma tabela/dado alterado pela nova migration). Custo externo desta preparação: nenhum.

## Ajuste de densidade solicitado — revisão prévia

Classificação relevante: somente apresentação local, sem alteração adicional de consultas/contratos. Produto: prosseguir, priorizar leitura rápida. Arquitetura: prosseguir, manter dados e queries. IA: N/A, nenhum fluxo afetado. Segurança: prosseguir, preservar gate e agregados. UX/UI: prosseguir com condições, diminuir espaços sem encolher alvos de toque e manter labels/valores acessíveis. CX: prosseguir, detalhes disponíveis por expansão. Growth: prosseguir, manter denominadores e diferenças entre eventos/abandono. PMO/QA: prosseguir com testes de renderização e validate.

Conflito: densidade versus compreensão. Decisão: cards menores, funil e origem lado a lado em desktop, etapas em linhas com barras finas e resumo de perdas, explicações expansíveis, cinco itens iniciais por ranking. Mobile conserva duas colunas de KPIs e uma coluna de seções. Critérios: redução observável de altura com a mesma fixture e preservação de leitura a 390px. Rollback: retornar apenas o componente à apresentação anterior. Release permanece pendente, sem nova ação externa.

### Revisão posterior da compactação

Produto Pass: indicadores e origem mantidos. Arquitetura Pass: queries/contratos preservados; validate passou. IA N/A: nenhum fluxo afetado. Segurança Pass: nenhuma alteração de autorização. UX/UI Pass: KPIs compactos em duas colunas no mobile, etapas em linhas de 16px de barra, desktop com funil/origens lado a lado; conferidos 1280px e 390px. CX Pass: explicações por expansão e rankings limitados a cinco itens com acesso aos demais. Growth Pass: percentuais/perdas completos disponíveis por expansão, sem alterar cálculos. PMO/QA Pass: três testes de renderização, lint direcionado e pnpm validate (61 testes, typecheck, build). Screenshot compact-preview.jpg com dados fictícios. Alteração somente local; publicação continua pendente.

## Release autorizado — 11/10/2026

O responsável autorizou explicitamente: “implemente e publique”. Base reconciliada com main `7c0f51ee789cf51f6b4d1075da2738af003447e9`; mudanças recentes de newsletter preservadas. Revalidação após reconciliação: 35 testes direcionados e pnpm validate (61 testes, typecheck, build) passaram. Definições das três RPCs antigas conferidas no banco integrado e preservadas em `artifacts/growth-visual/rpc-baseline.local.json` (ignorado). Índices existentes de Quiz confirmados. Migration aditiva com limites de lock/execução; versão espelhada no ledger Cloud `0008_admin_growth_range`.

Ordem autorizada: aplicar novas consultas, verificar limites/permissões em produção, integrar código via PR, implantar apenas editorial-admin, publicar interface no mesmo projeto/domínio e conferir Growth. Reverter web/Edge à base acima deixa as consultas novas privadas sem uso; não remover dados/tabelas. Uso Lovable limitado a operações exclusivas de implantação no projeto integrado; sem IA editorial nem geração/capa nem envio a usuários.
