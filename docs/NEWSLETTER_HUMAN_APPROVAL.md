# Aprovação humana e recuperação da newsletter

Mudança estrutural no painel, worker, Supabase e integração Resend. Pedido de 11/11/2026 para recuperar e enviar a edição #14 e registrar aprovações futuras. No início, a #14 estava em contingência, revisão 1, sem campanha e com 107 assinaturas elegíveis no banco. A janela regular já havia fechado. O worker publicado exige a janela no código e no RPC.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Aprovar a revisão vista para a agenda existente. Envio agora é uma ação independente, com confirmação. Preservar numeração e programação regular. |
| CTO | Reusar autenticação, lease, RPC de formação, ledger e worker. Prender a exceção à data, revisão e conteúdo aprovados, com expiração. |
| IA | A aprovação humana substitui o veto ao texto de contingência. Manter tema, imagens, novidade, fontes e oferta vigente como validações obrigatórias. |
| Segurança | Admin ativo no servidor, revisão exata e bloqueio após criação da campanha. Manter RLS, segredos, consentimento, supressões e verificação final de audiência. |
| UX/UI | Mostrar a ação junto à prévia e distinguir contingência, aprovação, janela encerrada e pedido de envio. |
| CX | Usar o agendador existente para processar a solicitação e exibir progresso pelo histórico. Quota ou falha do provedor devem continuar visíveis. |
| Growth | Manter restrições de novidade, prazo entre campanhas, oferta ativa e descadastro. Preservar o conteúdo aprovado. |
| PMO/QA | Testar concorrência, versão, expiração, agenda habitual e regressões. Separar autorização de envio da aprovação para alterar schema e publicar. |

Decisão: aprovação opcional por admin autenticado, vinculada à revisão que gerou a prévia, gravada sob o lease existente. Edição aprovada continua na agenda original. A recuperação da edição do dia pode pedir envio por até 30 minutos, limitado ao próprio dia, e passa pelo mesmo worker. A exceção substitui a restrição de horário somente para essa edição. Alterar o conteúdo invalida a aprovação. Se houver falha de oferta, imagem ou novidade, bloquear em vez de substituir conteúdo já aprovado. A aprovação automática do agente segue válida para edições geradas normalmente. Trade-off: exigir aprovação humana universal mudaria a operação já automatizada. O modo de contingência passa a ser elegível mediante revisão humana explícita.

Critérios: aprovação de revisão antiga rejeitada, nenhum disparo decorrente de aprovação simples, envio manual limitado à edição do dia, mesma fila e proteções de lista, campanha única, status fiel no painel e validações locais. Rollback: pausar operações se necessário e reverter o app ao commit anterior. A migration é aditiva e o worker anterior ignora seus metadados; manter o ledger e reconciliar campanha já submetida. Mensagens aceitas pelo provedor são irreversíveis.

## Revisão posterior

| Perspectiva | Estado local | Evidência |
| --- | --- | --- |
| Produto | Pass | Aprovação mantém a agenda e exige uma ação separada para envio imediato. |
| CTO | Pass | SQL ensaiado no PostgreSQL 17 descartável. Sem aprovação, expirada, revisão antiga ou conteúdo divergente são rejeitados. O reprocessamento devolve a mesma campanha. |
| IA | Pass | A revisão 1 da #14 passou em renderização, validação de fontes, novidade e oferta com o catálogo público atual e 14 snapshots do histórico. Nenhuma geração IA necessária para essa revisão. |
| Segurança | Pass | Rota de admin, lease renovado, revisão exata no SQL, RLS e segmentação existentes. Ensaio confirmou que papéis de browser não conseguem gravar aprovação ou chamar o RPC de campanha. |
| UX/UI | Pass | Ações na prévia, mensagem junto ao botão, indicação de revisão desatualizada e estados de aprovação e janela. TypeScript e lint direcionado passaram. |
| CX | Pass | Pedido recuperável até 30 minutos no mesmo dia, processado a cada cinco minutos pelo cron. Submissão ambígua mantém reconciliação pelo ledger. O envio imediato da #14 afetaria a janela de sexta. |
| Growth | Pass | Validação de oferta, novidade e fontes continuou obrigatória. Cadastros v1 ficaram fora no ensaio de audiência. |
| PMO/QA | Pass | 43 testes direcionados, validação geral e ensaio PostgreSQL. Consulta em produção às 12h23 mostrou zero campanhas da #14, automação ativa e 107 inscrições elegíveis. |

GO local. Publicação condicionada à autorização para integrar a alteração, aplicar a migration e publicar o app. Antes de aplicar, confirmar backup restaurável, definição atual do RPC, publicação anterior e fila vazia para a #14. Confirmar a nova ação e a disponibilidade do Resend antes de enfileirar o envio real autorizado. A edição só é marcada como enviada quando o provedor confirma. O intervalo de 46 horas existente bloquearia a janela de 06h30–08h30 de sexta-feira, 13/11, se a #14 fosse submetida na tarde de quarta. Custo esperado baixo de envio e publicação, sem chamada de IA. O diagnóstico de produção foi somente leitura.

## Retomada excepcional de sexta, 13/11

O responsável autorizou em 11/11 a integração, a migração, a publicação e o envio da #14 e pediu que sexta volte às 06h30. A revisão complementar limita a exceção de intervalo ao par 11/11 → 13/11 e à #14 recuperada manualmente, com envio já confirmado.

- Produto e Operação mantêm a abertura da janela de sexta às 06h30 e aceitam o intervalo menor exclusivamente após o atraso da #14.
- Arquitetura e Segurança exigem a exceção no RPC existente, pelo ID da única campanha correspondente, com confirmação de envio, lease, data, consentimento e proteção contra duplicação.
- IA e Growth mantêm o preparo editorial e a validação de novidade e ofertas da edição de sexta.
- UX mantém o horário habitual no painel e o aviso do intervalo mínimo para solicitações manuais em geral.
- QA exige provas da exceção, da recusa para campanhas pendentes ou de outra data e da preservação da agenda e das regras depois de sexta.

O trade-off autorizado é um intervalo menor entre essas duas edições. A regra de 46 horas continua valendo para qualquer outro envio recente, inclusive na sexta, e para a edição seguinte. O rollback pode restaurar o RPC anterior sem tocar no ledger.
