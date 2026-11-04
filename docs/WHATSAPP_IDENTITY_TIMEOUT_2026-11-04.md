# Validação WhatsApp: confirmação tardia do envio

Correção estrutural de integração autorizada pelo responsável ao pedir a jornada real da conta, preservando a compra única de R$150/90 dias e abertura pública suspensa.

Causa comprovada: Hotpipe aceitou e enviou o código em 21,625s (request0f37526f-e374-497b-9ac9-4486654a3a9d, HTTP200, code=sent, provider_id presente, telefone/template correspondentes). A Vitale tinha timeout de12s e não chegou ao ACK privado. E-mail validou normalmente. Nenhum erro de telefone, chave, escopo, conexão ou template foi constatado. Não copiar código, telefone, credencial ou payload bruto neste registro.

## Revisão prévia

| Perspectiva | Impacto/risco/dependência e decisão |
|---|---|
| Produto | Jornada real bloqueada por falso erro de transporte; manter duas provas independentes. Prosseguir. |
| Arquitetura | Aumentar espera Hotpipe para45s mantendo chamada única e idempotência; deploy seletivo da função existente. Prosseguir com teste de resposta após22s. |
| Segurança | Nunca conceder prova por envio. ACK recuperado exclusivamente do recibo oficial correspondente, via writer existente; usuário ainda digita OTP. Prosseguir sem remover grants/gates. |
| UX | Permitir digitação do código recebido mesmo após timeout/reload; erro não atribui falha ao número. Prosseguir. |
| CX | Não reenviar antes de conferir recibo do envio; código antigo pode expirar e requer nova solicitação explícita. Prosseguir. |
| Growth | Newsletter/menus públicos/Asaas não mudam. Preservar. |
| IA | N/A sem modelo ou decisão por agente. |
| QA | Testar resposta22s, ACK incorreto, nenhum retry financeiro/mensagem automática, código só validado pelo usuário, validate e lint. Prosseguir condicionado. |

Trade-off: esperar até45s numa operação pontual é preferível a falhar aos12s enquanto o provedor envia. Continua limitada e sem retry automático; timeout não significa que o envio não ocorreu. Rollback: reverter runtime/UI; nenhum schema ou novo serviço. O recibo legítimo pode registrar entregue, mas somente o OTP correto concede prova.

## Revisão posterior

Pass local:23 testes de identidade/endpoint, incluindo resposta22s com timeout45s e uma única chamada, ACK falso, configuração e token; Playwright mobile/desktop com digitação após reload sem novo envio e todos os fluxos de conta; lint direcionado; pnpm validate (66 regressões, types e builds SSR/client).

Produto, Arquitetura, Segurança, UX, CX, Growth e QA: Pass local com as evidências acima. IA: N/A. Nenhum gate de identidade/compra foi removido. O campo do código fica disponível para quem já o recebeu, mas o servidor continua recusando desafio não entregue, expirado, consumido ou código incorreto.

O ACK do desafio afetado foi recuperado pelo writer privado member_identity_service(delivered), após confrontar no Hotpipe a chave de idempotência, HTTP200, code=sent, provider_id presente e telefone/template exatos. Isso não concede prova do celular nem consome o OTP. E-mail foi efetivamente validado pelo responsável; celular depende de digitação do código por ele.

Implantação: necessária a ferramenta exclusiva Lovable para reimplantar seletivamente member-identity-code com o helper do Git atualizado; não existe CLI autenticada disponível. Operação limitada, custo pequeno de implantação, sem pedido de geração ou mudança de módulo. Não repetir envio real antes dessa publicação e da solicitação do responsável. Não confundir ACK com confirmação no aparelho nem com validação do celular.
