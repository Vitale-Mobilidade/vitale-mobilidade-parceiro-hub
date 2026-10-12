# Geração editorial: bikes e avisos — 12/10/2026

Classificação: estrutural (IA, Sheets, Supabase e integração de e-mail).

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Seleção opcional também no modo planilha; evitar bloqueio sem saída; catálogo existente; prosseguir. |
| CTO | Contrato mantém bikes opcionais; validar antes de capturar; preservar reserva exclusiva; prosseguir condicionado. |
| IA | Nomes não resolvidos na planilha exigem detecção por título/transcrição; nunca escolher variante ambígua; detector existente; prosseguir condicionado. |
| Segurança | Destinatário apenas configuração do servidor ou dono autenticado; credenciais privadas; sem conteúdo da transcrição no email; prosseguir. |
| UX | Seletor sempre disponível e instrução de prioridade; primeira principal; prosseguir. |
| CX | Avisar intervenção com link e motivo; falha de envio visível em logs; Resend configurado; prosseguir condicionado. |
| Growth | Preservar grounding e gates de publicação; nenhum novo link afiliado; prosseguir. |
| PMO | Testar precedência, fallback, validação e email com mocks; nenhuma publicação; prosseguir. |

## Decisão consolidada
Escolha manual prevalece sobre planilha. Vazio usa planilha resolvida ou detector de título/transcrição quando incompleta. Validar IDs antes de captura. Aviso transacional por Resend ao responsável nos estados de conferência, com chave de idempotência por vídeo. Não enviar emails durante desenvolvimento. Não reprocessar resultados pagos incertos.

Trade-off: reduzir bloqueio excessivo da planilha sem retirar proteção de ambiguidade do detector. Email requer credenciais, remetente e destinatário de servidor; falha não pode apagar resultado editorial. Fora de escopo: deploy, migração produtiva, geração paga e retomada de jobs com resultado incerto. Rollback: reverter commit; nenhuma migração.

Critérios: seletor disponível nos dois modos; IDs manuais validados; vazio mantém automação; avisos sem secrets ou transcrição; testes direcionados e pnpm validate.

## Configuração do aviso
- `RESEND_API_KEY`: segredo de servidor já utilizado pela newsletter; verificar disponibilidade também na Edge Function.
- `LOVABLE_API_KEY`: quando presente, usar gateway do conector Resend, como o serviço existente.
- Destinatário fixo de servidor: `guilherme@hotpipe.com.br`, conforme autorização de 12/10/2026; não depende de quem dispara a geração.
- `EDITORIAL_ALERT_FROM`: remetente verificado opcional. Sem ele, usar `newsletter_settings.from_email`.
- Avisos incluem motivo, vídeo e link para resolver no Admin, sem transcrição ou erro bruto do provedor. Idempotência por vídeo evita duplicações dentro da janela do Resend (24h). Sem retry cego após timeout. `editorial_alert_failed` registra configuração ausente ou falha de entrega; `editorial_alert_sent` significa aceitação pelo provedor, não comprovação de recebimento na caixa postal.
- Disparar ao entrar em conferência na geração, reescrita, capa, renderização ou publicação. O bloqueio antigo da planilha foi substituído por detecção de título/transcrição; falha posterior continua preservando fonte e artigo.
- Retomada de rascunho vazio por `article_bike_ambiguous` só é aceita com seleção manual validada, todos os runs conhecidos como rejeitados, captura original conferida e claim exclusivo. Runs incertos continuam bloqueados.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Escolha manual opcional nos dois modos, com prioridade. |
| CTO | Pass | Reserva exclusiva preservada; nenhuma migração; fallback com contrato testado. |
| IA | Pass | Detector existente mantém ambiguidade; escolha manual validada; sem replay de runs incertos. |
| Segurança | Pass | Credenciais e destinatário no servidor; envio somente após autenticação/worker assinado; mocks sem conexões externas. |
| UX | Pass | Seletor fora da condição de modo planilha; texto explica detecção e prioridade da primeira bike. |
| CX | Pass | Email transacional com motivo e link, falhas registradas; entrega testada por mock. Ativação depende de configuração e verificação real autorizada. |
| Growth | Pass | Gates editoriais preservados, nenhuma mudança em SEO ou afiliados. |
| PMO | Pass | 86 testes direcionados; gate validate; rollback por reversão. |

Estado: implementação local, sem publicação, envio real ou consumo de créditos. Condição de release: revisar diff e confirmar configuração Resend/remetente/destinatário na Edge Function; autorização específica para deploy. Risco residual: não há prova de entrega em produção; email depende da disponibilidade do provedor e configuração. Alertas são operacionais, não newsletter.

## Autorização e extensão de release
Usuário autorizou implementar/publicar a correção e gerar/publicar o artigo yrsgUwKBYk0 pelo sistema existente, com custos de texto/capa/QA próprios desse fluxo. Destinatário definido explicitamente: guilherme@hotpipe.com.br. Escopo inclui erros de geração/regeneração no Admin. Banco confirmado: ainda não existe artigo nem fonte reservada para esse vídeo; catálogo distingue Ouxi GT20 de Coswheel GT20. Para este artigo selecionar v40_pro, ft03 e ouxi_gt20 usando a descrição apresentada pelo usuário. Nenhuma migração, alteração de RLS ou geração em massa. Rollback do código: base 84cbe815; artigo pode voltar a draft pelo Admin.
