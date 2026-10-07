# Newsletter Vitale — 07/10/2026

Classificação: estrutural (integração de e-mail, Radar e dados de inscritos). Projeto operacional: vitale-mobilidade-parceiro-hub; checkout de referência não substitui Lovable. Implementação isolada em /tmp/vitale-newsletter-admin, base 9215eeb.

## Revisão prévia

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
|---|---|---|---|---|
| Produto | Newsletter própria separada de Hotpipe | Excesso de frequência | Conteúdo publicado | Duas edições, segunda/sexta às 10h São Paulo; quarta só após avaliação |
| CTO | Compositor administrativo usa leitores existentes | MCP do chat não é credencial do runtime | Canal de envio verificado | Preparar compositor; não simular conexão automática |
| IA | Seleção determinística de conteúdo real | Inventar preço ou publicação | Fontes existentes | Sem geração de fatos; revisão editorial |
| Segurança | Remetente provisório e consentimento | Spam, exposição de inscritos, links inseguros | Supressão e autenticação do domínio | Sem contatos no navegador neste corte; envio bloqueado |
| UX | Newsletter curta e prévia | Texto longo e editor confuso | Quatro blocos | Até 2 artigos, 1 bike, 2 vídeos e CTA Radar |
| CX | Rotina de composição/exportação | Duplicatas e resultado incerto no envio | Provedor e fila persistente | Draft primeiro; envio com conciliação futura |
| Growth | Retenção e cliques em conteúdo | Reputação Hotpipe contaminada | SPF/DKIM/DMARC e descadastro | Campaigns preferencial, CRM só após confirmar elegibilidade/limites |
| PMO | Corte local verificável | Confundir preparado com publicado | pnpm validate | Release separado; sem disparo real |

## Conflitos e decisão

Três edições aumentam distribuição, mas reduzem respiro e exigem novidade: iniciar com duas, intervalo mínimo de 72h por inscrito. Horário é hipótese editorial, não garantia de entregabilidade. Espaçar envios não contorna política do Zoho Mail. A política oficial restringe bulk/burst; CRM possui canal próprio de mass mail e limites por edição. Remetente guilherme@hotpipe.com.br confirmado pela leitura ZohoCRM_getFromAddresses, mas isso não prova plano, autenticação de domínio, quota disponível ou autorização do canal para newsletter.

Escopo deste corte: compositor em /admin/newsletter, seleção dos leitores públicos existentes, assunto/abertura editáveis, limites curtos, prévia e exportação HTML/texto, correção de dois links internos que causam recarga completa. Sem alteração de autenticação, RLS ou base de inscritos. Aceite: conteúdo publicado, links HTTPS aprovados, escape HTML, export sem envio, route noindex, testes direcionados e validate. Rollback: reverter novos arquivos e links; nenhuma escrita externa. Rascunho apenas em memória; exportar para conservar. Automação e persistência de campanha ainda dependem do transporte confirmado.

## Modelo editorial

Segunda: `Vitale na semana: leituras, bike e Radar`. Abertura: `Olá! Separamos duas leituras, uma bike para conhecer e os vídeos recentes. Confira os destaques e consulte o Radar antes de decidir.`

Sexta: `Vitale no fim de semana: bikes e vídeos para conferir`. Abertura: `Olá! Aqui estão os destaques para acompanhar com calma no fim de semana. Os preços podem mudar: confira a oferta vigente no Radar.`

Corpo: 2 artigos (título/link), 1 CTA Radar, 1 bike com link para /radar/ID, até 2 vídeos recentes (não chamar de “da semana” sem data no período). Rodapé com identidade Vitale, explicação do remetente provisório e descadastro fornecido pelo canal. Não exportar HTML pronto para disparo sem descadastro HTTPS válido.

## Integração e automação seguinte

MCP conectado é Zoho CRM. O painel precisa de OAuth server-side próprio; conexão MCP não é herdada pelo site. Canal preferencial: Zoho Campaigns com remetente verificado, sem contratar automaticamente. Alternativa CRM: verificar mass-mail config, edição, limites, unsubscribe e elegibilidade dos inscritos sem adicionar newsletter a toda a base de leads. Não usar SMTP de Mail como fila de marketing.

Fila persistente: campanhas draft → reviewed → scheduled → sending → sent/paused; revisão congela seleção e conteúdo; ledger único campaign/subscriber; consentimento vigente e supressão conferidos imediatamente antes da entrega; reservas com lease; timeout incerto exige conciliação antes de retry. Provider 429 respeita Retry-After; hard bounce, complaint e opt-out suprimem próximas entregas; quota considera envios já usados por outras funções da conta. Autorização específica da campanha e destinatários antes do primeiro envio real. Intervalo entre destinatários depende do canal e quota real, não de um número inventado de segundos.

Automação editorial pode montar drafts segunda/sexta; envio automático só depois de transporte, consentimento/descadastro, homologação e autorização do escopo. Hotpipe permanece responsável pelo alerta de preço.

Fontes: https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html ; https://www.zoho.com/mail/help/usage-policy.html ; https://help.zoho.com/portal/en/kb/crm/connect-with-customers/email/email-limits-and-availability/articles/email-limits

## Ajuste após confirmação de Marketing Automation existente

O usuário informou que já possui Marketing Automation. Decisão revisada: reutilizar Zoho Marketing Automation existente como transporte; não contratar Campaigns nem construir SMTP pessoal como disparador. Remetente/resposta continua Guilherme, condicionado à verificação no Marketing Automation (CRM já confirmou endereço).

A API oficial createCampaign recebe content_url, remetente, assunto, listas/segmentos e topicId quando aplicável. HTML por edição/segmento será congelado e exposto ao importador sem dados pessoais; autenticação da integração fica no backend. Atenção: listas têm precedência sobre segmentos quando ambos são enviados; integração deve escolher apenas o destino verificado. API sendcampaign agenda/envia, mas pode devolver bloqueio por conteúdo não revisado ou alteração após revisão. Não prometer envio autônomo irrestrito; respeitar revisão real da conta, conciliar status e avisar responsável quando bloquear.

Implementado neste corte: exportação específica Zoho com FIRSTNAME e fallback, LI:UNSUBSCRIBE e HF:ORGADDRESS. Não exige inventar URL individual de descadastro; Zoho resolve tags no envio. Export genérico continua exigindo URL HTTPS. Regra pura de audiência em três grupos exclusivos: interesse Radar, conteúdo, geral; sem consentimento ou suprimido é excluído (inclusive duplicata conflitante), respiro mínimo 72h, data inválida bloqueada. Essa regra está testada, ainda não conectada aos inscritos reais nem a listas Zoho. Não há evidência de preferências cadastradas; geral é padrão, nenhum interesse inferido.

Fontes adicionais: https://www.zoho.com/marketingautomation/help/developers/v1/create-campaign.html ; https://www.zoho.com/marketingautomation/help/developers/v1/schedule-campaign.html ; https://help.zoho.com/portal/en/kb/marketing-automation-2-0/user-guide/settings/general-settings/articles/default-fields-and-merge-tags

## Revisão posterior do corte local

| Perspectiva | Status | Evidência/limite |
|---|---|---|
| Produto | Pass | Duas edições, quatro blocos; preferência atual Marketing Automation incorporada |
| CTO | Pass | Reuso leitores existentes; sem novo writer; MCP separado de OAuth do site |
| IA | Pass | Conteúdo real selecionado deterministicamente; sem fatos/preços gerados |
| Segurança | Pass | Escape/URLs validados; sem lista real exposta; export sem transporte; tags oficiais |
| UX | Pass | Editor rotulado, prévia editorial, loading/erro/export; noindex; QA visual em cliente de e-mail ainda requerida para envio |
| CX | Pass | Estados explícitos de rascunho em memória e envio não conectado; export HTML/texto |
| Growth | Pass | Nome/descadastro personalizados via tags; opt-in/supressão/72h testados |
| PMO | Pass | 5 testes direcionados; pnpm validate aprovado (typecheck, 59 testes do gate e build); patch isolado |

Estado: compositor e política de segmentação local preparados. Não publicado, lista real não segmentada, OAuth Marketing Automation não conectado, cron/ledger não implementados, nenhum envio real. Este corte é preparatório e não cumpre ainda a operação automática completa solicitada. Autenticação administrativa preservada; dois anchors internos convertidos em Link para evitar recargas integrais, sem alegação de resolução de toda a lentidão. Revisão posterior aprova somente corte local, não release de newsletter operacional. Pendências de ativação: acesso Marketing Automation, domínio/remetente/topic/lista/limites verificados, consentimento/supressão persistente, integração OAuth/ledger, teste de entrega e layout, política de revisão Zoho e aprovação do lote inicial. Custo externo significativo: nenhum. Rollback: reverter patch, sem migração nem alteração de dados.
