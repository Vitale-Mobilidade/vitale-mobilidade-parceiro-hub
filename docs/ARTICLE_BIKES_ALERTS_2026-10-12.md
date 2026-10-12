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
| PMO | Pass | 87 testes direcionados; gate validate; rollback por reversão. |

Estado: implementação local, sem publicação, envio real ou consumo de créditos. Condição de release: revisar diff e confirmar configuração Resend/remetente/destinatário na Edge Function; autorização específica para deploy. Risco residual: não há prova de entrega em produção; email depende da disponibilidade do provedor e configuração. Alertas são operacionais, não newsletter.

## Autorização e extensão de release
Usuário autorizou implementar/publicar a correção e gerar/publicar o artigo yrsgUwKBYk0 pelo sistema existente, com custos de texto/capa/QA próprios desse fluxo. Destinatário definido explicitamente: guilherme@hotpipe.com.br. Escopo inclui erros de geração/regeneração no Admin. Banco confirmado: ainda não existe artigo nem fonte reservada para esse vídeo; catálogo distingue Ouxi GT20 de Coswheel GT20. Para este artigo selecionar v40_pro, ft03 e ouxi_gt20 usando a descrição apresentada pelo usuário. Nenhuma migração, alteração de RLS ou geração em massa. Rollback do código: base 84cbe815; artigo pode voltar a draft pelo Admin.

## Evidência de produção (16h, 12/10/2026)
- Código d5f0ce3 sincronizado e função editorial-admin implantada pelo conector Lovable; hash enviado afcef9f3710f6349c703b1f2e68ef415a235319bfd284c7960a2febe43e02c78. Credenciais RESEND_API_KEY/LOVABLE_API_KEY confirmadas disponíveis pelo ambiente; nenhum segredo exibido.
- Lovable corrigiu apenas narrowing de previousQa em c6002f0 (base 6abd56f), sem mudança semântica. Diff revisado; 80 testes de backend/política/email e pnpm validate passaram após fast-forward. Backend ativo ainda contém a expressão equivalente de d5f0ce3; frontend publicado pelo UI, confirmação "Seu site foi atualizado". API anterior retornou deployment pending 1830e2b3-bbca-4ba8-aea1-7424448bb154; confirmação efetiva de publicação veio da UI.
- Smoke Admin: seletor permanece visível com modo planilha habilitado; seleção V40 Pro, FT03, Ouxi GT20 confirmada visualmente.
- Worker automático detectou ambiguidade GT20 às 16:17 e salvou rascunho vazio f32286de-4d47-4280-9cc7-59a4719c027b; run failed article_bike_ambiguous. Log editorial_alert_sent às 16:17:04 comprova aceitação do email real pelo provedor; não comprova caixa de entrada.
- Retomada pelo Admin com seleção manual validada aproveitou captura original preservada e gerou artigo, revisão 2, título "V40 Pro, Mangosteen FT03 ou Ouxi GT20: qual combina mais com seu uso?". Não houve artigo duplicado nem redação manual.
- Finalização via fila existente (drain a cada minuto): cover_render_pending no último checkpoint; publicação depende do QA automático, sem bypass.

## Fechamento de release — publicado
O estado local/pendente registrado acima é histórico. Artigo f32286de-4d47-4280-9cc7-59a4719c027b publicado pelo worker oficial, revisão 4, source state=done, publicationQa.pass=true e issues=[]. URL: https://vitalemobilidade.com/conteudos/v40-pro-mangosteen-ft03-ou-ouxi-gt20-qual-combina-mais-com-seu-uso . Sem publicação manual por SQL ou bypass de QA.

Smoke público: GET 200, H1 e conteúdo em SSR; canonical exato; robots index/follow; title/description/OG específicos; 3 JSON-LD; artigo presente no sitemap; robots.txt permite crawler geral. Links HTML para as três bikes canônicas, Quiz e Ferramentas. UI pública confirmou data 12/10/2026, título, capa salva com as três bikes e sidebar correta. Revisor automático aprovado e fonte preservada. Skill vitale-seo-ia aplicada ao gate Growth; não houve solicitação de indexação nem alegação de ranking.

Matriz final: Produto Pass (pedido implementado); CTO Pass (fluxo e reservas reais); IA Pass (geração e QA automático reais); Segurança Pass (auth 403 anônima, nenhum segredo exposto); UX Pass (seletor real e página pública); CX Pass (alerta real aceito para Guilherme, estado final done); Growth Pass (SSR/metadata/canonical/sitemap/jornadas); PMO Pass (87 testes dirigidos iniciais, 80 após narrowing, pnpm validate aprovado no código final e smoke público). Risco residual: serviço de email confirmou aceitação, recebimento na caixa de entrada não foi verificado; sem promessa de indexação/ranking. Task concluída e release autorizado.
