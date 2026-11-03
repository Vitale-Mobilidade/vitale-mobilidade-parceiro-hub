# Cadastro único da comunidade Vitale

> **Decisão posterior:** o responsável optou por acesso imediato, sem confirmação no cadastro, e recuperação pelo Resend. O contrato vigente e as novas evidências estão em [COMMUNITY_IMMEDIATE_ACCESS_2026-11-03.md](COMMUNITY_IMMEDIATE_ACCESS_2026-11-03.md). A primeira revisão abaixo é histórica.

## Decisão corrigida pelo responsável

O responsável esclareceu que o cadastro é para **entrar na comunidade Vitale**, incluindo a assinatura da newsletter. O convite é para a comunidade; fórum e feed de notícias são evoluções futuras. Esta decisão substitui a separação de conta e newsletter proposta nas entregas locais anteriores.

Estado no esclarecimento: frontend e função nova ainda não publicados, PR #59 não integrada, oito tabelas novas vazias com os dois gates desligados. Migrations iniciais foram aplicadas após backup e ensaio; nenhum usuário/inscrito/admin existente foi alterado. Não remover migrations aplicadas nem tabelas: a correção será aditiva.

## Revisão prévia — estrutural

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Uma adesão à comunidade inclui newsletter; convites trazem membros | Manter duas inscrições ou antecipar fórum/feed | Aceite claro na adesão | Prosseguir com novo contrato único |
| CTO e Arquitetura | Auth confirmado → adesão atômica → perfil + newsletter + indicação | Corrida ou dois e-mails de confirmação | RPC de adesão e UUID Auth estável | Prosseguir sem novo writer de campanhas nem trigger de cadastro em auth.users |
| IA e Agentes | Futuro feed poderá usar o editorial existente | Duplicar geração/agentes | Nenhum fórum/feed agora | Prosseguir; somente documentar evolução |
| Segurança | Verificar e-mail Auth e registrar adesão/atribuição no servidor | Aceite implícito, autoelevação ou dupla contagem | Sessão verificada, RLS, transação e registro imutável da primeira adesão | Condicionado aos testes de isolamento/idempotência |
| UX/UI | Uma tela para cadastro e acesso, chamada de comunidade no site | Confundir newsletter com criação da conta | Copy e aceite únicos; confirmação Auth | Prosseguir sem segundo formulário de newsletter |
| CX e Operação | Newsletter automática na primeira adesão | Reinscrever em todo login depois de um cancelamento | Adesão registrada uma vez; writer e preferências atuais | Prosseguir: aceitar a adesão inclui newsletter; login posterior respeita descadastro |
| Growth e CRO | Convites e ranking futuro baseados em novos membros | Contar inscritos antigos como nova aquisição de comunidade incorretamente | Contar primeira adesão Auth confirmada, não clique | Prosseguir; inscrito antigo sem conta pode tornar-se novo membro |
| PMO e QA | Corrigir antes da publicação já autorizada | Misturar evidências do fluxo antigo com o novo | Nova migration, novos testes e revisão final | GO local; manter gates desligados até validar |

### Conflitos e decisão consolidada

- **Cadastro e newsletter:** a adesão explica, na mesma tela e no mesmo aceite, participação na comunidade e recebimento da newsletter. Não há opção de cadastro com newsletter separada nesse fluxo.
- **Confirmação:** usar apenas o e-mail do Supabase Auth. Depois de confirmado, o primeiro acesso conclui perfil, adesão, assinatura e indicação em uma transação. Não enviar outra confirmação da newsletter.
- **Aceite:** o formulário grava a versão de adesão nos metadados Auth; a RPC os lê somente como manifestação de aceite do próprio usuário, nunca como papel ou privilégio. Conta antiga sem esse aceite conclui a adesão uma vez na tela da comunidade.
- **Preferências:** primeira adesão é aceite explícito para receber a newsletter, inclusive se havia um cadastro antigo cancelado. Logins e edições de perfil posteriores não renovam esse aceite nem desfazem um novo descadastro. Nenhum inscrito antigo é convertido em conta sem iniciativa dele.
- **Indicação:** o link aponta para `/conta?modo=cadastro&convite=CODIGO`. Crédito apenas na primeira adesão de um novo membro com Auth confirmado; alguém que já recebia newsletter pode ser novo membro. Uma adesão/e-mail não gera crédito novamente. Sem crédito por visitas ou autoindicação.
- **Pendências:** usar somente cadastros Auth ainda não confirmados com o código registrado no cadastro, em janela de 48 horas; não aceitar contagem informada pelo navegador. Indicador vê agregados, nunca nomes/e-mails.
- **Arquitetura:** adicionar estado de adesão e relação com a inscrição ao perfil, e identificar membro indicado no ledger existente. A função de campanhas/cron/entrega permanece. O endpoint anterior da newsletter continua compatível com clientes já publicados; a UI nova conduz ao cadastro único. Ramo de confirmação separada não será ativado.
- **Escopo:** conta/perfil, newsletter integrada, comentários para membros, link e métricas de convites da comunidade. Fórum e feed são backlog; não criar telas vazias, tabelas ou promessas de disponibilidade.
- **Aceite:** confirmação única; nova adesão inscreve uma vez; novo login não reinscreve cancelado; signup antigo pode aderir; indicação conta membro novo; pendente não recebe newsletter; acesso admin continua separado; testes reais de schema/RLS e UI; `pnpm validate`.
- **Rollback:** gates da comunidade/indicações desligados, frontend e função anteriores identificados; preservar tabelas e dados. Não apagar histórico aplicado.

## Revisão pós-implementação local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Cadastro único com newsletter incluída, convites para membros; fórum/feed, curtidas, ranking e anúncios mantidos no roadmap |
| CTO e Arquitetura | Pass | Adesão transacional sem trigger Auth; migração aditiva; SSR público e writer/campanhas existentes preservados; typecheck/build SSR passaram |
| IA e Agentes | Pass | Nenhum writer, cron, modelo ou grounding alterado; comentários não entram no editorial |
| Segurança | Pass | Contratos SQL reais de grants/RLS, confirmação, consentimento booleano/versionado, não elevação, deduplicação e corrida; dados de terceiros não saem das RPCs |
| UX/UI | Pass | Smoke Chrome 390/1024px por teclado, mensagens de aceite único e assinatura, convites/cópia/retry; screenshots em artifacts/community-membership |
| CX e Operação | Pass | Conta antiga adere com aceite; login posterior não reinscreve cancelado; moderação/recuperação continuam; gate operacional de entrega real ainda é condição de ativação |
| Growth e CRO | Pass | Newsletter leva à comunidade; link pessoal estável e contagem de primeira adesão; canonical /newsletter preservado; nenhum envio de convite automático |
| PMO e QA | Pass | 37 testes direcionados, contratos SQL + concorrência em PostgreSQL descartável, restore proporcional do schema real, smoke UI e pnpm validate (66 regressões e build) passaram |

### Evidências e limites

- `python3 tests/member-community-db.py --community`: valida as três migrations e contratos em sequência, com conexões concorrentes para primeiro login.
- Backup real restaurado em PostgreSQL local sem TCP: seis tabelas e constraints de chave/check; nenhum dado de produção restaurado. Migration corretiva e contratos do novo fluxo também passaram nesse schema.
- Testes UI interceptam todas as APIs, não enviam e-mails e falham se houver chamadas externas. Comando: `MEMBER_TEST_COMMUNITY=true node tests/member-ui.mjs`, com `PLAYWRIGHT_MODULE` e servidor Vite local de URLs/chaves falsas.
- A validade do fluxo Auth em produção e a entrega na caixa controlada continuam distintas da evidência local. Não declarar e-mail recebido sem confirmação do responsável.
- Risco residual: operação precisa moderar novos comentários e acompanhar abuso no Auth. Não há promessa de ranking/prêmio, fórum ou feed nesta versão.
- Rollback conserva as três migrations e registros; desligar gates e reverter a versão pública. Nunca restaurar a base inteira nem apagar inscritos como rollback dessa entrega.
