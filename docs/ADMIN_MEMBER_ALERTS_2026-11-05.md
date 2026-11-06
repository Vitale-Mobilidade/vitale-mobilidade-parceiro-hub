# Indicadores e avisos operacionais — 05/11/2026

Classificação: estrutural (Supabase, integração transacional Resend). Pedido: remover “Com artigo”, acrescentar total de usuários cadastrados ao final dos indicadores e enviar ao responsável avisos de novo cadastro e anúncio pago liberado.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência, recomendação |
|---|---|
| Produto | Cadastro significa adesão concluída à comunidade, como no painel existente; inscrição simples na newsletter não conta como perfil. Aviso pago apenas após primeira publicação de um pedido efetivamente pago. Prosseguir. |
| Arquitetura | Reusar métricas privadas e cron do worker financeiro; outbox transacional captura eventos sem envio HTTP no cadastro. Mesmo backend, sem novo writer de cadastro/pagamento. Prosseguir condicionado à idempotência e independência de falhas Asaas. |
| IA | N/A: sem modelos, agentes ou conteúdo gerado. |
| Segurança | Fila/config privadas, RPCs só service_role, destinatário fixado no servidor e confirmado pelo responsável; nenhuma chave/e-mail de usuário/celular nos avisos. Prosseguir condicionado aos testes de grants e assinatura do worker. |
| UX | Seis indicadores, Usuários cadastrados no final; erro de contagem aparece como indisponível, sem zero inventado. Avisos em português com ação direta ao Admin/anúncio. Prosseguir. |
| CX | Falha de entrega não impede conta/pagamento; fila durável, lease/retry e estado para revisão quando houver incerteza além da janela de idempotência. Não enviar histórico como novidade. Prosseguir condicionado. |
| Growth | Nenhum ajuste em captação, newsletter, consentimento ou páginas públicas. Notificações administrativas distintas das campanhas. Prosseguir. |
| QA | SQL real descartável: somente evento novo, dedupe, concorrência, acesso privado, reembolso/reativação/troca; mocks Resend e Asaas indisponível, UI Admin e pnpm validate. Prosseguir condicionado. |

Decisão consolidada: obter `members` do contrato `admin_member_metrics` já protegido; retirar o card redundante. Fila privada e triggers pós-adesão e pós-publicação paga; nenhum backfill de eventos. Worker assinado existente drena lote pequeno antes de consultar Asaas; remetente da configuração de newsletter, destinatário próprio em configuração privada. Congelar remetente/destino/conteúdo no primeiro envio e usar chave estável por evento. Repetição de webhook/edição/reativação/troca não cria novo aviso para o mesmo pedido. Cadastro e publicação não aguardam Resend. Ativação e deploy exigem autorização específica após validação local.

Trade-off: entrega próxima ao próximo ciclo do worker (aproximadamente um minuto, sujeito a fila/provedor), não promessa de instantaneidade. Resend guarda idempotência por 24 horas ([documentação oficial](https://resend.com/docs/dashboard/emails/idempotency-keys)); repetição ambígua além de 23 horas exige revisão, evitando reenvio automático sem proteção. Não é possível garantir recebimento final na caixa postal; registrar aceitação pelo provedor separadamente. E-mails contêm nome público e dados do anúncio/pagamento, sem endereço do usuário, telefone, CPF ou cartão.

Rollback: desabilitar fila, remover os dois triggers e revogar RPCs de entrega; preservar registros e pagamentos. Reverter frontend/chamada de worker. Sem produção alterada ou mensagens reais nesta preparação.

Destinatário confirmado pelo responsável nesta conversa: `guilherme@hotpipe.com.br`. Configurar apenas no backend durante a ativação autorizada; não mudar destinatário de outros alertas nem a newsletter.


## Revisão posterior

| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Total reaproveita perfis com adesão concluída, exclui anônimos; aviso novo por cadastro e primeira publicação de cada compra real. Newsletter isolada, sem aviso por inscrição simples. |
| Arquitetura | Pass | Mesmo contrato Admin de métricas; fila/triggers atômicos sem HTTP no cadastro. Worker assinado atual drena no máximo dois avisos, com lease, antes da saúde Asaas; falha do e-mail não interrompe financeiro. Pedido/provedor/prazo não alterados. |
| IA | N/A | Nenhuma IA ou consumo de agente. |
| Segurança | Pass | RLS/revokes inclusive contra grants defaults amplos; RPCs só service_role; destino confirmado, remetente backend, snapshot sem e-mail privado/telefone/CPF. HTML escapa campos públicos. Assinatura do worker rejeitada antes de claim/envio. |
| UX | Pass | Card final Usuários cadastrados, Com artigo removido; erro/retentativa/zero real e acesso Admin conferidos. Desktop e viewport 390px inspecionados com dados sintéticos. |
| CX | Pass | Eventos repetidos/reativação/troca não duplicam; compras distintas notificam separadamente. Corpo exato persistido antes do HTTP protege retry após troca de template/config. Limite 23h leva incertezas para revisão; rollback preserva histórico e desliga fila. |
| Growth | Pass | Sem mudanças em captação, consentimento, artigos, ofertas ou páginas públicas. Cadastros de newsletter não são contados como perfis da comunidade. |
| QA | Pass | 41 testes direcionados, SQL descartável incluindo concorrência e rollback, UI Admin local (ordem, zero, erro/retentar, role e mobile), lint direcionado e pnpm validate (66 testes/typecheck/build). Sem mensagens reais ou escrita em produção. |

### Validação e operação

- `python3 tests/member-community-db.py --notifications`: instalação sem histórico enviado; adesão parcial/anônima/antiga ignorada; uma fila por cadastro; transação desfeita não gera aviso. Pagamento sem publicação não avisa; período pago anterior à ativação não vira novidade em reativação; primeira publicação paga nova captura prazo; outra compra gera outro aviso. Repetição/reconciliação/reativação/troca/reembolso e Admin do canal não duplicam aviso pago. Lease/token, corpo congelado, destinatário/remetente congelados, janela expirada para revisão, grants e dois claims concorrentes sem duplicatas. Rollback desabilita e preserva registros.
- `pnpm exec vitest run --config vitest.config.ts src/lib/member-operation-alerts.server.test.ts src/lib/listing-billing.server.test.ts src/lib/admin-classifieds.server.test.ts`: 41 testes; templates/datas/escape, segredo ausente, gateway, chave estável, retry HTTP/rede/ack, corpo persistido e assinatura; cadastro notificado mesmo sem credenciais Asaas. Transporte fake: zero envios reais.
- `tests/admin-overview-members-ui.mjs`: seis indicadores na ordem, Com artigo ausente, contrato privado existente `days:1`, valor real zero, erro com retry, consulta apenas Admin, layout desktop/390px. Capturas ignoradas em `artifacts/admin-member-alerts/`.
- `pnpm validate`: 66 testes, typecheck e build. Lint dirigido aos três arquivos server/test alterados; não reformatar o legado inteiro de AdminEditorial. `git diff --check` aprovado.
- Preflight de produção somente leitura: 3 perfis com adesão concluída, 2 pedidos pagos já existentes, cron financeiro ativo e remetente existente configurado. Migration de avisos ainda não aplicada; nenhum cadastro/pagamento/evento real foi alterado para homologação.

### Ativação proposta e limites

Após autorização específica: aplicar `20261106013000_member_operation_alerts.sql` no Supabase integrado (cria configuração desativada, tabelas privadas, triggers e RPCs); integrar/publicar código; conferir a versão; só então configurar `recipient='guilherme@hotpipe.com.br'`, `starts_at=now()` e `enabled=true`. Isso inicia apenas eventos novos. Não reenviar os cadastros/pagamentos históricos. Sem nova Edge Function, secret ou cron; os segredos Resend existentes continuam exclusivamente no servidor. Sem contratar plano ou usar agente Lovable. Cada aviso consome um envio da franquia Resend existente; sem garantia de entrega na caixa postal.

Cadência: próximo ciclo do worker, aproximadamente um minuto em operação normal, sujeita à fila e ao provedor. Dois envios por ciclo; cada chamada tem timeout de 12 segundos. Falhas ficam na fila para retentativa com backoff, sem reaplicar transação comercial. Um sucesso HTTP com ID válido significa aceito pelo Resend, não recebido/lido. Não foi executado envio real nesta preparação; próximo evento real comprovará entrega.

Se aparecer `needs_review`, conferir o evento/ID no Resend antes de qualquer reenvio; não zerar `first_attempt_at` para ultrapassar a proteção de idempotência. Consulta operacional privada: agrupar `member_operation_alerts` por `event_kind,status,error_code`, sem exportar payload. Rollback em `supabase/rollback/20261106013000_member_operation_alerts.sql`, acompanhado da reversão dos dois pontos de app/worker. Estado atual: pronto localmente e em PR, aguardando aprovação de migration, merge, publicação e ativação para esse destinatário.
