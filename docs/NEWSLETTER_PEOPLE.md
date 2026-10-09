# Pessoas e entregas da newsletter

Classificação estrutural: Supabase e dados pessoais. Preparação local.

## Revisão prévia
| Perspectiva | Impacto | Risco | Dependência | Recomendação |
|---|---|---|---|---|
| Produto | Total geral e KPIs abrem pessoas | Confundir cadastro com entrega | Consentimento e ledger | Prosseguir com estados separados |
| CTO | RPC privada paginada e emails no evento | Histórico não tem associação | Migration aditiva | Prosseguir sem inventar backfill |
| IA | Sem alteração editorial | Nenhum fluxo IA afetado | Nenhuma | N/A: somente operação |
| Segurança | Admin consulta nome/email | Exposição de PII | Gate admin e grants service_role | Prosseguir, no-store e sem export |
| UX | Lista filtrada e paginação | Confusão entre envio/entrega | Labels e botão acessível | Prosseguir com estado desconhecido |
| CX | Conferir inscritos e destinatários | Históricos incompletos | Eventos identificados futuros | Prosseguir informando limitação |
| Growth | Visibilidade de consentimento | Reativar descadastro | Consulta somente leitura | Prosseguir sem mudar audiência |
| PMO | Contrato e testes SQL/UI | Divergência de totais | Validate e teste direcionado | Prosseguir com gate local |

Decisão consolidada: total de todos os cadastros; filtros geral/elegíveis/legado/descadastrados; por campanha destinatários/entregues/falhas/sem confirmação individual. Lista de 25 por página, nome, email, data e status. Preservar regras existentes dos KPIs; filtros podem sobrepor (legado e descadastro). Sem envio, ativação, exportação ou acesso público. Eventos antigos não permitem atribuir entrega individual; registrar emails somente nos novos eventos. Rollback: reverter aplicação, manter coluna privada e dados; não apagar histórico. Trade-off: confirmação explícita somente onde existe evidência; contagem histórica agregada pode superar pessoas identificadas, e UI deve explicar isso. Release requer migration e publicação autorizadas.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Total geral e listas por KPI; campanha tem filtros individuais. |
| CTO | Pass | RPC de 25 linhas, parâmetros validados, migration aditiva ensaiada em PGlite. Histórico sem email permanece desconhecido. |
| IA | N/A | Redator, prompts e geração não alterados. |
| Segurança | Pass | JWT e membership admin antes de RPC; no-store; teste de grants anon/authenticated; sem export de PII. |
| UX | Pass | Botões nativos, nome/email/data/status, estados de carregamento/erro/vazio, paginação responsiva; teste de render. QA visual em produção pendente da publicação. |
| CX | Pass | Consulta somente leitura; texto explica que ausência de confirmação não comprova ausência de entrega. |
| Growth | Pass | Nenhuma mudança no consentimento, segmentação ou envio. |
| PMO | Pass | 20 testes direcionados, ensaio SQL sintético, lint alvo, diff-check e pnpm validate (59 regressões/types/build) passam. |

Estado: pronto localmente no branch codex/newsletter-people, baseado em 7205821 (projeto ativo). Produção não alterada. Nenhum custo externo ou email enviado. Antes de release, reconciliar HEAD sincronizado do GitHub, aplicar somente migration 20261009010000 e publicar com aprovação atual. Rollback: reverter código do painel/endpoint e função de registro ao anterior mantendo coluna privada e histórico; nenhuma remoção de dados. Falhas/reclamações têm precedência sobre entrega no filtro individual. KPIs históricos contam eventos agregados; lista entregue conta pessoas identificadas, não fabricar equivalência histórica. Testes SQL executáveis em tests/newsletter-people-check.mjs com PGLITE_MODULE apontando para instalação local; fixture usa somente dados sintéticos. pnpm validate tem avisos preexistentes de inputValidator deprecated; build concluído.
