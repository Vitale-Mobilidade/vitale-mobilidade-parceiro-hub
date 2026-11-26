# Wosi — remover textos acima das artes

Pedido explícito do responsável após publicação: remover os avisos indicados nos screenshots, incluindo “Publicidade · Wosi” e “Pausar animação”. A autorização de publicação da mesma entrega permanece nesta conversa.
Classificação conservadora: estrutural pela superfície comercial existente, embora URL, rel, artes e posicionamento permaneçam intactos.

## Revisão prévia das oito perspectivas

| Perspectiva | Impacto e risco | Dependência e recomendação |
| --- | --- | --- |
| Produto | Exibir somente a arte enviada, sem linha de avisos | Pedido explícito; prosseguir |
| CTO | Remover markup visual no componente compartilhado; risco de espaçamento | Preservar SSR/picture; prosseguir |
| IA | Sem alteração em agentes ou conteúdo gerado | N/A; nenhuma execução paga |
| Segurança | Nenhum novo dado ou destino | Preservar href, rel e descrição acessível; prosseguir |
| UX/UI | Retirar linha superior e espaço; preservar pausa acessível | Controle discreto em ícone ao passar mouse/focar, sem texto permanente; prosseguir |
| CX | Sem operação/backend alterado | Reversão apenas frontend; prosseguir |
| Growth | Retirar rótulo visual conforme solicitado; sem mudar afiliação | Manter sponsored e identificação acessível, arte já informa parceria Wosi; prosseguir |
| PMO/QA | Correção isolada sobre f27708a | Teste de banner, pnpm validate e smoke público; prosseguir |

Decisão: remover a linha superior, manter a arte/link e um controle de pausa em ícone sobreposto que aparece em hover/foco; preservar reduced-motion. Sem mudanças de mídia, banco ou tracking. Trade-off: ausência de rótulo visual adicional foi pedida pelo responsável; parceria permanece explícita na própria arte e nos atributos acessíveis. Rollback: reverter somente este ajuste de componente e republicar.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Rótulo e texto permanente removidos do componente compartilhado. |
| CTO | Pass | SSR, picture e dimensões preservados; typecheck e build passaram. |
| IA | N/A | Nenhum agente, prompt ou geração alterado. |
| Segurança | Pass | Mesmo href e rel, identificação acessível preservada; sem dados novos. |
| UX/UI | Pass | Linha superior removida; pausa em ícone revelado por hover/foco, reduced-motion intacto. |
| CX | Pass | Nenhum backend, job ou operação alterado. |
| Growth | Pass | Artes, cupom e links diretos preservados; remoção visual explicitamente solicitada. |
| PMO/QA | Pass | ESLint dos dois arquivos, 16 testes direcionados, pnpm validate (71 regressões, tipos e build) e diff-check passaram. |

Release: autorizado como correção da entrega publicada na mesma conversa; pendente apenas de integração/publicação nativa e smoke. Custo adicional de geração: nenhum. Rollback: reverter o commit deste ajuste e republicar o frontend.
