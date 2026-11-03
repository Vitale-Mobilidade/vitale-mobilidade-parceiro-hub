# Indicações da newsletter por conta

> **Registro histórico substituído:** o contrato vigente é o [cadastro único da comunidade com newsletter incluída](COMMUNITY_MEMBERSHIP_2026-11-03.md). A separação de newsletter e confirmação própria descritas abaixo não serão ativadas. Para release, consulte [MEMBER_RELEASE_2026-11-03.md](MEMBER_RELEASE_2026-11-03.md).

Estado inicial: implementação local autorizada pelo responsável em continuação às contas (`2ddae74`). Classificação **estrutural**: Supabase, dados privados, inscrição existente, confirmação e atribuição. Base operacional remota continua `540fc1d`; não há autorização para publicar, aplicar migrations ou enviar e-mails reais.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Link pessoal, compartilhar e métricas próprias | Premiar clique ou cadastro falso | Perfil e e-mail do indicador confirmados | Prosseguir; apenas confirmados válidos contam; ranking/prêmios ficam futuros |
| CTO e Arquitetura | Estender `newsletter-interest`, manter writer de campanhas | Dois writers ou corrida de inscrição/atribuição | Ledger aditivo, RPCs atômicas; inscrição atual preservada | Condicionado a idempotência e exclusão de inscritos existentes |
| IA e Agent Engineering | Nenhum conteúdo/contato vira input de IA | Convites disparados por agente | Nenhuma chamada a modelos ou contatos em testes | Prosseguir; compartilhamento feito pelo próprio usuário |
| Segurança | Token de confirmação e atribuição privada | Autoindicação, replay, e-mail público, enumeração, abuso de envio | Tokens de 256 bits derivados no servidor, grants mínimos, TTL e limites | Condicionado a confirmação explícita por POST e testes de banco |
| UX/UI | Painel em Minha conta e inscrição convidada | Confundir acesso com pessoa ou confirmação | Mensagens separadas e retorno da confirmação | Prosseguir; acessos agregados, pendentes e confirmadas rotulados |
| CX e Operação | Novo e-mail transacional pelo provedor já usado | Falha/timeout e reenvio duplicado | Remetente/Resend existentes, chave de idempotência, limites globais | Condicionado a rollback e teste de envio apenas após autorização |
| Growth e CRO | Convite pessoal e atribuição verificável | Inflar números com existentes ou remover consentimento | Consentimento independente e primeira atribuição válida | Prosseguir; sem inscrição automática de contatos ou do indicador |
| PMO e QA | Segunda entrega de engajamento | Tratar simulação como produção | Testes direcionados, PostgreSQL, UI, pnpm validate | GO local condicionado às provas abaixo; produção separada |

### Conflitos e decisão consolidada

- Growth deseja fricção mínima; Segurança requer comprovação. Decisão: novos convidados confirmam por e-mail; o cadastro habitual da newsletter continua com seu contrato existente. Nenhuma nova conta Auth é exigida do convidado.
- Produto considera contagem de pessoas; acessos não identificam indivíduos. Decisão: medir **acessos agregados**, sem tratar reload como visitante único. Confirmados são novas inscrições únicas, nunca cliques.
- Primeiro convite válido fixa a atribuição do e-mail pendente durante 48 horas. Não substituir por outro indicador no retry. Depois de expirado, uma nova solicitação pode ter nova atribuição. Inscrito já existente, inclusive descadastrado, não gera crédito; não reativar descadastrados via indicação.
- Uma indicação confirmada é histórica: descadastro posterior não apaga a aquisição registrada. Exclusão de dados pessoais segue a operação existente; o indicador recebe somente totais e agregados por dia.
- Escopo: código estável e opaco por conta, copiar/WhatsApp, totais e histórico diário dos últimos 30 dias, query `ref` na página da newsletter, submissão pelo endpoint atual, confirmação por token em fragmento com ação explícita e uma única inscrição/atribuição atômica.
- Sem cookies novos de atribuição: o código acompanha apenas a página do convite; não espalhar `ref` por Quiz/Radar nem herdar fonte de outra campanha. Canonical continua `/newsletter`; página de confirmação sem indexação/cache/tracking.
- Dependências: primeira migration de contas; schema de newsletter existente; extensão pgcrypto e chave privada já usadas na newsletter; Resend/remetente existentes. Configuração nova de indicações desligada por padrão e independente do envio de campanhas.
- Aceite: somente dono confirmado consulta painel; código estável com troca de nome/e-mail; sem PII nos resultados; novos convidados pendentes não entram em campanhas; confirmação inválida/expirada/repetida não duplica contagem; autoindicação, existente e concorrência não geram crédito; newsletter habitual funciona com feature desligada; layout móvel e erros/retry verificados.
- Rollback: desativar indicações no banco e flag cliente, reverter somente este delta; manter contas, comentários, newsletter e ledger; sem DROP, backfill de pontos ou disparos reais.

## Fora de escopo

Ranking público, pontos, recompensas, sorteios, pagamento e anúncio de R$ 150. Não importar contatos, disparar WhatsApp ou enviar convites em nome do usuário. Uma pessoa pode controlar múltiplos e-mails; confirmação comprova posse de e-mail, não identidade civil. Qualquer recompensa futura exige revisão antifraude adicional antes de prometer benefícios.

## Implementação

- `member_referrals()` usa a identidade Auth atual, e-mail confirmado e perfil ativo para criar/reutilizar o código opaco de 128 bits e devolver somente os totais próprios e dias com confirmações nos últimos 30 dias civis de São Paulo. O total confirmado é histórico. O código não muda com o nome ou e-mail.
- Quatro tabelas aditivas têm RLS e nenhum grant direto para anon/authenticated. `newsletter_referral_service` só é executável pelo service role, com `search_path=''`. O endpoint verifica a sessão antes de repassar uma identidade; ignora `actorId` do JSON público.
- A extensão do único `newsletter-interest` preserva inscrição habitual, consentimento, honeypot, throttle, remetente/provedor e fluxo de campanhas. Sem indicação válida/ativada, continua o writer existente. Convidados novos ficam no ledger pendente; **não entram em `newsletter_subscriptions` nem em campanhas antes da confirmação**.
- Confirmar é insert-only e atômico. Registro existente, inclusive descadastrado ou criado pela inscrição normal enquanto o convite aguardava, não tem nome, consentimento, entrega ou status sobrescritos e não gera crédito. O trigger operacional da newsletter determina `delivery_enabled`; a indicação não ignora uma pausa da newsletter.
- O primeiro convite válido fixa a origem de um pedido pendente. Tokens são HMAC de identidade/nonce com separação de domínio e chave privada existente; apenas o hash é guardado no ledger. Validade inicial de 48 horas; reenvio explícito após 15 minutos renova nonce/validade. Retry de entrega incerta usa o mesmo token e chave de idempotência. Confirmar novamente não duplica inscrição nem crédito.
- E-mail de confirmação usa o Resend/gateway já existentes, com limite global inicial de **100 tentativas/dia**, configurável no banco, além do throttle do formulário. Visitas têm teto de 20 por chave de rede/10 minutos; confirmação, inclusive token inválido, tem teto de 30/10 minutos. Acessos não são visitantes únicos nem pontuação. Controles limitam abuso/custo; não comprovam identidade civil.
- Nome/e-mail provisórios são apagados da pendência ao confirmar. Pendências expiradas há mais de sete dias são limpas em lotes de até 100 nas próximas solicitações elegíveis; não se promete limpeza em horário fixo. O hash privado do e-mail, atribuição e UUID da inscrição sustentam deduplicação. Exclusão do perfil remove seus links/ledger por FK; não exclui as inscrições independentes dos convidados.
- Indicador suspenso não cria links nem recebe novos créditos enquanto suspenso; seu código fica sem atribuição válida. Confirmação de um pedido já enviado ainda pode concluir a newsletter para o convidado, preservando as regras atuais, sem crédito ao indicador suspenso.
- A URL compartilhada é fixa em `https://vitalemobilidade.com/newsletter?ref=CODIGO`. Não há novo cookie, importação de contatos ou propagação de `ref` para outras jornadas. Link de WhatsApp só abre a mensagem para o usuário decidir enviar.
- `/newsletter/confirmar` mantém token no fragmento e o retira da URL. Um cache de memória de cinco minutos permite remount de hidratação sem perdê-lo; não grava em storage/histórico, apaga ao confirmar e expira. GET não confirma: o visitante precisa clicar no botão que faz POST. A rota tem `noindex`, `no-store`, `no-referrer` e fica fora de tracking/atribuição/popup/assistente, inclusive com barra final. Canonical da página de newsletter continua sem `ref`.
- Minha conta mostra copiar, WhatsApp, acessos, pendentes, confirmadas, histórico e estados de carregamento, erro/retry e programa desativado. Não retorna nome/e-mail de convidados, lista de pessoas ou token ao indicador.

## Evidências locais

- **63 testes direcionados passaram**, em oito arquivos: handler real da Edge Function transpilado com dependências simuladas; signup habitual, feature desligada, consentimento, identidade verificada, honeypot, POST, limites/erros, transporte e idempotência de confirmação, links/código, projeção do painel, token na hidratação e rotas privadas; regressões de conta/admin/artigo/popup.
- `python3 tests/member-community-db.py --referrals`: **Pass**. PostgreSQL 17 descartável, socket privado, schemas sintéticos e trigger real de entrega. Prova grants/RLS, isolamento, origem, autoindicação identificável, existente/descadastrado, expiração, replay, retry/reenvio, orçamento, ausência de ativação prematura, pausa da newsletter, suspensão e limpeza. Duas conexões concorrentes registram apenas um envio; duas confirmações criam apenas uma inscrição/crédito.
- Chrome com API simulada, **390×844 e 1024×800**: **Pass**. Conta/comentários preservados; copiar com clipboard real, WhatsApp sem envio, painel com erro/retry, formulário real de convite, consentimento, pendência sem marcar inscrição como ativa, canonical, confirmação explícita com falha/retry e retorno ao painel com o total atualizado. A execução final usou URL/chaves locais para cliente e servidor, zero chamadas externas do navegador e zero erros de runtime.
- Lint dos módulos novos e dos componentes/API diretamente alterados: **Pass**. Typecheck e `git diff --check`: **Pass**.
- `pnpm validate` com contas e indicações ligadas e credenciais locais falsas: **Pass**; **66 testes** do gate operacional e build cliente/SSR. A Edge Function foi exercitada pelo harness do handler; não foi implantada nem exercitada na plataforma Deno/Resend real.
- Prévia inspecionada: [painel móvel](../artifacts/newsletter-referrals/referral-panel-mobile.png), [confirmação](../artifacts/newsletter-referrals/confirmation-mobile.png). Dados fictícios.

### Reproduzir

```sh
python3 tests/member-community-db.py --referrals
pnpm exec vitest run --config vitest.config.ts src/lib/newsletter-interest-endpoint.test.ts src/lib/newsletter-confirmation-token.test.ts src/lib/newsletter-referrals.test.ts supabase/functions/_shared/newsletter-referrals.test.ts src/lib/member-community.test.ts src/lib/newsletter-exit.test.ts src/lib/bike-admin-access.test.ts src/lib/article-independent.test.tsx
```

Para build e preview, definir `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` para o mock/local. Não deixar variáveis server-side herdadas apontando para o serviço operacional. Ligar `VITE_MEMBER_ACCOUNTS_ENABLED=true` e `VITE_NEWSLETTER_REFERRALS_ENABLED=true`. Rodar o smoke com Chrome/Playwright já disponíveis: `MEMBER_TEST_REFERRALS=true node tests/member-ui.mjs`; `PLAYWRIGHT_MODULE` pode apontar para a instalação existente. Nenhum e-mail/WhatsApp é enviado.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Conta com convite e métricas entregues localmente; somente novos confirmados válidos geram crédito; prêmios/ranking/anúncios ficam futuros |
| CTO e Arquitetura | Pass | Writer de inscrição atual estendido, campanhas intactas, ledger/RPCs aditivos, concorrência e SSR/build validados |
| IA e Agent Engineering | Pass | Sem modelos, automação de convites, contatos ou novo grounding; conteúdo privado não alimenta agentes |
| Segurança | Pass | Função de serviço inacessível ao browser, identidade derivada, token não exposto no retorno público, POST explícito, isolamento e limites testados; cache de memória cobre remount sem persistência |
| UX/UI | Pass | Copiar, compartilhar, métricas e confirmação no móvel/desktop; estado pendente separado do confirmado, falha/retry, erro/expiração e formulário preservados |
| CX e Operação | Pass | Entrega/cooldown/idempotência e limite diário preparados; preferências existentes e pausa de campanhas respeitadas; ativação/rollback documentados |
| Growth e CRO | Pass | Canonical preservado, visitante não precisa criar conta, consentimento independente, atribuição sem pontos por clique ou inscritos existentes, sem alteração de afiliados |
| PMO e QA | Pass | Testes direcionados, banco/concorrência, smoke UI, gate operacional e evidências; separação entre código local e release |

### Fechamento

**GO local; ativação condicionada à autorização específica e validação do ambiente.** Sem push/merge, migration/RLS de produção, deploy ou e-mail real. Não foram consumidos créditos Lovable para edição. Remetente, chaves e entrega transacional real não são declarados validados.

Antes de ativar no projeto Lovable atual: reconciliar HEAD, recuperar backup/ensaio do escopo de schema, aplicar primeiro a migration de contas e depois **somente** `20261103190000_newsletter_referrals.sql`; conferir `RESEND_API_KEY`, gateway opcional `LOVABLE_API_KEY`, `newsletter_settings.from_email` e `signing_key` existentes; verificar se há reescrita de links pelo provedor que afete o fragmento. Não abrir ou copiar secrets para docs/Git. A função pública continua com a mesma política de JWT efetiva que já permite inscrição anônima; confirmar a configuração na implantação autorizada, sem mudar outros endpoints.

Ativar separadamente `NEWSLETTER_REFERRALS_ENABLED=true` na Edge Function e `member_referral_settings.enabled=true` no banco; publicar frontend com as duas flags VITE ligadas somente no ambiente autorizado. Conferir volume previsto contra limite inicial de 100 tentativas/dia e quota/custo já contratados antes de elevar. Validar uma caixa de teste controlada, callback, replay e preferência de descadastro sem usar destinatários reais da base. Nenhum backfill de pontos ou inscrição antiga.

Rollback: desligar `member_referral_settings.enabled`, `NEWSLETTER_REFERRALS_ENABLED` e `VITE_NEWSLETTER_REFERRALS_ENABLED`, retornando a versão anterior deste delta. Se apenas o programa tiver falha, não desligar contas/comentários nem newsletter. Preservar tabelas e inscrições confirmadas; nenhum DROP/reset. Pendências não entram em campanhas durante a desativação.

Os riscos residuais são configuração/entrega real, volume/custo de confirmação e fraude com múltiplos e-mails. Testes locais cobrem implementação e limites; não substituem a validação autorizada de produção nem autorizam premiações. Publicação/migrations continuam sujeitos a [EXECUTION_GUARDRAILS.md](EXECUTION_GUARDRAILS.md), seções 1, 6, 8 e 12.
