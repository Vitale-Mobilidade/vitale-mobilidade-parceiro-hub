# Admin e sincronização geral — 06/10/2026

> **Estado vigente após autorização de publicação automática:** oito pendentes publicados pelo cron, 115 publicados + 1 piloto antigo em draft; artigo+capa+QA→publicação automática, jobs ativos e fila zerada. Conferência completa em [YOUTUBE_AUTOMATIC_PUBLICATION_2026-10-06.md](./YOUTUBE_AUTOMATIC_PUBLICATION_2026-10-06.md). Referências abaixo a entrega draft, cron pausado ou publicação fora de escopo documentam marcos anteriores, não o contrato atual.

Classificação estrutural: login operacional, Sheets e orquestração editorial. Pedido: botão no Admin que atualize tudo e painel completo de bikes dentro do Admin.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Unificar a operação; atualizar catálogo e vídeos, processar apenas novos; prosseguir sem geração histórica. |
| CTO | Reusar bike-panel e writer existente, sem segundo sincronizador; risco de concorrência mitigado pelos locks/reserva; prosseguir. |
| IA | Geração só após detectar novidade, transcrição oficial e prompt independente existentes; sem regeneração de artigos; prosseguir condicionado ao gate já existente. |
| Segurança | JWT verificado no servidor e membership ativa admin/operation; content não ganha escrita comercial; legacy auth preservada; prosseguir. |
| UX | Cabeçalho global com andamento e resultado por etapa; painel incorporado sem segundo login; prosseguir. |
| CX | Histórico, filtros, status, exceções e agenda bikes preservados; falha parcial explícita e dados recarregados; prosseguir. |
| Growth | Nenhuma rota pública/Radar/afiliado/SEO alterada; admin noindex; prosseguir. |
| QA | Testar permissões, falha parcial, histórico excluído e geração única; pnpm validate obrigatório; prosseguir localmente. |

Decisão: implementar login Admin no writer de bikes existente, painel completo incorporado, botão global autenticado e atualização da planilha sem cache seguida de no máximo um vídeo novo por execução (rotina de um vídeo diário). Acervo inicial é baseline histórico; criação pendente antiga continua seleção explícita. Sync não publica artigos. Conflito custo/“tudo”: sincronização atualiza todos os metadados; IA processa uma novidade por execução para não lançar lote pago inesperado. Cron continua desligado. Sem migrations, sem execução real durante preparação. Rollback: reverter delta; legacy painel e auth intactos. Publicação de nova mudança depende de aprovação concreta após testes.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass local | Botão global admin; catálogo completo dentro de /admin/bikes; histórico não processado em lote. |
| CTO | Pass local | Reuso de bike-panel/runBikeCatalogSync e generate-from-sheet; baseline RPC e reserva existentes. |
| IA | Pass local | Sem resumo na captura nem regeneração; um candidato novo, mesma geração de artigo/capa independente. Validação editorial de nova geração real permanece necessária antes da rotina contínua. |
| Segurança | Pass local | JWT confirmado com Auth, membership ativa, role admin/operation; seis testes positivos/negativos; content sem escrita comercial. Sessão legada preservada. |
| UX | Pass local | Resultado por bikes/vídeos/artigo, bloqueio de duplo clique, seção integrada e feedback acessível. Inspeção visual autenticada após publicação pendente. |
| CX | Pass local | Falha parcial explícita; vídeos atualizados mesmo se bikes falham, geração aguarda catálogo válido; refresh imediato de dados/histórico; operação mantém sync de bikes. |
| Growth | Pass local | Público SSR/Radar/afiliados intactos; /admin/bikes já era noindex. |
| PMO/QA | Pass local | 56 testes dirigidos, pnpm validate (typecheck, 59 regressões e SSR build), git diff --check. |

Estado: implementação e validação locais completas, sem chamadas pagas, sem sync real, sem migrations ou alteração de cron. Release requer instalação de editorial-admin e bike-panel e publicação frontend no mesmo Lovable; validação Deno no ambiente e smoke autenticado são gates dessa instalação. Risco residual: UI depende das duas funções na versão nova (instalar ambas antes do frontend); OAuth/legendas/IA continuam sujeitos a falhas reportadas; cron editorial ainda desativado. Custo da preparação: zero créditos Lovable. Custo da instalação: pequeno consumo possível para operação exclusiva de funções Cloud; cada novo artigo/capa posteriormente consome os créditos já previstos. Rollback reverte commit das duas funções e frontend; preserva dados, fontes e artigo existente. A primeira sincronização registra baseline; operar depois disso detecta novos vídeos por ID canônico.
