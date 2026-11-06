# Cópia dos avisos para Lucas — 06/11/2026

Pedido explícito: acrescentar lucasvitale@hotmail.com aos avisos já ativos para guilherme@hotpipe.com.br. Recebimento do aviso real de novo cadastro confirmado pelo responsável. Preflight somente leitura: destinatário principal intacto, avisos ativos, um aceito e nenhum pendente.

Classificação: estrutural, delta restrito à integração de e-mail. Sem migration, alteração de fila ou configuração de destinatário principal.

## Revisão prévia e decisão

| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Lucas recebe também cadastro e anúncio pago publicado; preservar destinatário atual. Prosseguir. |
| Arquitetura | Campo CC suportado pelo mesmo Resend/gateway e mesmo evento; nenhuma fila/writer paralelo. Corpo já congelado preserva retries antigos. Prosseguir condicionado aos testes. |
| IA | N/A: sem IA. |
| Segurança | Endereço explicitamente autorizado fica no módulo exclusivo do servidor; nenhuma entrada do visitante define CC. Sem contatos privados de clientes no aviso. Prosseguir. |
| UX | N/A: nenhuma tela ou jornada muda. |
| CX | Próximos avisos incluem Lucas; não reenviar histórico nem mexer em corpos já aceitos/preparados. Evitar destinatário duplicado se o principal for Lucas. Prosseguir condicionado. |
| Growth | N/A: campanhas e captação não mudam. |
| QA | Testar ambos os templates, corpo enviado, retries congelados, deduplicação de destinatário e pnpm validate. Prosseguir condicionado. |

Decisão: acrescentar cópia fixa server-side, mantendo To configurado no backend. Sem reenviar o aviso da captura enviada pelo usuário. Custo: um destinatário adicional por aviso na franquia existente, sem novo serviço/plano. Rollback: remover CC e reverter o módulo, sem modificar eventos e pagamentos existentes.


## Revisão posterior

| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Cópia para Lucas em cadastro e anúncio pago, destinatário principal mantido. |
| Arquitetura | Pass | Um campo CC no mesmo corpo/endpoint, sem alterar chave de idempotência, filas, schema ou jobs. |
| IA | N/A | Sem modelo ou agente. |
| Segurança | Pass | Endereço só no bundle de servidor, ausente do build público; endereço fixo não vem do usuário visitante. |
| UX | N/A | Nenhuma interface alterada. |
| CX | Pass | Templates e request transportado incluem CC. Se Lucas for o To, CC é omitido. Corpos antigos congelados continuam byte a byte e sem CC, sem reenvio de histórico. |
| Growth | N/A | Nenhuma campanha, newsletter ou captação muda. |
| QA | Pass | 37 testes direcionados, lint, pnpm validate com 66 testes/typecheck/build, diff check; nenhum envio real ou escrita produtiva. |

Contrato externo confirmado na [API oficial Resend](https://resend.com/docs/api-reference/emails/send-email): CC aceita endereço ou lista. O mesmo gateway existente recebe o corpo. Rollback: revert dos cinco trechos de linhas de aplicação acrescentados; corpos já preparados preservados. Estado: preparado para publicação autorizada. A inclusão do destinatário foi solicitada explicitamente; merge/deploy seguem o gate de publicação do repositório.
