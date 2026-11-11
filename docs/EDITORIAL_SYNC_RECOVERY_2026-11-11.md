# Recuperação da sincronização editorial — 11/11/2026

Mudança estrutural no projeto Lovable ativo, baseada em `09f95f7`. O Admin registrou sincronização comercial às 13h07 de 11/11 e busca editorial desativada. O histórico editorial mostra ciclos às HH:07 e HH:12 até 18h12 de 09/11, falha automática às 18h15 e uma publicação manual em 10/11. No código, uma recusa HTTP 402 de IA desabilita também a descoberta editorial. A causa do incidente será conferida nos detalhes da auditoria Cloud.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Restaurar a publicação automática dos vídeos elegíveis. Condicionar à mesma cobertura editorial e ao QA obrigatório. |
| CTO | Separar a pausa da IA da descoberta, mantendo trigger, cron, leases e escritor existentes. Aplicar a coluna aditiva antes da função. |
| IA | HTTP 402 explícito permite retomar capa recusada e publicação a partir dos checkpoints. Falhas incertas e correção editorial ficam na revisão existente para evitar repetição de trabalho. |
| Segurança | Preservar assinatura, papel Admin e switch operacional. Conceder escrita da coluna apenas ao papel de serviço. |
| UX | Mostrar importação ativa e fila temporariamente pausada com data e hora de São Paulo. Condicionar ao retorno de estado da Edge. |
| CX | Registrar novos vídeos durante a pausa e retomar na agenda vigente. Conferir vídeos faltantes pelo ID, sem editar a planilha. |
| Growth | Preservar transcrição original, QA factual, SEO, links e preços no Radar. Publicar somente fontes elegíveis. |
| PMO/QA | Validar pausa, retomada, recusa de publicação sem QA, SQL, SSR e rollback. Confirmar dados reais antes de reativar o switch legado. |

## Decisão

A pausa por HTTP 402 passa a ter uma janela de seis horas. O próximo ciclo elegível tenta prosseguir pela fila existente. A janela reduz recusas repetidas e mantém o controle de parada do operador. Capa recusada e publicação voltam ao checkpoint anterior. A política atual de retomada do texto sem saída permanece. Resta o risco de falhas incertas exigirem revisão, com evidências e conteúdo salvo preservados.

O escopo inclui migração aditiva, Edge editorial e estado no Admin. Aceite local inclui a importação durante a pausa e ausência de chamada paga durante a janela, preservação do desligamento explícito, retomada pelo fluxo assinado e validação completa do checkout. Aceite operacional exige importação e publicação reais verificadas pelos IDs. Rollback operacional pelo switch editorial existente. Para rollback de código, reimplantar a Edge e o Admin anteriores, preservando a coluna aditiva, a fila e as capturas.

## Incidente confirmado

No banco integrado, `automatic_publication_failed` registrou `ai_http_402` às 18h15 de 09/11 (horário de São Paulo). O código vigente desligou `youtube_editorial_worker_settings.enabled`. Os dois crons editoriais permaneceram ativos. A atualização comercial de bikes teve sucesso às 13h07 de 11/11. A IA voltou a responder em uma tentativa manual de 10/11, mas o switch permaneceu desligado. O saldo atual não está disponível nas consultas do banco.

A leitura direta da planilha confirmou os IDs sensíveis a maiúsculas e minúsculas: `lnnQxjO9KlM` para FT07 Raio-X e `Xl_kAeVjf40` para V9 Max. A primeira leitura do banco usou IDs visualmente parecidos vindos da captura de tela. A validação produtiva deve usar os IDs do CSV e verificar publicação pelo pipeline normal. Os artigos do Farol da OUXI V20 Ultra e da V8 Ultra S já estão publicados.

A auditoria encontrou também uma falha de progressão NDJSON após encerramento do leitor. A revisão de CTO, IA, Segurança, Operação e QA incorporou o delta: o cancelamento interrompe a entrega de progresso ao navegador e não injeta uma exceção na operação em curso. Preservam-se os checkpoints, os limites do runtime e as regras de recuperação.

## Revisão posterior local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Descoberta e processamento passam a ter estados independentes durante a recusa de IA. |
| CTO | Pass | Testes da entrada horária e do drain cobrem retomada, pausa e importação. |
| IA | Pass | Recusa 402 no QA mantém a revisão pendente e o artigo privado. QA e capa existentes continuam exigidos. |
| Segurança | Pass | Teste PostgreSQL isolado confirma a escrita da coluna pelo serviço e ausência de acesso anônimo. Assinatura e controle de Admin são preservados. |
| UX | Pass | Teste do painel cobre busca ativa e horário local da próxima tentativa. |
| CX | Pass | A pausa não interfere no sync comercial. Teste de cancelamento protege o escritor da falha no progresso. |
| Growth | Pass | Testes preservam validação factual, revisão da fonte e a publicação da revisão exata. Rotas públicas e links permanecem intactos. |
| PMO/QA | Pass | `pnpm validate`, testes dirigidos e aplicação isolada da migration passaram. |

## Liberação operacional

Aplicar primeiro a migration aditiva e implantar somente `editorial-admin` com o código revisado. Antes de reativar o switch, conferir a configuração atual, as duas identidades do CSV e a fila. Reativar o registro singleton preservando o agendamento e acompanhar o próximo ciclo assinado. Confirmar fonte, QA e URL pública dos artigos elegíveis. Em caso de recorrência de 402, a fila aguarda a janela programada e a descoberta continua. Rollback pelo switch e pela versão anterior da Edge/Admin. Diagnóstico Cloud somente leitura consumiu 3 créditos Lovable. A preparação local e os testes usaram mocks e PostgreSQL isolado. A validação em produção depende da liberação de merge e migration.
