# Newsletter: histórico, resultados e tema escuro — 16/10/2026
Classificação: estrutural (integração Resend e conteúdo enviado).

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Recuperar visualização de campanhas antigas sem edição; próximas edições visíveis fora das configurações. Risco de confundir reconstituição e HTML enviado. Prosseguir com fonte rotulada. |
| CTO | Leituras autenticadas por campanha, cache curto no servidor e consulta Resend por ID pertencente ao projeto. Sem migrations. Prosseguir. |
| IA | Não gerar nem reescrever para visualizar. Reusar snapshot enviado e rascunhos já preparados; prosseguir. |
| Segurança | Gate admin, UUID validado, iframe sandbox, sem enviar PII ao cliente em relatório. Prosseguir. |
| UX | Tooltip em mouse/teclado/toque, tabela recente primeiro, histórico explícito e prévia responsiva. Prosseguir. |
| CX | Mostrar enviados/entregues/abertos/com clique no painel; distinguir zero de indisponibilidade/tracking desligado. Prosseguir condicionado. |
| Growth | Contagens únicas para abertura/clique, medição sujeita a privacidade dos clientes. Não ativar tracking nem alterar links nesta task. Prosseguir. |
| PMO/QA | Testes de contratos, falhas do provedor e histórico imutável; simular claro/escuro/mobile sem alegar teste em apps nativos. Prosseguir. |

## Decisão consolidada
Tooltip explícito acessível e tabela descendente. Histórico enviado preserva assunto, snapshot/HTML somente leitura e métricas do Resend via API oficial; próximas edições com visualização a partir do conteúdo preparado, inclusive data de hoje. Configurações permanecem recolhidas. Tema escuro com metadados e CSS para clientes compatíveis, fallback inline legível. Prévia oferece modos claro/escuro e desktop/mobile. Sem migração, alterações de consentimento, envios ou geração IA.

Fontes: https://resend.com/docs/api-reference/emails/get-metrics (sent/delivered/unique_opened/unique_clicked; cache até 15 min); https://resend.com/docs/api-reference/broadcasts/get-broadcast (HTML enviado); https://resend.com/docs/api-reference/broadcasts/list-broadcast-recipients. Consulta produtiva somente leitura confirmou três campanhas intactas, 08/10, 12/10 e 15/10, com assunto e payload disponíveis.

Trade-offs: zero só quando confirmado; tracking desligado ou sem comprovação deve ficar explícito. Histórico remoto usa HTML congelado do provedor; fallback local é rotulado reconstituição do snapshot, não cópia exata do enviado. Clientes Gmail/Outlook podem inverter cores independentemente da CSS; emulação no navegador não prova renderização nesses apps. Rollback: reverter diff, sem rollback de dados. Publicação da nova revisão exige escopo autorizado conforme guardrails.

## Evidência de integração e tema
Leitura autenticada do próprio Resend confirmou em 16/10: campanha #3 entregue a 25 pessoas, com aviso explícito de tracking de abertura/clique desativado no domínio news.vitalemobilidade.com. Não há dados históricos para reconstruir. Nenhuma configuração do provedor alterada. A API oficial e o SDK resend-node confirmam query `/emails/metrics` com IDs de broadcasts separados por vírgula e dimensões `broadcast`, contadores `sent`, `delivered`, `unique_opened`, `unique_clicked`.

Prévia local renderizada em navegador, larguras 360 e 390: scrollWidth igual a clientWidth, sem corte horizontal. CSS escura aplicada com fundo rgb(16,24,20) e texto rgb(228,238,231). Primeira medição encontrou contraste insuficiente nos selos claros; corrigido por solicitação do usuário para fundo #173d2a e texto #d1f5df em todas as categorias. Nova medição do fixture editorial: menor contraste de texto 6,4:1. Não simula inversão proprietária de Gmail, Outlook ou renderização nativa de iOS/Android. E-mails antigos continuam com o HTML original do provedor; não podem ser modificados na caixa de entrada.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Histórico com assunto e visualização sem edição, próximas preparadas separadas das configurações. |
| CTO | Pass | Consulta agrupada/cached por broadcasts pertencentes ao banco, sem N+1 de métricas; contratos oficiais conferidos. |
| IA | Pass | Visualizar não gera, não altera writer e não envia. |
| Segurança | Pass | Gate admin preservado, UUID estrito, sandbox sem scripts, nenhum telefone/email de destinatário no agregado Resend. |
| UX | Pass | Tooltip mouse/foco/toque; tabela descendente; prévia claro/escuro/mobile; contraste de selos corrigido. |
| CX | Pass | Falha de API preserva entregas locais e snapshot rotulado; tracking desligado fica explícito, não vira zero. |
| Growth | Pass | Métricas únicas solicitadas; histórico sem tracking é indisponível; nenhum rastreamento ativado silenciosamente. |
| PMO/QA | Pass | 51 testes direcionados, lint do escopo e pnpm validate (62 regressões, tipos e build) aprovados. |

GO para correção da newsletter/admin, continuidade do escopo já autorizado para implementação e publicação nesta conversa. Ativação de tracking é decisão separada: requer autorização específica, afeta somente eventos futuros e a medição de links. Para retornar ao estado anterior: reverter o diff desta revisão e republicar; banco e histórico não são alterados. Teste em aplicativos nativos é limitação declarada, não alegado como realizado.

## Correção de interpretação do selo
Usuário esclareceu: preservar caixa clara e usar texto verde escuro no tema dark. Regra final das categorias: fundo #e6f0e8 e texto #165b42, ambos explícitos para não herdar texto claro do tema. A passagem anterior que descreve selo escuro fica superada por esta decisão.
