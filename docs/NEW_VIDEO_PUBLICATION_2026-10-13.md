# Publicação de vídeos novos — 13/10/2026

## Governança prévia
Classificação: estrutural (IA e SEO). Escopo: retirar similaridade do gate automático, preservando validação factual, fonte original, capa, leases e prevenção de duplicação do mesmo vídeo.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Cobrir cada vídeo novo conforme instrução explícita do usuário. Prosseguir. |
| CTO | Mudar revisão final e invalidar cache; preservar contratos e leases. Prosseguir com testes. |
| IA | Revisar fonte e catálogo sem comparar artigos; preservar grounding. Prosseguir. |
| Segurança | Preservar autenticação, RLS e tratamento de dados não confiáveis. Prosseguir. |
| UX/UI | Sem alteração visual; aviso de pronto não representa QA completo. Prosseguir no escopo. |
| CX | Eliminar reescrita por sobreposição, preservar diagnóstico de falhas reais. Prosseguir. |
| Growth | Sobreposição editorial pode aumentar; decisão explícita do usuário prioriza cobertura. Prosseguir. |
| PMO/QA | Validar contrato, cache e regressão editorial; pnpm validate. Prosseguir condicionado a testes. |

Conflito: originalidade versus cobertura de vídeos. Decisão autorizada: cobertura prevalece; sem invenção de diferenças. Critérios: revisão final sem pares/diversidade; validações factuais e técnicas preservadas. Rollback: reverter diff. Deploy e publicação dependem de autorização específica conforme EXECUTION_GUARDRAILS.md.

## Revisão posterior e evidências

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Similaridade retirada do veto automático conforme decisão. |
| CTO | Pass | Cache v7; leases, revisão e contratos preservados. |
| IA | Pass | Payload sem pares/diversidade; fonte e catálogo preservados. Validação local de contrato, sem chamada paga. |
| Segurança | Pass | Sem mudança de autorização, segredos, RLS ou dados produtivos. |
| UX/UI | N/A | Nenhuma alteração visual. |
| CX | Pass | Sobreposição não orienta mais reprovação na revisão final. |
| Growth | Pass | Diversidade permanece registrada; cobertura priorizada com risco explicitamente aceito. |
| PMO/QA | Pass | 21 testes dirigidos; pnpm validate (61 testes, typecheck e build) aprovado. |

Estado: preparação local concluída, sem deploy. Testes do contrato não garantem obediência perfeita do modelo; smoke produtivo depende de autorização de release. Rollback por reversão do diff da função.

## Diagnóstico de ausência de alerta
Consulta somente leitura de produção: vídeo IJ8q69h59vo em generating, correção enfileirada às 13h15 e compilação iniciada às 13h16 de 13/10/2026, sem conclusão. Não há editorial_alert_sent nem editorial_alert_failed para esse vídeo. No código atual, notifyEditorialReview é chamado nos caminhos terminais de falha (needs_review), não quando se enfileira correção automática. A RPC claim_youtube_editorial_rewrite muda rewrite_pending para generating sem prazo de lease. Uma interrupção fora do catch pode deixar a execução sem transição terminal e sem alerta. Canal configurado no código: e-mail para guilherme@hotpipe.com.br. Nenhum envio real disparado. Monitoramento de execuções estagnadas é uma pendência separada; não foi implementado nesta correção de similaridade.

## Ampliação autorizada — alerta e release
O usuário autorizou seguir com correção e aplicação em produção nesta conversa. Nova decisão prévia: adicionar timestamp de mudança de estado, reconciliação de etapas ativas sem conclusão após 15 minutos e alerta com retry limitado. Não repetir geração paga automaticamente. Recuperar especificamente IJ8q69h59vo para revisão factual/publicação com a política nova, preservando artigo e capa.

| Perspectiva | Impacto, risco, dependência, recomendação |
| --- | --- |
| Produto | Completar cobertura do vídeo e avisar impedimentos. Prosseguir. |
| CTO | Trigger de timestamp e RPC atômica com locks; dispatch deve acordar também para travados. Aplicar migration antes da função. Prosseguir condicionado à regressão SQL. |
| IA | Não repetir chamada paga de resultado incerto; artigo salvo será revisado contra fonte. Prosseguir. |
| Segurança | RPC somente service_role, credenciais server-side; logs sem segredos. Prosseguir. |
| UX/UI | Alerta terá acesso ao Admin; nenhuma alteração de SSR. Prosseguir. |
| CX | Alerta para etapas interrompidas após 15 minutos; retries de entrega com intervalo e idempotência. Prosseguir. |
| Growth | Cobertura por vídeo prevalece sobre originalidade entre artigos conforme decisão anterior. Prosseguir. |
| PMO/QA | Teste SQL local com estados ativos, recentes, concluídos, retries e timestamps; mocks de email; pnpm validate. Backup e rollback antes de produção. Prosseguir. |

Risco/trade-off: não há resultado seguro de chamada interrompida; watchdog exige intervenção em vez de repetir o custo. Timeout de 15 minutos supera o orçamento normal da Edge Function. Escopo externo autorizado: migration aditiva, implantação de editorial-admin e recuperação/publicação do artigo; email operacional ao próprio usuário. Sem newsletter ou mensagens a terceiros. Lovable somente para implantação exclusiva do ambiente integrado, com consumo qualitativo pequeno/moderado; sem uso Max. Rollback: código anterior, restauração da função de dispatch e remoção do watchdog; timestamp aditivo pode permanecer inerte.

## Gate final antes da aplicação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Sem veto por sobreposição; recuperação específica autorizada. |
| CTO | Pass | SQL executado em PostgreSQL 17 isolado: timestamp, dispatch e reconciliação verificados. |
| IA | Pass | Sem repetição paga de execução incerta; revisão factual do artigo salvo. |
| Segurança | Pass | RPC negada a anon/authenticated e permitida a service_role; mocks sem email real. |
| UX/UI | Pass | Alerta aponta para o artigo salvo; frontend público intacto. |
| CX | Pass | Cinco estados ativos cobertos, recentes/concluídos excluídos, backoff e idempotência por episódio. |
| Growth | Pass | Diversidade segue em diagnóstico; risco de sobreposição aceito pelo usuário. |
| PMO/QA | Pass | 22 testes dirigidos + 19 verificações SQL + pnpm validate (61 testes, typecheck, build); backup fora do Git. |

Backup: /tmp/vitale-new-video-release-backup-20261013.json. Rollback: /tmp/vitale-new-video-release-rollback-20261013.sql (usar após restaurar Edge Function anterior). Base remota e projeto Lovable em 7a866b2. Produção tem 1 fonte em generating e 16 done. Aplicação autorizada: migration aditiva, Edge Function editorial-admin, reconciliação/alerta e recuperação do artigo em publish_pending, passando por revisão factual. Nenhum texto/capa será alterado por SQL. Lovable somente para implantação do ambiente integrado, custo esperado pequeno/moderado. Autorização: “pode seguir” após discussão explícita de corrigir e publicar. Sem newsletter ou mensagens a terceiros. Estado: validado localmente, aplicação em andamento.
