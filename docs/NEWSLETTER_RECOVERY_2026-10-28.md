# Recuperação da newsletter — 28/10/2026 (#8)

## Causa
A preparação da edição #8 parou com `newsletter_offer_unavailable`: a variante V9 Max S, citada em um bloco opcional, não tinha oferta ativa no Radar no momento da validação final. A trava de envio bloqueou corretamente a edição.

## Correção da #8 (já enviada)
- Recuperação pontual autorizada e registrada em `editorial_audit_logs`.
- Campanha `3d6df1cb-7dd0-4344-b9cc-491d28d636d5`, Resend `fc32153b-6adf-42df-a382-9e71fff4523e`.
- 69 entregas, 0 falhas (informado pelo responsável a partir do Resend).

## Escopo preventivo do patch
- Antes de congelar a campanha, `recoverNewsletterAvailability` remove apenas blocos opcionais que deixaram de ser elegíveis (artigos, vídeos, drops), sem chamar modelo nem criar texto.
- Mínimo exigido: 1 artigo, 1 vídeo e bike principal elegível; caso contrário `newsletter_recovery_insufficient_content`.
- Conteúdo rejeitado continua bloqueado; fontes ou provedor indisponíveis geram `newsletter_sources_unavailable` e alerta.
- Draft recuperado é salvo por CAS de revisão com novo fingerprint.
- Tema de filmagem/bastidores fica fora da curadoria e da validação de entrega.
- Alerta de erro (`notifyNewsletterError`) para o mesmo responsável dos artigos, um por edição/erro, com nova tentativa após 10 minutos e mesma chave de idempotência.
- Sem mudanças em reconciliação/incerteza, consentimento, links, agenda, schema, RLS ou dados.

## Revisão
Oito perspectivas (Produto, CTO, IA, Segurança, UX/UI, CX, Growth, PMO/QA): Pass, conforme gate local do responsável.

## Testes
Nove arquivos direcionados de newsletter e `pnpm validate` (regressões, tipos e build), executados neste ambiente após aplicar o patch.

## Autorização
Responsável: "Sim, aplicar e publicar a correção" (28/10/2026). Publicação feita pelo responsável após revisão do diff.

## Rollback
Restaurar o código `6ea3d210b04c88edce9a232aab91b5043f840595`, preservando ledger, campanhas, consentimento e dados.
