# Anúncios de bikes por R$50

Mudança estrutural: preço de contratação no site, no banco, no checkout Asaas e nos avisos administrativos. R$50 é pagamento único por 90 dias.

| Perspectiva | Impacto, risco e dependência | Decisão prévia |
| --- | --- | --- |
| Produto | Reduz o custo de entrada; direitos/quitação anteriores permanecem válidos. | Alterar novas compras, preservar prazo e cortesias. |
| CTO | Site, esquema e Asaas precisam concordar; código antigo pode enviar valor diferente do pedido novo. | Bloquear novas reservas durante o corte; criar checkout com o valor gravado e confirmar contra o pedido. |
| IA | Nenhuma alteração em automação editorial, agentes ou grounding. | N/A. |
| Segurança | Divergência de valor não pode liberar publicação; payload do cliente não define preço. | Preservar autenticação, RPC, webhook e comparação exata; testar valores cruzados. |
| UX | Preço precisa coincidir na oferta, no aceite, no botão e no checkout. | Compartilhar uma constante de apresentação; mostrar valor do pedido em checkout já existente. |
| CX | Avisos e conciliação precisam refletir o pagamento real; link mensal antigo já desativado. | Ler o valor efetivo de cada pedido; manter histórico e usar checkout individual. |
| Growth | Menor atrito para anunciar; não anunciar a taxa ao comprador na vitrine. | Atualizar apenas os pontos de oferta ao vendedor, incluindo metadados. |
| PMO | Janela curta de manutenção protege o corte; risco de rollback quebrar compras novas. | Validar banco descartável e Asaas simulado; preservar valores aceitos em rollback. |

Decisão: atualizar defaults e admitir somente os dois preços registrados no histórico; preservar os registros de compras. O checkout recebe o valor da reserva gerada no servidor. O marketing mostra a tarifa vigente; sessões em andamento mostram o valor da própria sessão. Asaas cria uma sessão por anúncio; o link recorrente antigo permanece desativado, conforme o registro anterior. A indisponibilidade breve de novos checkouts durante o corte é preferível a uma divergência de cobrança; webhooks e anúncios existentes continuam funcionando.

Aceite: novos pedidos de 5.000 centavos, Pix/cartão, 90 dias; valores de 5.000 e 15.000 conciliados apenas com o respectivo pedido. Nenhuma cobrança ou criação de checkout real para teste. Rollback: bloquear novas contratações durante o retorno, repor preço/defaults de 15.000 e manter o leitor compatível com os dois valores para conciliar os pedidos de 5.000 que já existirem.

## Revisão após implementação

| Perspectiva | Resultado | Evidência |
| --- | --- | --- |
| Produto | Pass | Pagamento único de R$50 com período original de 90 dias. |
| CTO | Pass | Reserva autenticada e atualizada no banco, preço da reserva no item do checkout; API antiga impedida de reservar. |
| IA | N/A | Nenhum fluxo de IA foi alterado. |
| Segurança | Pass | Frontend em cache rejeitado; concessão e confirmação pela API Asaas ficam restritas ao valor aceito do pedido. |
| UX | Pass | Oferta, perfil, editor, aceite, botão e metadados usam o preço atual; sessão já existente mostra o valor reservado. |
| CX | Pass | Avisos exibem o valor efetivo. Histórico, cortesias, estornos e prazo mantêm a lógica existente. |
| Growth | Pass | A vitrine continua sem divulgar a tarifa; oferta do vendedor e metadata atualizadas. |
| PMO | Pass | 49 testes direcionados, banco descartável com migração e rollback, lint e pnpm validate aprovados. |

A implementação usa a conta Asaas já integrada e não altera seu produto mensal desativado. Nenhum custo externo adicional previsto. A aprovação de publicação foi explícita no pedido.
