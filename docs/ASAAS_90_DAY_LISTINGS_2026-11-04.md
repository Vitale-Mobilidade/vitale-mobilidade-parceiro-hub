# Anúncios: R$150 por 90 dias, pagamento único

Decisão do responsável em 04/11/2026: substituir integralmente a recorrência por uma compra de R$150, Pix ou cartão à vista. Checkout hospedado no Asaas, sem dados de pagador no formulário Vitale. Classificação estrutural (produto, integração financeira e Supabase). Autorização nesta conversa para alterar produto/formato e integrar novamente. A abertura pública continua suspensa.

## Revisão prévia e decisão

| Perspectiva | Impacto, risco, dependências e recomendação |
|---|---|
| Produto | Compra por anúncio, 90 dias corridos desde a primeira publicação após pagamento confirmado. Pausar/editar não reinicia prazo. Prosseguir sem renovação automática. |
| Arquitetura | Checkout DETACHED com PIX/CREDIT_CARD e referência opaca por pedido. Uma única reserva por anúncio e confirmação autoritativa no backend. Prosseguir com migração aditiva e ensaio de restauração. |
| IA | Não há agentes, prompts ou geração editorial neste fluxo. N/A operacional; preservar isolamento. |
| Segurança | Credenciais existentes server-side; não armazenar customerData/CPF/cartão/payload bruto. Token webhook, ownership, grants privados e prova financeira permanecem. Prosseguir com testes de invasão de contrato e permissões. |
| UX/UI | Preço único e prazo claros, fotos/ficha/prévia preservadas. Nova aba Asaas porque o checkout bloqueia iframe. Prosseguir mantendo aba/formulário Vitale e sessão do responsável. |
| CX/Operação | Pagamento pendente, confirmação, suspensão/estorno, pausa, vencimento e reativação precisam distinguir-se. Prosseguir mantendo histórico e sem cancelar compras pagas ao editar. |
| Growth | Sem novas páginas públicas ou alterações de SSR, SEO, Radar e afiliados. Prosseguir com menus públicos ocultos. |
| PMO/QA | Testes de duplicidade, pagamento falso, validade exata, edição, expiração e estorno; validate e restauração escopada. Prosseguir condicionado a esses resultados e à criação/cancelamento de checkout técnico sem pagador. |

Trade-off: contar a partir da publicação evita consumir o prazo durante pendência de identidade. Pausar não congela os 90 dias corridos. Checkout técnico não equivale a pagamento bancário concluído. Não executaremos cobrança real nem inventaremos prova de identidade.

Critérios: R$150 uma única vez; Pix ou cartão no Asaas; nenhum recurso de assinatura; até 90 dias desde primeira publicação; pausa/republicação preservam vencimento; expiração bloqueia vitrine e mídia mesmo antes do cron; estorno/chargeback suspende; callback sozinho nunca libera. Rascunho real e quatro fotos não serão modificados por testes.

Rollback: desabilitar novos checkouts no singleton antes de reverter código; preservar pedidos/pagamentos existentes e tratar direitos já vendidos por correção progressiva. Não voltar ao checkout mensal após vender um anúncio neste modelo. Snapshot privado das funções/configuração e ensaio local antes da migração. Nenhum segredo ou PII entra no Git.

## Evidências e revisão posterior

Validação local concluída antes de qualquer alteração operacional:

- 27 testes direcionados de transporte/integração: token, ownership, contrato estrito sem documentos/preço cliente, uma sessão DETACHED com Pix/cartão, sem subscription/installment/customerData, correlação por checkout e prova financeira GET, Pix provisório, estorno e cancelamento apenas de sessão não paga.
- PostgreSQL 17 restaurado do backup real de nove definições de tabelas e constraints, funções atuais capturadas de produção e dados exclusivamente sintéticos. Migração nova e contratos passaram: 90 dias exatos na primeira publicação; idempotência; edição/republicação no prazo; estorno; bloqueio de mídia; expiração; novo aceite para recomprar; pagamento tardio preserva direito sem publicar; evento antigo não retira publicação paga por compra nova.
- Playwright local: fotos/ficha/prévia, aceite, popup hospedado sem formulário financeiro, Vitale permanece aberta, confirmação simulada, pausa/edição/republicação sem nova compra, SSR e menus ocultos, responsividade, perfil e acesso direto. Nenhum envio real. Evidências locais fora do Git em `outputs/vitale-asaas-90days-2026-11-04`.
- ESLint direcionado sem erros. `pnpm validate`: 66 testes, tipos e builds SSR/client aprovados.

| Perspectiva | Revisão posterior |
|---|---|
| Produto | Pass local: preço único/prazo e republicação com vencimento original. |
| Arquitetura | Pass local: migração aditiva, tag de modelo, fonte autoritativa e expiração sem dependência do cron para entitlement. |
| IA | N/A: nenhum prompt/agente ou decisão financeira por IA. |
| Segurança | Pass local: grants privados preservados, token/ownership, sem dados de pagador, snapshot privado e restore comprovado. |
| UX/UI | Pass local: Pix/cartão no checkout externo, estados claros, edição de compras pagas, vencimento no painel, teste visual mobile e desktop. |
| CX | Pass local: cancelar somente checkout pendente; pausa não cancela compra, estorno suspende; incerteza não gera retry financeiro automático. |
| Growth | Pass: SSR, newsletter, Radar, afiliados e suspensão de abertura pública preservados. |
| PMO/QA | Pass local: contratos direcionados, restore e validate aprovados. Gate operacional permanece desligado até prova técnica do checkout e webhook. |

O produto mensal manual anterior será desativado apenas se nome exato `Anuncie sua Bike`, valor150 e tipo RECURRENT corresponderem a um único link ativo. Outros produtos da conta Hotpipe não serão alterados. O produto vendido pela Vitale passa a ser o item da sessão de checkout individual vinculada ao anúncio. Não há link genérico para atribuir pagamento por e-mail.

Limite: os testes locais simulam a liquidação. O probe real valida criar/cancelar checkout sem pagador e preservar webhook; não testa autorização de cartão nem transferência bancária. Nenhum pagamento real será concluído pelo agente. Pausas consomem os 90 dias corridos. O cron e callbacks não renovam nem criam compra automaticamente.

Ação operacional autorizada: publicar código e migration deste escopo no mesmo projeto; impacto restrito aos classificados. Risco mitigado por gates desligados e restore antes da alteração. Custo: nenhuma cobrança de comprador ou crédito de geração Lovable; somente chamadas de controle da API. Rollback: desabilitar novas compras, preservar direitos pagos e usar correção progressiva; não reinstalar termos mensais.

## Ativação externa

Concluída em 04/11/2026, aproximadamente 15h56 BRT:

- PR #76 integrada normalmente, sem bypass de proteção; main `46900ac92080fc6823be0c115e0f4e0e7457bf2e`. Publicação Lovable `233b36dc-9534-4b25-9849-4d6424ec0b9d`. Código novo servido no domínio próprio, confirmado pela recusa400 do contrato mensal antigo antes de autenticação.
- Migration `20261104200000` aplicada e registrada em transação, inicialmente com novas compras bloqueadas. Grants conferidos: authenticated não reserva pelo serviço e anon não lê a tabela financeira. Cron ativo.
- Probe assinado65888 respondeuHTTP200: sessão anônima aceita com `billingTypes=PIX/CREDIT_CARD`, `chargeType=DETACHED` e itemR$150; cancelada antes de dados de pagador ou pagamento. Webhook existente mantido/atualizado. O provedor confirmou bloqueio de iframe, portanto o checkout abre em nova aba.
- Link mensal manual exato foi desativado; a resposta do provedor confirmou `active=false`. Outros produtos e assinaturas da conta não foram alterados.
- `enabled`, `provider_ready` e `purchase_ready` verdadeiros somente após esse probe. Cinco execuções regulares recentes do worker responderam200. Sem pedido, pagamento ou cliente financeiro criado no banco Vitale durante os testes.
- Um rascunho e quatro fotos reais prontos permanecem intactos; nenhuma escrita de teste no anúncio, perfil ou sessão do responsável. A prova de identidade dessa conta ainda estava pendente na conferência: precisa ser concluída na jornada normal antes de pagar/publicar.
- Home e header públicos continuam sem Entrar/Venda sua bike. Bundles cliente sem nomes de secretsAsaas/service-role. Newsletter preservada.
- Preview Netlify e regra de headers passaram; Pages/Redirect foram skipped. Vercel mantém a falha anterior e não é a hospedagem operacional. Os gates locais e o runtime Lovable do release foram verificados; não se declara que todos os serviços externos estão verdes.

Revisão final: Produto, Arquitetura, Segurança, UX/UI, CX, Growth e PMO/QA **Pass** para implementação e ativação técnica neste escopo; IA **N/A** sem geração ou decisão neste fluxo. Prova de liquidação bancária real continua deliberadamente fora do teste e só ocorrerá quando o responsável concluir uma compra. Abertura pública continua pendente de autorização futura.
