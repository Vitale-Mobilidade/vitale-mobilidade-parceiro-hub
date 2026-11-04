> **Decisão substituída em 04/11/2026:** pagamento único de R$150 por Pix ou cartão, com 90 dias de exibição. Nenhuma escolha sobre recorrência permanece pendente. Contrato vigente: [anúncio por 90 dias](ASAAS_90_DAY_LISTINGS_2026-11-04.md).

> Fluxo financeiro inicial substituído por [checkout hospedado](ASAAS_HOSTED_CHECKOUT_2026-11-04.md): nenhum CPF/CNPJ ou formulário de pagamento na Vitale e nenhuma opção de isenção na jornada comum. Este registro preserva a evolução anterior e suas evidências.

# Asaas — R$150 mensais por anúncio ativo

Decisão explícita: integrar agora a conta Asaas aberta, com R$150 por mês por anúncio enquanto ativo. Manter jornada comum e divulgação pública suspensa. Classificação estrutural (cobrança, integração e autorização).

## Revisão prévia

| Perspectiva | Impacto / risco / dependência | Recomendação |
| --- | --- | --- |
| Produto | Assinatura por anúncio; não assinatura ilimitada da conta | Pedido interno vincula UUID, bike e recorrência; publicar só após pagamento real |
| CTO | API Asaas via backend SSR existente, Supabase como fonte de autorização | Reutilizar runtime server e secrets; ledger privado, inbox idempotente e cancelamento durável |
| IA | Nenhum modelo envolvido em decisão financeira | Transporte/API determinísticos, sem agente pago |
| Segurança | Chave/token privados, JWT validado, valor fixo no servidor, falso webhook/redirect/replay | Token webhook + consulta autoritativa à API, ownership e guards SQL; raw card/CPF não persistidos |
| UX | Mensalidade, renovação, cancelamento e estados reais visíveis na etapa Publicação | Cartão no checkout Asaas, Pix Automático com QR; sem pagamento fictício ou abertura pública |
| CX | Desativar/vendida/pausar deve encerrar renovação; provider indisponível exige pendência explícita | Cancelamento em fila com retentativa; nunca declarar cancelado antes da confirmação |
| Growth | Newsletter, Radar, Quiz e links afiliados preservados | Nenhuma cobrança fora do contexto de anúncio; sem exposição do ID pessoal na URL |
| PMO/QA | Nenhuma assinatura real de teste ou pagamento por conta do usuário | Mocks, SQL restaurado, validação e backup; ativação apenas com credencial/webhook conferidos |

## Decisão consolidada

Implementar endpoints server de checkout/status, webhook e worker. Cadastro/pagamento/cartão do titular ocorrem no Asaas; nenhum dado de cartão entra na Vitale. CPF/CNPJ necessário ao cliente Asaas é enviado somente pelo usuário no checkout e não gravado na base Vitale. Supabase Auth define o ator; externalReference é ID do pedido, não URL/ID fornecido pelo navegador.

Cartão: criar/localizar cliente, assinatura mensal CREDIT_CARD e invoiceUrl da primeira cobrança. Pix Automático: autorização MONTHLY / SUBSCRIPTION, valor150, QR inicial150; não confundir autorização com confirmação financeira. Recebimento inicial correlacionado pela transação Pix/conciliationIdentifier. Cada evento consulta o recurso atual antes de aplicar, com deduplicação; estorno/chargeback suspendem o direito pertinente. Pagamentos de outros produtos da mesma conta são ignorados.

Pedido congela revisão e consentimento de contato do anúncio. Pagamento confirmado pode publicar somente a revisão autorizada, com identidade atual válida. Valor fixo15000 centavos; nenhuma abertura de entitlement geral. Isenção existente do canal fica disponível por regra de servidor; também há caminho pago normal, iniciado somente com aceite mensal explícito do usuário.

Ao desativar, vender ou retirar do ar: revogar a exibição imediatamente e enfileirar encerramento da assinatura/autorização. Worker assinado com leases e retentativa; status pendente aparece até confirmação. Reativar volta a rascunho e não cria cobrança nem publicação automática. A consulta pública e imagens verificam vigência do pagamento mesmo entre ticks. Nenhuma renovação após encerramento confirmado.

Conflitos: cobrança recorrente substitui a antiga informação avulsa; já não se cobra um único R$150. Reembolso/chargeback e retorno de checkout não podem conceder acesso por conta própria. A área do canal mantém a mesma interface do usuário comum. Pix não ativado após pagamento inicial mantém o período pago, mas não autoriza débitos futuros.

Critérios: webhook falso/repetido/fora de ordem, troca de proprietário/valor, confirmação de Pix vs autorização, confirmação cartão, vencimento, refund/chargeback, criação incerta sem duplicar, cancelar/reativar, gates de mídia e interface; pnpm validate; nenhum dado sensível em bundle/log/Git.

Rollback: flags de billing desativadas, checkout bloqueado, manter worker de cancelamento até drenar; não remover recursos Asaas nem restaurar banco inteiro. Snapshot das funções/settings antes de migração; reversão não pode reabrir anúncio sem direito financeiro. Credenciais ausentes impedem ativação, sem simular integração funcionando.

## Implementação e operação

- Rotas SSR `/api/member/listing-billing`, `/api/public/asaas-webhook` e `/api/public/classifieds-billing-worker`. Nenhuma chave é importada pelo componente/browser. API e webhook usam credenciais distintas nos secrets do projeto integrado; chave Asaas sem permissão de saque. A criação da chave foi autorizada e o titular concluiu pessoalmente o Token App.
- Reserva transacional: um contrato aberto por anúncio, limite de dez reservas por usuário/dia; repetir clique consulta a mesma reserva. POST financeiro nunca recebe retry automático. Uma resposta perdida vira `uncertain`; recuperação usa GET por referência/contrato antes de cancelar ou recuperar a invoice. Um resultado não localizado continua pendente, bloqueando nova cobrança e exigindo acompanhamento operacional.
- Inbox guarda só identificadores/tipo de evento. O consumidor busca o recurso financeiro atual, valida cliente, método, valor e relação com assinatura/autorização. IDs de eventos são únicos; observação financeira antiga não substitui observação nova. Reembolso e chargeback suspendem a vitrine e mídia.
- Cada vencimento pago cobre o mês até o fim do dia do próximo vencimento em São Paulo, permitindo a liquidação da renovação nesse dia. Sem renovação recebida, a expiração retira a publicação e enfileira cancelamento. Solicitações iniciais não pagas expiram após 24h. Reativação nunca reabre contrato cancelado.
- Cancelamento durável com lease, backoff e resposta explícita ao usuário; DELETE 404 é idempotente. Desativar/vender retira a exibição imediatamente. Não se declara assinatura encerrada antes da resposta do Asaas. Pagamentos já liquidados não são estornados automaticamente.
- Job a cada minuto, inicialmente desativado. Ativação requer secrets, rota publicada, webhook cadastrado e teste de saúde somente leitura. A checagem de saúde não cria cliente, invoice, assinatura ou autorização. Duas ocorrências por tick limitam o processamento durante o piloto privado; acompanhar a fila antes de liberar aquisição pública.
- Suporte: conferir pedidos `uncertain`/`cancel_pending`, tentativas, próximo retry e IDs de recurso no ledger privado; comparar no Asaas antes de qualquer nova criação. Não alterar o status para `active` manualmente, não forjar comprovante, não apagar um pedido incerto para permitir nova cobrança. Falha de API/chave mantém o pedido pendente e o anúncio oculto.
- O link genérico criado manualmente no Asaas não é reutilizado: a contratação nasce autenticada para um anúncio específico. `externalReference` aponta para o UUID interno do pedido, que referencia usuário e anúncio. `/conta` permanece privada e não precisa expor o ID individual na URL.
- Newsletter simples, login existente, identidade real, encaminhamento de WhatsApp, SSR de Radar/Quiz e descoberta pública suspensa foram preservados. Nenhum papel administrativo editorial foi concedido. A isenção anterior continua uma regra privada do canal; a mesma conta também pode percorrer o caminho pago mediante aceite explícito.

## Evidências locais e recuperação

- 24 testes unitários de transporte, documentos, token, dedup, ownership, valor fixo, checkout único, pagamento autoritativo, correlação Pix, chargeback e cancelamento incerto.
- Rehearsal em PostgreSQL 17 isolado, sem TCP ou dados reais: nove definições de tabelas da cópia de segurança, migrations anteriores, snapshot fresco das cinco funções produtivas, nova migration e contratos SQL. Pass para reserva idempotente, grants/RLS, bloqueio de publicação/edição sem direito, pagamento válido, refund fora de ordem, mídia, expiração, venda/cancelamento e lease do consumidor.
- Snapshot privado das funções, settings, estados de taxa/status e ledger de migrations antes da alteração; arquivos com acesso restrito fora do Git. O restore foi executado com os corpos atuais de produção antes da nova migration.
- Playwright local: cadastro/perfil e sessão preservados, fluxo de anúncio, cinco fotos, prévia, cartão e Pix mensal com aceite, confirmação e cancelamento, bloqueio da revisão vinculada, responsividade, SSR público e menus ocultos. Respostas financeiras sintéticas, rede externa bloqueada e nenhuma cobrança real.
- `pnpm validate`: typecheck, 66 contratos de rotas/Radar/Quiz e build SSR/client. Lint direcionado sem erros. A prova financeira real no banco/cartão do titular permanece uma homologação manual; o agente não autoriza débitos em seu nome.

## Revisão posterior

| Perspectiva | Status local | Evidência / condição operacional |
| --- | --- | --- |
| Produto | Pass | R$150/mês por anúncio, aceite e cancelamento próprios; sem liberação ilimitada da conta |
| CTO | Pass | Runtime SSR existente, ledger/inbox privados, reservas/leases e recuperação sem repetir POST |
| IA | N/A | Nenhum modelo decide cobrança, identidade ou concessão de direito |
| Segurança | Pass | Token separado, JWT autoritativo, ownership, valor fixo, source GET, RLS/mídia e teste de refund/stale event |
| UX | Pass | Etapa Publicar mantém fluxo comum; cartão hospedado, QR Pix, revisões congeladas e cancelamento confirmado em diálogo |
| CX | Pass | Retirada imediata, fila durável com pendência explícita e runbook para criação incerta; nenhuma cobrança declarada encerrada antecipadamente |
| Growth | Pass | Newsletter e aquisição atual preservadas; novos atalhos públicos continuam ocultos |
| PMO/QA | Pass | Testes direcionados, restore com snapshot fresco, validate e rollback definidos; ativação externa depende de prova de conexão |

Risco residual: sem realizar uma transação financeira real em nome do titular, a aprovação do banco/cartão e a autorização do Pix Automático só podem ser homologadas pelo próprio pagador no checkout. Isso não autoriza simular pagamento nem publicar uma bike fictícia. Rollback operacional: bloquear novas contratações com `member_billing_settings.enabled=false`, manter consumidor e cancelamentos ativos, preservar o gate público de vigência e o ledger; não restaurar funções antigas que permitiam publicação sem pagamento.

### Verificação de runtime em produção

A primeira saúde assinada retornou falha antes de qualquer resposta HTTP do provedor; checkout permaneceu desabilitado e não houve criação financeira. O adaptador guardava `fetch` como propriedade e o invocava com o cliente como receiver. Corrigido para preservar `globalThis`, com teste que reproduz a exigência do runtime Workers. [Referência primária Cloudflare](https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors). O diagnóstico do consumidor assinado informa apenas status HTTP numérico e boolean de formato da credencial, sem segredo ou corpo do provedor. Chave regravada no campo protegido após conferência visual; webhook salvo e ativado no Asaas.
