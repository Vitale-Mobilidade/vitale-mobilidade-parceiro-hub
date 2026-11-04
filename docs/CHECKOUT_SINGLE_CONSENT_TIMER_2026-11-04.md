# Pagamento: um aceite, acompanhamento automático e 10 minutos

Mudança estrutural autorizada pelo responsável: unificar contato/veracidade/preço em um aceite, remover atualização manual, CTA idêntico ao iniciar/retomar e contador na Vitale. Preço R$150 único/90 dias e publicação por prova financeira permanecem.

## Revisão prévia

| Perspectiva | Impacto/risco/dependência e decisão |
|---|---|
| Produto | Um aceite explícito cobre publicação/contato e preço/prazo; nenhuma cobrança automática. Prosseguir. |
| Arquitetura | Expiração real do pedido projetada à UI; relógio baseado em deadline persistido, consultas automáticas só de status, sem recriar checkout. API Asaas aceita 10 minutos. Prosseguir sem schema novo. |
| Segurança | Mesmos gates/JWT/ownership, dois flags de backend derivados do mesmo aceite informado; timer/callback nunca provam pagamento. Prosseguir. |
| UX/UI | CTA igual em todos os estados, contagem regressiva/espera visível, fim de prazo claro, sem botão Atualizar. Prosseguir com retorno de aba e reload. |
| CX | Checkout antigo60min não pode receber deadline fictício10min. Encerrar somente sessão antiga não paga, após resposta de cancelamento do provedor; se concluída/paga, preservar. Prosseguir com operação assinada restrita. |
| Growth | Menos fricção sem retirar consentimento; sem lançamento público/newsletter. Prosseguir. |
| IA | N/A sem agentes ou geração. |
| QA | Provar10min no payload e ledger, countdown/expiração sem concessão de acesso, único aceite, polling sem clique, recusa de encerrar pago e falso ACK. Prosseguir condicionado. |

Decisão: novos pedidos10min; status mostra checkoutExpiresAt e horário do servidor. Nenhuma nova cobrança ao terminar o relógio. A única sessão60min identificada é pendente; usar comando interno assinado que cancela no Asaas antes de fechar no ledger, recusando compra paga/modelo novo. Um novo checkout depende de clique e aceite do usuário. Rollback: frontend/API anterior sem tocar compras pagas; manter direitos90dias e fonte autoritativa. Sem dados financeiros do pagador, CPF/cartão ou secrets na UI/Git. Sem migração/RLS.

## Revisão posterior

| Perspectiva | Resultado |
|---|---|
| Produto | Pass: um aceite explícito de publicação, contato, preço e prazo; compra única preservada. |
| Arquitetura | Pass: prazo persistido e horário do servidor; polling de status a cada 5 segundos enquanto pendente, retorno à aba e relógio absoluto. Nenhuma compra é criada por polling. |
| Segurança | Pass: flags e gates mantidos, pagador somente no Asaas; contador/callback não concedem publicação. Cancelamento antigo exige provedor e guarda contra compra paga. |
| UX/UI | Pass: um checkbox, CTA idêntico, sem atualização manual, cronômetro e espera visíveis; expirado sem publicação, botão de retomada oculto após prazo. Inspeção visual mobile. |
| CX | Pass: rascunhos preservados; falha de conexão mantém espera, estado confirmado encerra contador. Prazo antigo não é adulterado. |
| Growth | Pass: fluxo sequencial preservado e nenhuma descoberta pública liberada. |
| IA | N/A: nenhuma mudança em agentes ou conteúdo gerado. |
| QA | Pass: testes direcionados de backend/relógio, ESLint do escopo, UI local interceptada desktop/mobile e pnpm validate (66 testes, tipos e build). Sem mensagens ou pagamento bancário reais. |

As simulações de UI comprovam confirmação automática, único aceite, CTA inicial/retomada, término do prazo sem concessão de acesso e pausa/edição/republicação no período pago. Não são evidência de pagamento bancário real. O teste de transporte Asaas e o payload validam o prazo solicitado; o checkout real seguinte depende de ação do usuário.

Publicação: proposta restrita a estes componentes/serviços/testes; sem migração, RLS, secrets ou alterações de anúncios. Risco principal: sessão antiga continuar aberta; operação interna somente cancela se ainda não paga e o provedor aceitar. Custo: build/hosting existente, sem nova cobrança, mensagem ou uso de agente Lovable. Rollback: reverter o commit de runtime; não apagar ledger nem direitos pagos.


## Evidência de release

- Runtime: PR #85, commit de merge `a998835b48543049aa04ba4e08b960a686e11a5b`, deploy Lovable `65c05d5b-f6f8-4933-9d8d-19e0800aec13`.
- Bundle público de `vitalemobilidade.com/conta/anuncios?retorno=%2F&release=waiting85`: `conta_.anuncios-CR5PV4Ss.js`, contém `payment-countdown` e CTA solicitado; não contém “Atualizar pagamento”. Conferência também no domínio Lovable.
- Comando interno assinado com ID inválido retornou HTTP400/invalid_input, comprovando versão nova do backend sem criar cobrança.
- Sessão antiga de 60 minutos: Asaas aceitou cancelamento (HTTP200/retired:true); ledger confirmou cancelled, sem paid_at e sem publish_requested. Nenhum checkout substituto foi criado. Próximo clique explícito do usuário cria sessão de 10 minutos.
- Netlify preview e headers passaram; Vercel permanece falha de baseline fora do hosting operacional, sem bypass de proteção.
- Sem pagamento bancário realizado pelo agente. Rascunho e fotos não foram editados por esta operação. Divulgação pública segue retida.
