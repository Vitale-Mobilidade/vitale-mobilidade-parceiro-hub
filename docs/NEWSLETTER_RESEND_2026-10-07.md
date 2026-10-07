# Newsletter automática com Resend — 07/10/2026

Classificação: estrutural (Supabase, dados pessoais, integração, Radar e operação administrativa). Autorização atual: implementar integração automática Resend no plano gratuito. Publicação, migration produtiva, DNS e primeiro lote real seguem gate separado; implementação não implica liberação produtiva.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
|---|---|---|---|---|
| Produto | Newsletter própria automática, segunda/sexta 10h São Paulo | Frequência sem novidades | Conteúdo publicado e opt-in | Prosseguir; não repetir edição idêntica |
| CTO | Backend TanStack, cron assinado, ledger de campanha e Resend Broadcast | Timeout gerar duplicatas; cota de segmentos | Service role servidor e chave Resend | Prosseguir; lease global, etapas persistentes, incerteza bloqueia |
| IA | Seleção determinística de fatos publicados | Título inventado, preço antigo | Catálogo/índice oficiais | Sem custo IA e sem gerar preços; links ao Radar |
| Segurança | Dados de inscritos enviados ao Resend | Reativar opt-out, keys client, entrada maliciosa | RLS privada, assinatura webhook | V2 elegível; V1 excluído; preservar opt-out externo |
| UX | Agenda, configuração, prévia e acompanhamento no painel | Mostrar enviado quando só aceito | Status explícitos e erros acessíveis | Painel exclusivo admin; conteúdo curto |
| CX | Operação centralizada; respostas no Guilherme | Falha silenciosa, lista errada | Remetente verificado, stop | 3 grupos exclusivos; legado geral; pausa por incerteza |
| Growth | Nome e ordem editorial por interesse | Reputação e repetição | Consentimento, descadastro Resend | Broadcast gratuito; não usar caixa Zoho |
| PMO/QA | Migration aditiva, patch real | Divergência preview/produção | Tests alvo, validate, ensaio SQL | Prosseguir local; release só com evidências e aprovação |

## Decisão consolidada

Escopo: aproveitar compositor local no checkout real /tmp/vitale-newsletter-admin (base 9215eeb), trocar export Zoho por Resend; persistir configuração/campanhas/coortes; worker automático segunda/sexta às 10h (janela de recuperação até 12h); nome personalizado e conteúdo curto real; separar por interesse declarado (geral/Radar/conteúdo); privado; agenda assinada; webhook autenticado para entrega/falha/complaint; opt-out nativo Resend preservado. Nenhum inferido do Quiz. API Resend somente backend; configuração no painel sem copiar chave. Até 1000 contatos gratuitos da conta, conforme /usage (outros projetos contam); não habilitar cobrança ou upgrade. Sem exportação local de PII.

Consulta produtiva agregada: 19 inscrições V2 autorizam contato sobre newsletter; 2 V1 só autorizam guardar dados, sem entrega ativa: excluir V1 até novo aceite. Todos delivery_enabled=false antes desta task. MCP Lovable retornou nenhum conector custom instalado. Usuário precisa completar conexão Resend pelo dashboard; não pedir chave no chat. Implementar auto mesmo aguardando essa dependência.

Conflitos: “3000 sem limite diário” versus preço atual. /emails gratuito=3000/mês e 100/dia; Broadcasts marketing gratuito=1000 contatos e broadcasts ilimitados, 3 segmentos. Escolha Broadcasts. Segmentação por bike individual sem preferências registradas inventaria intenção; manter geral e suportar 3 interesses voluntários. Templates por grupo diferem na ordem, nome individual via campo Resend. Múltiplos projetos no mesmo Resend podem consumir segmentos: setup exige 3 segmentos disponíveis ou IDs dedicados já configurados, sem alterar os de terceiros.

Aceite: estado OFF default, chave não cliente; conteúdo ausente impede envio; duas edições sem repetição; opt-out vigente; audience deduplicada; nenhuma duplicação após timeout; grupo atualizado/exatamente conferido antes de submit; conta/domínio/quota preflight; JWT admin e HMAC worker/webhook; pnpm validate e SQL em banco isolado. Requisição accepted não significa delivered. Cron provisionado OFF; ativação explícita no painel depois da liberação.

Rollback: desativar settings.enabled e cron; cancelar apenas broadcasts conhecidos ainda em fila se houver; envios entregues irreversíveis; preservar inscritos/campanhas/auditoria; reverter arquivos. Sem apagar tabela nem reenviar campanha incerta automaticamente. Fora de escopo: Marketing Automation/Hotpipe, migração de infraestrutura, newsletter da base Quiz, contratar/upgrade, promoção de preview sem autorização.

Fontes: https://resend.com/pricing ; https://resend.com/docs/api-reference/broadcasts/create-broadcast ; https://resend.com/docs/api-reference/usage/retrieve-usage ; https://docs.lovable.dev/integrations/resend

## Domínio inicial confirmado pelo usuário

Usar `news.hotpipe.com.br` inicialmente, identidade visual e nome do remetente Vitale Mobilidade; sugerir `newsletter@news.hotpipe.com.br`, respostas em `guilherme@hotpipe.com.br`. Domínio/remetente configuráveis no painel para futura migração à Vitale. Screenshot às 17h42 mostra DKIM e resend.news Pending, send.news Not Started; não confirma DNS completo nem domínio verificado. Sem alteração DNS ou envio.

## Evidência local parcial às 17h47

22 testes direcionados passaram: renderer, cliente Resend, webhook e fluxo administrativo/worker. `pnpm validate` passou (types, 59 testes de regressão e build). Ensaio SQL isolado confirmou exclusão V1, consentimento vigente, replay, lease, cron OFF e intervalo/repetição. Ainda falta gate final e publicação autorizada: estes resultados não significam integração produtiva ativa.

## Revisão pós-implementação local — 18h40

Base real incorporada até `3b4869e`; merge local sem conflitos e sem modificar o outbox de terceiros. Código continua exclusivamente no branch `codex/newsletter-admin`; nenhuma migration ou publicação produtiva foi feita.

| Perspectiva | Status local | Evidência / condição |
|---|---|---|
| Produto | Pass | Quatro blocos curtos; segunda/sexta; hash evita repetição; domínio inicial configurável |
| CTO | Pass | Rotas servidor, ledger e lease; crash após ACK mantém submitting; 27 testes alvo e build |
| IA | Pass | Não usa geração ou crédito IA para fatos; apenas fontes publicadas e URLs validadas |
| Segurança | Pass | JWT admin no backend; HMAC cron/Svix webhook; RLS/grants privados; consentimento V2; bundle público sem nomes de secrets operacionais |
| UX | Pass | HTML inspecionado em desktop e 390px sem overflow; painel com loading/erro, preview e labels de entrega; links admin preservam navegação |
| CX | Pass | Pausa disponível e falhas incertas suspendem operação; replies Guilherme; cron provisionado desligado |
| Growth | Pass | Descadastro nativo; sem importação do Quiz; segmentação só por interesse declarado; SMTP Zoho descartado |
| PMO/QA | Pass | 27 testes newsletter, validate com 59 regressões/types/build, lint alvo, diff check e SQL sintético reproduzível |

Esta matriz é a aprovação do código local, não da operação ao vivo. **Gate de ativação produtiva: Fail (evidência insuficiente)** até vínculo/acesso do conector, webhook autenticado, migration e deploy autorizados, preflight real do domínio/quota e teste controlado de entrega. Não declarar automação ativa ou entrega real antes disso.

Evidências: `docs/qa/newsletter` contém stubs/assertions sintéticos; PostgreSQL17 isolado sem listener TCP passou o ensaio final (DB newsletter_release); artefatos visuais em `/tmp/vitale-newsletter-artifacts`. Inspeção agregada produtiva confirmou 19 V2, 2 V1 e ausência da nova migration. Nenhuma PII exportada. Inspeção Lovable consumiu 2 créditos pequenos ao todo para contrato e vínculo; não voltar a usar créditos para implementação de código.

Domínio: screenshot do responsável às 18h32 mostra os três registros Verified e envio enabled. Lovable `My Resend` continua Private/No linked projects; projeto More > Connectors mostra No connections yet. Sessão MCP é Guilherme Palmerio (`gpalmerio@gmail.com`), conexão pertence ao Lucas. Confirmado caminho workspace Connectors > Resend > My Resend > Sharing > Share with others > Add people by email. O vínculo deve ser feito depois no projeto ou pela ferramenta de conexão do chat; Linked projects não é seletor. Pedido de autorização para acesso específico ficou pendente; nenhum acesso ampliado.

Conflito de evidência: Lovable afirmou que `/usage` não existe, mas documentação oficial atual em https://resend.com/docs/api-reference/usage/retrieve-usage mostra GET /usage e campos contacts/segments/broadcasts. Mantido preflight /usage; provar passagem pelo gateway antes de ativar. Não remover proteção de quota para contornar esse ponto.

## Sequência de liberação proposta

1. Permissão restrita do My Resend ao Guilherme + vínculo somente Vitale (sem compartilhar workspace inteiro, sem mudar Ask each time).
2. Publicar exclusivamente diff newsletter no projeto existente e aplicar somente migration 20261007195000_newsletter_resend.sql (aditiva, cron OFF). Deploy Edge newsletter-interest preserva demais funções.
3. Criar webhook Resend para https://vitalemobilidade.com/api/public/newsletter-webhook, eventos contact.updated/email.delivered/email.bounced/email.complained/email.failed; inserir signing secret exclusivamente via formulário seguro como RESEND_WEBHOOK_SECRET. Não passar pelo chat, arquivo ou browser bundle.
4. Configurar from newsletter@news.hotpipe.com.br e reply_to guilherme@hotpipe.com.br; preparar segmento dedicado; verificar domínio, /usage, webhook, preview real e teste controlado antes do lote.
5. Ativar no painel para próxima janela segunda/sexta10h, somente após gate real. Não antecipar envio fora da agenda. Nenhum upgrade ou contratação.

Rollback: pausar automação e job primeiro; preservar ledger e supressões; cancelar broadcasts identificados ainda não iniciados se necessário; reverter código ao commit anterior sem remover tabelas/dados. Mensagens entregues não podem ser desfeitas. Risco residual: dependência do gateway e webhook precisa prova real; domínio Hotpipe compartilha reputação organizacional, nenhuma garantia de inbox. Mudança de remetente com automação pausada permite migração futura sem novo código.

## Vínculo concluído e bloqueio de credencial — 07/10/2026

Responsável autorizou explicitamente acesso ao Guilherme e confirmou que gpalmerio é sua conta Lovable. UI salvou apenas Guilherme Can use, manteve Lucas Owner; Permissions updated successfully. Vínculo standard_connectors concluído somente neste projeto: is_linked_to_project=true; RESEND_API_KEY injetado pelo mecanismo seguro sem ler/exibir valor. Nenhum envio, contato ou broadcast criado.

GET /domains, /usage e /segments via gateway retornaram HTTP401 restricted_api_key: credencial é Sending access (somente envio). A operação por Broadcasts necessita gerir contatos/segmentos e exige chave Full access. Responsável deve criar/substituir chave pelo formulário seguro Resend/Lovable; não pedir chave em chat, não manipular valor local, não compartilhar workspace inteiro. Não remover preflight nem tentar contornar permissão com chave restrita. Gate de ativação permanece Fail até atualização segura e consultas reais bem-sucedidas. Custo desta etapa1,6 créditos Lovable, total inspeção/vínculo3,6 créditos. Publish/migration e envios permanecem não executados.

## Chave validada e decisão de quota — 18h55

Responsável atualizou a chave pelo formulário seguro. Gateway GET /domains,/usage,/segments retornou200: news.hotpipe.com.br verified, sending enabled, receiving disabled, sa-east-1; abertura/cliques desligados. Conta:0/100 emails dia,0/3000 mês,0/1000 contatos,1/3 segmentos,0 broadcasts/sem limite. Existe apenas General padrão, nenhum segmento Vitale. Sem criar recurso nem consultar contatos.

Decisão diante da quota real (substitui plano anterior de3 segmentos upstream): criar/reutilizar apenas um segmento dedicado `Vitale newsletter`, com as3 coortes exclusivas persistidas no ledger. Produto/IA mantêm conteúdo e personalização; CTO/CX exigem lease global e congelar segmento até Resend concluir envio; Segurança mantém audiência exata e opt-out; UX/Growth mantêm interesse declarado sem usar Quiz; PMO requer teste da barreira entre coortes. Não apagar/renomear General nem consumir plano pago. Novos testes cobrem general/radar/content no mesmo segmento e worker não modifica/processa próxima coorte enquanto broadcast anterior está sending.

Pós-revisão das8 perspectivas: Pass para preparação local, mesmas justificativas da matriz anterior com nova evidência de gateway e teste de isolamento sequencial.30 testes newsletter,59 regressões em pnpm validate/types/build, lint e diff check passam. SQL da migration não foi alterado desde ensaio final aprovado. Bloqueio restricted_api_key resolvido. Total consultas/vínculo Lovable4,6 créditos; código/testes executados localmente.

Gate atual: pronto para aprovação da instalação com automação OFF; não confundir com ativação produtiva. Publicação/schema, configuração segura de webhook, teste de entrega ao responsável e ativação dependem de autorização específica e de resultado real. Nenhum merge, migration, deploy, contatos, broadcast ou email foi executado. PR draft#6 contém código revisável. A criação de1 segmento dedicada deixa total esperado2/3.

Proposta concreta: integrar branch da newsletter ao projeto vigente; aplicar apenas migration20261007195000_newsletter_resend.sql; publicar app e Edge newsletter-interest; configurar webhook e segredo no formulário seguro; configurar Vitale Mobilidade <newsletter@news.hotpipe.com.br> com reply-to Guilherme; validar preview real, quota/domínio/admin/assinaturas, preparar segmento e teste único para guilherme@hotpipe.com.br. Ativar segunda/sexta10h só após esses controles passarem, para19 inscritosV2 elegíveis (V1 permanece fora e contagens serão reconsultadas). Sem antecipar lote. Risco médio de operação de emails; mensagens aceitas/entregues não reversíveis. Sem upgrade/assinatura nova; custo externo pequeno de implantação Lovable. Rollback pause/crON OFF e reversão de código, mantendo ledger e supressões.

## Instalação produtiva autorizada — 07/10/2026 às19h

Humano aprovou expressamente publicação, migration, webhook, teste único para Guilherme e ativação condicionada ao teste. PR6 mergeado em e540d99; Lovable confirmou esse HEAD. Migration aplicada pela query do projeto em transação; schema_migrations registra20261007195000. Preflight confirmou crypto/net disponíveis,0 inscritos habilitados e nenhum job newsletter anterior. Cron/settings continuam OFF. Remetente configurado newsletter@news.hotpipe.com.br; reply_to Guilherme.

Deploy do app3815c5ec-f017-4e47-a8f3-d8525f63617f: rota https://vitalemobilidade.com/admin/newsletter publicada com título Newsletter · Admin Vitale e tela login para não autenticado. curl GET/admin API401, GETworker405, POSTworker sem assinatura403, POSTwebhook503 enquanto segredo ausente. Probe assinado via pg_net id10009 respondeu200 {ok:true,enabled:false}; assinatura e ligação banco/servidor operacionais sem disparo. Python urllib foi bloqueado403 pelo agente HTTP; curl/browser e chamada pg_net demonstraram rotas reais. Não tratar403 genérico como erro da aplicação.

Edge newsletter-interest deployada isoladamente. Lovable gerou só tipos do schema (a6fcd16) a partir da migration; nenhum outro código modificado. Checkout incorporou tipos e pnpm validate passou. Artigos públicos reais disponíveis; índice registra conteúdo publicado no dia.

Setup conector: criação de segmento via agente foi rejeitada porque Ask each time exige approval card indisponível nessa sessão. Sem enfraquecer aprovação, operação autorizada concluída pela UI Resend: segmento `Vitale newsletter` criado com sucesso, UUID79491b84-883b-497f-8e3f-5ecc7a81733d. Settings general/radar/content apontam para esse segmento único. Nenhum contato inserido.

Webhook: UI Resend preparada com endpoint/api/public/newsletter-webhook e exatamente5 eventos previstos; ainda NÃO salvo. Cadastro de segredo no Lovable Cloud > Secrets > Add secret aberto, Name RESEND_WEBHOOK_SECRET preenchido e Value vazio. O responsável deve finalizar Add no Resend, copiar Signing secret diretamente para Value e Save no Lovable. Não copiar chave pelo chat, arquivo ou log. Credencial nova requer inserção pelo humano; nunca automatizar entrada do segredo pela UI. Screenshots de prova em artifacts/resend-segment-created-2026-10-07.png, resend-webhook-ready-2026-10-07.png e resend-webhook-secret-form-ready-2026-10-07.png; nenhuma contém segredo.

Custo adicional setup Lovable1,7 créditos; total6,3 até aqui. Nenhum envio de teste ou lote executado, nenhum broadcast/contact criado. Instalação parcial operacional, automação OFF. Próximo: humano salva segredo; publicar configuração de servidor, validar webhook assinado com entrega real ao Guilherme, ativar exclusivamente se prova passar. Autorização continua válida, não pedir outra aprovação para mesmos passos. Gate ativação: Fail enquanto teste real e webhook não comprovados; demais evidências de instalação Pass, sem declarar conclusão antecipada.


## Conclusão operacional — 07/10/2026, 19h de São Paulo

RESEND_WEBHOOK_SECRET foi cadastrado pelo responsável no formulário seguro; somente existência foi conferida. Configuração publicada no deployment b47e4bc6-dde0-4c47-8416-9114e3f43e9f. Webhook habilitado fa2d6dc2-6459-43ec-a496-f485eb739310. Endpoint publicado rejeita POST não assinado com 403 e GET com 405.

O conector Ask each time não conseguiu apresentar cartão para a escrita de teste. Sem reduzir essa proteção, o teste previamente autorizado foi realizado pela interface nativa Resend, Send test email, somente para guilherme@hotpipe.com.br. E-mail 01a1186c-7252-7081-9207-6f77008334fc: Delivered, confirmado pela UI e GET do provedor. Evento email.delivered às 22:12:07 UTC: success no GET de eventos do webhook, confirmando resposta 2xx ao evento assinado. O teste é externo ao ledger; não comprova métricas de broadcast de lista nem a personalização do descadastro. Essas partes estão cobertas pelos testes locais, permanecendo observáveis na primeira edição.

Rascunho 950cde51-5da1-4c5c-8503-3f99b2a7c2f4 permanece Draft, sem segmento destinatário; não enviar esse rascunho à lista. Conteúdo inclui dois artigos publicados, Radar, BW02 e dois vídeos reais. Prova visual em artifacts/newsletter-test-delivered-2026-10-07.png.

Após aprovação condicional previamente concedida e teste entregue/webhook validado, newsletter_set_enabled foi executada para o único administrador ativo correspondente à conta do responsável, sem expor UUID. Verificação: enabled=true, cron_active=true, 19 inscrições elegíveis. Agenda segunda e sexta, 10h de São Paulo, janela até 12h; próximo envio regular sexta 09/10/2026. Nenhum disparo imediato à lista foi feito. V1 e suprimidos permanecem excluídos.

Revisão final das oito perspectivas: Produto Pass (formato compacto e frequência acordada); Arquitetura Pass (SSR, serviços e processamento incremental); Growth Pass (consentimento, segmentação declarada e descadastro nativo); UX Pass (painel e HTML com QA desktop/mobile); IA Pass (fontes publicadas, sem inferir interesse do Quiz); Operação Pass (cron ativo, ledger e pausa); Segurança Pass (segredos no servidor, assinatura validada, consentimento/supressão); PMO/QA Pass (testes locais e prova de entrega/webhook). Limitação explícita: a primeira edição de lista ainda não ocorreu; ela validará os estados reais de broadcast/descadastro, sem confundir teste avulso com campanha concluída.

Rollback: pausar pelo painel /admin/newsletter (desativa settings e cron); preservar ledger/inscrições e não reaplicar migration. Custo acumulado de consultas/setup Lovable nesta execução: 9,3 créditos; um e-mail de teste.


### Bloqueio detectado na checagem final do worker

Após ativação condicional, a sonda real request10029 retornou503 resend_network. Agenda imediatamente pausada (enabled=false,cron_active=false), sem campanhas disparadas. Diagnóstico: fetch nativo invocado com receiver ResendNewsletter, incompatível com Workers. Correção local chama o transporte com globalThis e teste exige esse receiver. A conclusão Pass operacional acima fica suspensa até nova sonda HTTP200 e reativação confirmada. Custo acumulado11,8créditos.


### Correção publicada e ativação final

PR7 integrado, commit7dee5e01d150ed9d7e9f9f98a198f857894d5103, deployment53733b00-c13b-45b8-995b-8cda6b6b01df. Sonda10033 ainda atingiu versão anterior durante publicação; mantivemos cron pausado. Após atualização, sonda10036 retornouHTTP200 {ok:true,due:false}: servidor conseguiu validar provedor e respeitou quarta-feira fora da janela. Sem novos emails. Reativação confirmada enabled=true,cron_active=true,19elegíveis,0campanhas. Risco material de transporte resolvido; oito perspectivas voltam a Pass com a limitação da primeira edição já registrada. Regressão transporte10testes e pnpm validate passaram após correção.
