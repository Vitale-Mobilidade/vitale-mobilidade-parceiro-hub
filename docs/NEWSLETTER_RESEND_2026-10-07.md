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
