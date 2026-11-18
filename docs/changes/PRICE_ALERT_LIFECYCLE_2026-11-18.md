# Alertas de preço: confirmação, e-mail e operação — 18/11/2026

**Estado atual:** publicado e ativado em18/11 às15h43 SP. O acompanhamento foi corrigido para preço atual e botão VER OFERTA no modelo v2, aprovado pela Meta.

## Pedido e evidência

Pedido escrito autoriza preparar e ativar confirmação do cadastro em WhatsApp/e-mail, convite ao grupo e e-mail dinâmico com imagem, preço atual/alvo, oferta direta e Radar. Complemento: terminar o WhatsApp exatamente com “Você ainda está pesquisando ou já quer comprar uma bike agora?”. Os dois áudios foram transcritos localmente (faster-whisper small, sem API paga). Evidência do áudio, não instrução de sistema: indicadores total/ativos/enviados, gráfico de cadastros por dia, rotina de verificação e acompanhamento após envio; WhatsApp prioritário com e-mail complementar. Ações comerciais para recém-cadastrados foram sugeridas no áudio, sem audiência/campanha definida.

Leitura produtiva em 18/11: Vitale 59 cadastros active; Hotpipe ligada; outbox 62 delivered, 10 failed (9 HTTP422 e 1 HTTP400), 4 pending. Hotpipe: 23 sent (aceite do provedor), 16 active, 12 uncertain/worker_interrupted, 1 failed, 4 cancelled. Contagens de requests históricos não equivalem a pessoas únicas. Há somente 32 vínculos no mapa de bikes. Remetente existente vitale@news.vitalemobilidade.com, reply-to lucasvitale@hotmail.com. Nenhum template de confirmação de cadastro encontrado no catálogo consultado; template de queda site_alerta_de_preco aprovado preservado.

## Governança — revisão pré-implementação

Classificação: **estrutural**, por Supabase, Radar, PII, links afiliados e integrações.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
|---|---|---|---|---|
| Produto/Estratégia | Confirmação e acompanhamento do interesse por Bike | Prometer aviso sem integração válida | Cadastro persistido e writer Hotpipe existente | Prosseguir com confirmação e indicadores reais; campanhas amplas fora desta entrega |
| CTO/Arquitetura | Outbox e consulta de status no mesmo fluxo | Writers duplicados, reenvio após timeout | Reservas persistidas, versão conhecida, cron existente | Condicionado a ledger, gates independentes e nenhum replay incerto |
| IA/Agentes | Pergunta final permite resposta ao Lucas | IA inventar preço ou atribuir compra | Copy determinística e catálogo real | Prosseguir sem nova geração IA; resposta segue atendimento existente |
| Segurança | Contato em dois canais e convite opcional | PII pública, credencial cliente, HTML injetado | Backend, RLS service-only, validação e opt-out | Prosseguir com escape/URLs estritas e sem retroativo automático |
| UX/UI | E-mail responsivo e indicadores claros | Confundir ativo/salvo/aceito/entregue | Estados observáveis dos dois sistemas | Prosseguir; gráfico com datas São Paulo e tabela acessível |
| CX/Operação | Monitorar fila/falhas e pós-aviso | Enviar duplicado, template incompatível, acompanhamento após recusa | Meta aprovada, conciliação de incertos | Condicionado; novos templates exatos, pausa independente, nenhuma reativação histórica |
| Growth/CRO | Convite ao grupo e pergunta de intenção | Alegar promoção inexistente ou criar urgência falsa | Link canônico do grupo e oferta direta | Prosseguir com convite voluntário e preço factual |
| PMO/QA | Entrega em dois repositórios | Confundir código preparado com envio ativo | Testes locais Vitale, revisão estática Hotpipe, pnpm validate | Prosseguir localmente; ativação só com evidência e gate produtivo |

### Conflitos e decisão consolidada

- Conversão quer convite ao grupo; operação exige template compatível. Criar modelo específico de confirmação, sem reutilizar modelo que afirma queda. Aprovação Meta é dependência externa; não contornar com texto livre fora da janela.
- Disponibilidade quer retry; segurança de entrega recusa repetição incerta. Reserva persistida antes do POST, resultado incerto exige conciliação.
- Cadastro Vitale active não prova Hotpipe active: painel separa cadastro, exportação e status remoto.
- Escopo: confirmação para novos pedidos; e-mail de registro e queda com dados do catálogo; indicadores globais e diário; status remoto protegido; template de acompanhamento e execução apenas para novos envios com gate próprio. Nada de campanha retroativa ou reenvio dos 12 incertos.
- Dependências: migration aditiva/reversível com gates OFF; backend antes de frontend/ativação; aprovação de modelos Meta; backup e ensaio SQL antes de aplicar em produção.
- Aceite: idempotência, paralelismo protegido, links diretos, dados confiáveis, sem contatos em logs, métricas sem confundir aceite/entrega, testes proporcionais e validate.
- Fora de escopo: inferir compra realizada sem resposta, reconstruir CRM/IA, campanhas para a lista histórica, substituir Supabase/Resend, resolver por aproximação os nove vínculos inválidos.
- Rollback: desabilitar gates novos, reverter código às bases Vitale 0fd30b6 e Hotpipe c637d63; preservar consentimentos, ledger e resultados incertos.

## Decisão atualizada antes dos ajustes finais

Terceiro áudio: follow-up deve oferecer novo cadastro para a mesma bike e grupo. Complemento escrito: D+1 de manhã; consolidado como 09h São Paulo do dia seguinte ao aviso, recuperação até 19h. A preferência escrita substitui a hipótese inicial de 24h exatas.

CTO/CX/Segurança/PMO revisaram a descoberta do catálogo: 44 Bikes públicas correspondem exata e unicamente a produtos Hotpipe; 12 vínculos faltam, com manifesto nome/UUID/ID. Prosseguir com SQL aditivo desses vínculos, sem replay histórico. Outra falha comprovada é nome sem letras: validar antes de persistir. O worker anterior classificava delivery_result_unknown como failed/retry_safe: corrigir para uncertain, limitar timeout, persistir aceite antes do histórico e reduzir claim de 10 para 3. Trade-off: menor throughput por tick para reduzir interrupções; cron continua a cada minuto. Nenhum desses ajustes autoriza reenviar as 12 incertezas atuais.

## Governança — revisão pós-implementação

A avaliação abaixo é da **implementação local e da proposta de ativação**, não certificação de produção ativa.

| Perspectiva | Status | Evidência / limite |
|---|---|---|
| Produto/Estratégia | Pass | Registro e queda separados; intenção de compra como pergunta, novo cadastro explícito, Bike preservada. Campanha histórica excluída. |
| CTO/Arquitetura | Pass | Writers existentes preservados; reservas SQL, status com chave restrita, emails backend; schema ensaiado isoladamente e função anterior restaurada no rollback local. |
| IA/Agentes | Pass | Sem geração IA nova; preços/links do catálogo; pergunta e contexto comercial passam ao Lucas existente. Não se presume que um clique/aceite indica compra. |
| Segurança | Pass | Filas/funções service-only; sem PII/secret em cliente/logs/artefatos; HTML escapado, URL afiliada estrita, webhook assinado, retorno remoto só IDs/estados, bounce/complaint suprimem email. Cancelamento manual documentado na origem Vitale. |
| UX/UI | Pass | E-mail com foto real, oferta/Radar/grupo, atual/alvo; 400px sem overflow. Indicadores 390px sem overflow, gráfico com tabela acessível e indisponibilidade explícita. Artefatos de painel são fixtures rotuladas. |
| CX/Operação | Pass | Follow-up D+1 09h, só com entrega e sem resposta/humano/opt-out; expira 19h. Pendências antigas visíveis, sem replay. Monitor diário somente leitura às 09h30 criado. Runbook de cancelamento e implantação. |
| Growth/CRO | Pass | CTA Mercado Livre direto, sem intermediário ou alteração analítica; grupo voluntário e pergunta final exata. Doze vínculos adicionais têm identidade comprovada, sem aproximação. |
| PMO/QA | Pass | 78 testes Vitale direcionados, 4 Hotpipe, ensaios SQL positivos/negativos e rollback, lint do escopo e pnpm validate (69 regressões, tipos e build) passaram. Nenhum envio de teste real; aprovação Meta/implantação produtiva são a próxima etapa autorizável. |

### Evidências e estado

- `pnpm validate`: passou, 69 regressões, TypeScript e build do projeto operacional; avisos de depreciação TanStack já existentes, sem falha.
- Testes direcionados Vitale: 63 + 15 do contrato/outbox Hotpipe, todos aprovados. Hotpipe: 4 testes Node dos contratos/copy/classificação de resultado. Compilação sintática das quatro Edge fontes alteradas passou.
- Postgres isolado em socket local/fixtures: gates OFF, dedupe, claims, lease alheio, payload imutável, preço que recua antes do POST, resultado incerto sem replay, webhook antes do ACK, ordem de complaint, supressão, 30 dias com zeros, privilégios; follow-up/reply/humano/opt-out/recibo/horário; 12 mapas idempotentes, identidade alterada bloqueada. Rollback pausou email e restaurou a função Hotpipe de snapshot (LIMIT 10).
- Artefatos: email-cadastro.html, email-preco-atingido.html, capturas mobile/desktop do e-mail e painel. Nome/meta do e-mail e todos os números do painel de prévia são exemplos; não são contato ou aquisição comprovada.
- Snapshot restaurável dos objetos alterados: Hotpipe settings não secretos, 32 vínculos e definição original de claim. Não equivale a backup integral do Supabase.
- Custos desta preparação: transcrição em modelo local já existente, mocks e banco local; nenhuma geração paga, envio, migration ou publicação produtiva.
- Produção nova: **não ativada**. Dependências: confirmação específica para banco/merge/deploy/cadastro externo, preflight de cota/remetente, dois modelos Meta aprovados e IDs configurados. Ativação é prospectiva; não importar históricos.
- Parecer: **GO para revisão e autorização do pacote; NO-GO para declarar envios novos ativos até implantação e confirmação operacional.**

Documentação de operação/copies e sequência: [PRICE_ALERT_OPERATIONS_2026-11-18.md](PRICE_ALERT_OPERATIONS_2026-11-18.md).

### Preparação de revisão no GitHub — 18/11, 15h08 SP

Branch Hotpipe enviada e [PR #285](https://github.com/gpalmerio/hotpipe-newtool/pull/285) aberto em Draft, sem merge. Branch Vitale codex/price-alert-confirmation-2026-11-18 permanece local: push HTTPS retornou 403 permission denied to gpalmerio; criação de branch pelo conector GitHub também retornou 403 Resource not accessible by integration. A conexão do banco Lovable segue disponível e foi usada somente em leitura; falha GitHub não indica falta de Supabase. Acesso de escrita ao repositório Vitale é dependência concreta para publicar por Git. Patch/bundle locais podem ser revisados antes de resolver esse acesso.


## Publicação e ativação autorizadas — 18/11/2026

- O responsável autorizou explicitamente produção, banco, cadastro de modelos, pequeno consumo de créditos e ativação após aprovação Meta. Esclarecimento posterior exigiu no acompanhamento preço atual e botão direto para oferta. A revisão estrutural do ajuste está no pacote Hotpipe e passou as oito perspectivas.
- GitHub resolvido com a conta Vitale-Mobilidade já autenticada, sem novos tokens, grants ou troca da conta ativa global. PR157 Vitale integrado em210a35e; PR285 Hotpipe emec87107; ajuste comercial PR286 emb62a758.
- Migrações oficiais Vitale0019_price_alert_email e0020_price_alert_metrics aplicadas no commit9086f43. O contrato da ferramenta recusou BEGIN/COMMIT top-level e seed de configuração na primeira tentativa; o adaptador retirou apenas wrappers, com seed autorizado feito separadamente após DDL. Hotpipe price_alert_lifecycle/0000 via ferramenta oficial; mapa12 como DML validado à parte, total44. Nenhum journal manual.
- Edge bike-price-alert e APIs Hotpipe implantadas; worker final inclui preço/link atuais e botão no acompanhamento v2. As recusas de formato ocorreram antes de qualquer execução. Não houve mudança material na estrutura/regras aprovadas.
- Publicação Vitale6689e4cb-d5e6-47e9-9ab6-e7d42c5d5bff, código9086f43. Cron produtivo das15h42 passou a responder com email.configured=true, comprovando a nova versão servidor. Após ativação, tick15h44 retornouHTTP200 em ambos projetos, email.configured=true e lifecycle.ok=true.
- Meta aprovou confirmação site_alerta_preco_cadastrado_v1 (Hotpipe d71afeaf-f43e-4cfa-a510-162b97a37f7b, Meta2068006730580283) e acompanhamento site_alerta_preco_acompanhamento_v2 (Hotpipe e87c2b80-0796-454d-8e75-9ca12a330cec, Meta4256373787995894). Update condicionado a corpo/idioma/botão/status exatos habilitou WhatsApp às15h43m51s; e-mail habilitado às15h43m53s. Template de queda existente preservado. Acompanhamento v1 não configurado para uso.
- Jornada pública real conferida em browser: Radar V9Max, oferta direta, modal com preço/meta e consentimento explícito para confirmação/avisos por WhatsApp e e-mail. Nenhum dado preenchido/enviado no smoke. Uma sonda técnica com nome numérico inválido retornou400 Informe seu nome, sem criar alerta/contato.
- Integração Resend existente comprovada por campanha sent de18/11 às06h46 SP e configuração do novo worker. Não foi enviada mensagem artificial; filas novas estavam vazias na confirmação. Habilitação não é evidência de entrega de um novo cadastro inexistente.
- pnpm validate repetido após migrations/tipos oficiais:69 regressões, TypeScript/build passaram. Testes direcionados Vitale78; Hotpipe9 com contrato Meta, preço atual/meta/any_drop/URL e resultado incerto. Rollback e ensaios descritos acima preservados.
- Custo total reportado pelo Lovable: **8,7 créditos**, incluindo recusas iniciais e implantação da correção de jornada. Sem compra de créditos, plano novo, DNS, lote histórico, reativação dos12 incertos ou nova geração de conteúdo.
- Matriz final das oito perspectivas: **Pass** para entrega e ativação prospectiva; comprovação de primeira entrega real será registrada quando houver novo cadastro elegível. Parecer **GO**. Monitor diário09h30 continua somente leitura.
