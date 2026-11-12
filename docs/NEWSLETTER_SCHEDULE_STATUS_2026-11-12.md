# Estado e desagendamento da newsletter — 12/11/2026

## Revisão pré-implementação

Mudança estrutural: painel privado, worker da newsletter e Supabase integrado. A edição #15 (13/11) está na revisão 2 do agente, com fingerprint, sem aprovação humana, sem erro registrado e sem campanha formada. Automação ligada, cron ativo a cada cinco minutos. A agenda normal abre às 06h30 em São Paulo; a formação da campanha e a confirmação pelo Resend acontecem depois. A #14 consta como enviada e tem a exceção documentada em [NEWSLETTER_HUMAN_APPROVAL.md](NEWSLETTER_HUMAN_APPROVAL.md).

| Perspectiva | Impacto | Risco e dependência | Recomendação |
| --- | --- | --- | --- |
| Produto | Mostrar agenda e distinguir aprovação humana da automática. | Confundir agenda interna com confirmação do provedor; depende do rascunho e do estado operacional. | Mostrar status e horário na lista e na prévia. |
| CTO | Suspensão persistida por edição no writer atual. | Corrida entre worker e admin; depende do lease, revisão e proteção de inserção no ledger. | Coluna aditiva, checagem no worker e proteção no banco. |
| IA | Preserva geração e revisão do agente. | Recuperação automática sobrescrever edição suspensa; depende do supervisor e validação existente. | Preparação respeita a suspensão; reagendamento valida a revisão salva. |
| Segurança | Novo comando apenas para administrador ativo. | Pedido antigo ou envio após suspensão; depende de revisão, lease e SQL sem novos grants públicos. | Recusar revisão obsoleta ou campanha já formada. |
| UX | Agendada, desagendada, bloqueada e janela encerrada explícitas. | Edição acidental, data no fuso errado ou mensagem apenas por cor; depende de ação confirmada e editor da edição. | Mostrar horário de São Paulo, confirmação e feedback. |
| Operação | Editar uma edição sem pausar as demais. | Suspensão próxima da janela ou desbloqueio involuntário. | Preservar 06h20 para edição e exigir reagendamento explícito. |
| Growth | Mantém cadência, fontes e consentimento. | Envio acidental ou validações ignoradas; depende da fila existente. | Preservar validações, regras de audiência e intervalo. |
| QA | Testar estados e transições de risco. | Estado parcial entre schema e publicação; depende de migração aditiva e validação local. | Aplicar schema antes do app, sob autorização, e manter proteção durante rollback. |

Decisão: priorizar a exatidão operacional, ainda que o editor ganhe um passo de confirmação. Um rascunho validado tem agenda interna, sem prometer aceite do Resend. Desagendar bloqueia a edição antes de formar campanha, invalida a aprovação anterior e abre o editor; salvar não retoma o envio. Reagendar passa pela validação da revisão atual. Mantêm-se o horário, a aprovação da contingência e a recuperação manual do dia. Fora do escopo: editar campanha formada, disparar ou mudar a #15, alterar cron, audiência, geração, conteúdo público ou provedor. Rollback: reverter o app e manter o bloqueio no banco enquanto houver suspensões; remover os objetos aditivos só após conciliar essas edições.

## Revisão pós-implementação

| Perspectiva | Estado local | Evidência |
| --- | --- | --- |
| Produto | Pass | Lista e prévia mostram horário e tipo de aprovação. Rascunho em revisão tem aprovação humana na prévia; campanha formada fica no histórico. |
| CTO | Pass | Mudança aditiva; worker e admin usam o lease existente. O banco bloqueia a formação de campanha suspensa mesmo com uma versão anterior do worker. |
| IA | Pass | A suspensão não gera conteúdo. A preparação automática não substitui a edição suspensa e uma proposta de revisão permanece sujeita a validação. |
| Segurança | Pass | Ações sob a autenticação administrativa já existente. A revisão é conferida antes de gravar e o banco não concede acesso novo a anon ou authenticated. |
| UX | Pass | Smoke em Chrome com viewport de 390 px e APIs simuladas: estado agendado sem botão de aprovação, abertura e foco no editor da edição desagendada, reagendamento e contingência. |
| Operação | Pass | Suspensão por edição; salvar mantém o bloqueio. Antes das 06h30, a ação explícita é Reagendar; a partir daí, só a solicitação confirmada de envio no mesmo dia pode liberar uma edição suspensa. |
| Growth | Pass | Sem alteração da agenda, audiência, fontes, ofertas ou intervalo mínimo; teste PostgreSQL confirmou que uma edição independente pode formar campanha. |
| QA | Pass | Lint dos arquivos alterados, 43 testes direcionados, pnpm validate (typecheck, 68 testes e build), smoke de Chrome e ensaio em PostgreSQL 17 isolado. |

**Produção, somente leitura:** em 12/11 às 12h55 de São Paulo, a #15 estava em modo agente, sem erro de preparação, aprovação humana ou campanha formada. Também não havia tentativa de alerta registrada para 13/11. O cron a cada cinco minutos estava ativo; a edição anterior #14 foi enviada e satisfaz a exceção de sexta instalada no RPC. Nenhuma escrita ou envio foi acionado.

**GO local; publicação condicionada.** Com autorização, confirmar backup restaurável, sincronização do GitHub, versão publicada e ausência de campanha em processamento antes da mudança. Aplicar a migração aditiva, publicar fora da janela de envio e conferir em modo somente leitura a lista e a prévia. Nenhuma chamada de geração é necessária. Se o app precisar voltar, manter a coluna e o trigger; uma tentativa de campanha suspensa pelo worker antigo falha de forma segura e pode pausar a automação global. Se houver suspensões ativas, preferir reverter a interface preservando o worker que as reconhece. Não remover a proteção SQL antes de conciliar as edições suspensas. Rollback do esquema, quando seguro: remover primeiro o trigger `newsletter_campaign_hold_guard`, depois a função `newsletter_guard_campaign_hold()` e por último a coluna `schedule_hold`.
