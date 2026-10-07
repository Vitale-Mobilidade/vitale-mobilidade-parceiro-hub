# Inspeção da conexão Resend "My Resend" (somente leitura)

## Resultado da inspeção (já verificado nesta sessão)

- Conexão: **My Resend** (`std_01m4bze58febgaxk39p57y9jpd`), conector `resend`, auth `api_key`, **usa connector gateway: true**.
- **Vinculada a este projeto: não** (`is linked to project: no`).
- **Acesso do usuário atual: não** (`has access: no`) — a conexão é privada no workspace e o usuário atual não tem permissão; `linkable: yes` indica que pode ser vinculada depois que o acesso for concedido.
- Nenhuma chave foi lida, exibida ou copiada. Nenhum código, recurso, secret, SQL ou e-mail foi alterado/enviado.

## Mecanismo que o servidor TanStack usaria (contrato real)

Como a conexão é **gateway-backed**, o servidor TanStack (server function / rota `src/routes/api/`) chamaria a API Resend **via connector gateway**, não com uma chave Resend direta:

```text
POST https://connector-gateway.lovable.dev/resend/<endpoint-resend>
Headers:
  Authorization: Bearer ${LOVABLE_API_KEY}        (secret de servidor)
  X-Connection-Api-Key: ${RESEND_API_KEY}         (secret injetado ao vincular)
```

- Após vincular (`standard_connectors--connect`), os secrets `LOVABLE_API_KEY` e `RESEND_API_KEY` ficam disponíveis apenas no runtime de servidor (`process.env` em server functions) — nunca no frontend nem em `VITE_*`.
- O gateway repassa a API inteira do provedor; portanto **Broadcasts, Contacts, Segments (Audiences) e Usage** são alcançáveis pelos paths documentados da Resend (ex.: `/broadcasts`, `/contacts`, `/audiences`, `/usage`), não apenas `/emails` transacional.
- Não há suporte nativo de Broadcasts no serviço transacional de Emails do Lovable — a newsletter precisa mesmo desta conexão gateway.

## Pendência que exige ação do usuário (fora deste plano)

1. O responsável (dono da conexão) precisa **conceder acesso** ao usuário atual nas configurações da conexão no workspace (seção de permissões da conexão "My Resend"), ou vinculá-la ele mesmo.
2. Depois, vincular ao projeto: `standard_connectors--connect` com `connector_id=resend`, `connection_id=std_01m4bze58febgaxk39p57y9jpd`.

## Plano (quando o acesso for concedido e a implementação for autorizada)

1. Vincular a conexão ao projeto via `standard_connectors--connect` (sem criar nova conexão).
2. Confirmar com `fetch_secrets` a presença booleana de `RESEND_API_KEY` (sem exibir valor).
3. Implementar server function TanStack para newsletter usando o gateway com os paths Resend de Broadcasts/Contacts/Audiences, validação de entrada e tratamento de erros do provedor (status + corpo).
4. Testes dirigidos e `pnpm validate`; sem envio real de e-mails sem autorização explícita.

## Fora de escopo

- Editar código, criar recursos, ler/exibir chaves, alterar sharing/roles/secrets, enviar e-mails, publicar frontend ou aplicar SQL — nada disso será feito nesta etapa.
