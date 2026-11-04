# Checkout hospedado: dados do pagador somente no Asaas

Correção solicitada pelo titular em 04/11: CPF/CNPJ, cartão e escolha da forma de pagamento devem ser preenchidos diretamente no checkout do Asaas. O formulário financeiro interno não atende ao produto e será removido. Nova contratação temporariamente bloqueada; consumidores/cancelamentos continuam ativos. Não houve criação de cliente ou pedido financeiro na implementação anterior.

Classificação estrutural: integração, privacidade, contrato e migração aditiva. Revisão prévia: Produto exige um único CTA para checkout hospedado mensal150; CTO mantém reserva/ledger, adiciona ID de checkout e correlaciona cobranças pelo `payment.checkoutSession`; Segurança remove coleta e transporte de documentos pela Vitale, rejeita payload financeiro legado, retém somente IDs/estado; UX elimina escolhas/QR/CPF internos e explica requisitos antes do CTA; CX cancela checkout e assinatura, sem afirmar encerramento antes da confirmação; Growth preserva newsletter e lançamento privado; IA N/A sem decisão financeira por modelo; QA exige teste de redirecionamento, fonte autoritativa, replay, cancelamento e validação real da criação de uma sessão sem concluir pagamento.

Decisão: usar Asaas Checkout sem `customer` nem `customerData`, com `externalReference` interno, recorrência mensal150 e callbacks próprios. O pagador escolhe os meios oferecidos pelo Asaas. Não se anuncia Pix convencional como Pix Automático. Validar a combinação recorrente de meios pela API antes de habilitar a contratação. Se o provedor não aceitar a combinação, não simular nem substituir silenciosamente por pagamento avulso.

A API de cobrança retorna `checkoutSession`: essa relação mais assinatura, cliente, valor150 e cicloMONTHLY é a prova de vinculação. `CHECKOUT_PAID` ou retorno do navegador isolados não concedem publicação. Eventos de checkout autenticados podem recuperar o ID de uma sessão conhecida e revogar uma sessão abandonada, sem gravar customerData nem payload bruto. IDs de evento Asaas podem conter `&`, diferentemente dos IDs de recurso; validar separadamente.

Rollback: flag de nova contratação desativada, manter gate de pagamento e consumidores, não restaurar coleta de documentos. Credenciais não mudam. Backup fresco e restore sintético antes de migration; nenhuma alteração de sessão, fotos ou conteúdo do anúncio do usuário.

Fontes: https://docs.asaas.com/docs/como-informar-os-dados-do-cliente ; https://docs.asaas.com/reference/criar-novo-checkout ; https://docs.asaas.com/docs/checkout-com-assinatura-recorrente ; https://docs.asaas.com/docs/eventos-para-checkout .

## Revisão posterior local

| Perspectiva | Estado | Evidência |
| --- | --- | --- |
| Produto | Pass | CTA único para Asaas, mensalidade150, mesma jornada paga para conta de canal e demais anunciantes |
| CTO | Pass | Reserva única, ID de checkout/assinatura e correlação autoritativa por cobrança; receiver do runtime preservado |
| Segurança | Pass | API rejeita campos financeiros legados; nenhum customerData, CPF, cartão ou corpo bruto persistido; RLS privado, evento ampersand validado |
| UX | Pass | Nova aba mantém formulário aberto, popup aberto no gesto do usuário, fallback de link se bloqueado, refresh no retorno/foco |
| CX | Pass | Cancelamento de sessão e recorrência; pagamento fechado não é marcado como encerrado antes de resposta; gate de capability antes de ativação |
| Growth | Pass | Descoberta pública oculta; newsletter simples e sessão preservadas |
| IA | N/A | Nenhuma decisão de identidade ou financeira por modelo |
| PMO/QA | Pass local | Contratos unitários e Playwright hospedado; restore com snapshot fresco, SQL e validate; ativação externa depende do probe sem pagamento |

O checkout respondeu com `X-Frame-Options: SAMEORIGIN` e política de frame que não inclui a Vitale na consulta da página hospedada. Não removemos nem contornamos esses controles. A nova aba mantém a Vitale aberta. Fonte de navegação: https://docs.asaas.com/docs/link-do-checkout-e-redirecionamento-do-cliente .

Backup: três funções alteradas (`member_billing_checkout`, `member_listing_entitled`, `member_listing_json`) capturadas de produção antes da migração e restauradas no PostgreSQL isolado; sem dados reais de pagadores. A isenção foi retirada da jornada de publicação para a conta de canal percorrer o checkout comum. A identificação factual de bike do canal foi preservada.

Validação local concluída: 25 testes de transporte, minimização, recusa de campos legados, fonte de cobrança, refund parcial, idempotência e cancelamento; Playwright mantém a Vitale aberta e recebe checkout em nova aba sem formulário do pagador; migração e contratos SQL em PostgreSQL restaurado com snapshot fresco; lint direcionado sem erro; `pnpm validate` com 66 contratos e builds SSR/client. O probe operacional cria uma sessão anônima expiráveI e a cancela antes de qualquer preenchimento/pagamento; só então habilita a capability `hosted_ready` e registra os eventos de checkout no webhook existente. Falha mantém nova contratação bloqueada.

## Limitação confirmada na API do provedor

A validação real de `POST /checkouts` retornou400: CREDIT_CARD é o único método permitido para RECURRENT; PIX exige DETACHED. Também confirmou limite de30 caracteres para o nome do item. Não foi criado checkout, cliente ou cobrança nessa tentativa. Corrigir o nome e preparar assinatura mensal por cartão sem dados do pagador. Não substituir Pix Automático por Pix avulso. A escolha entre liberar cartão primeiro ou manter ambos bloqueados foi apresentada ao titular; nova contratação permanece desabilitada enquanto a escolha está pendente.
