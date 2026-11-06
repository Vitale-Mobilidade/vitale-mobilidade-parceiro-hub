# Usuários, anúncios e cortesias — 06/11/2026

Classificação: estrutural. Novo acesso administrativo a contatos e concessão de direitos de publicação no Supabase integrado do mesmo projeto Lovable.

## Revisão anterior à implementação

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Ficha privada do usuário e cortesias explícitas para parceiros. Evitar gratuidade ilimitada: quantidade definida, cada unidade permite uma bike ativa por 90 dias a partir da primeira publicação. Prosseguir. |
| Arquitetura | Estender endpoint Admin existente; RPC exclusiva de service_role com role Admin validada também no banco. Direitos gratuitos separados de pedidos Asaas, reutilizando publicação/identidade/mídia existentes. Risco de dois anúncios por direito: serializar por proprietário. Prosseguir condicionado ao ensaio SQL. |
| IA | N/A: não altera agentes ou geração de conteúdo. |
| Segurança | Contatos pessoais somente no Admin autenticado, no-store, busca paginada e payload estrito; sem impersonação, senha, token ou exportação pública. Concessão/revogação auditadas e idempotentes. Bloquear se algum gate falhar. |
| UX/UI | Buscar por nome/e-mail/telefone, lista de usuários e anúncios, ficha com identidade/status, anúncio/cobertura/prazo e formulário de cortesia com motivo e confirmação. Estados vazios, erro, carregamento e mobile. Prosseguir condicionado ao smoke. |
| CX | Visualizar contato informado e status verificado sem prometer que um contato pendente é válido. Motivo, autor e histórico de cortesias visíveis; revogar interrompe somente a cortesia. Prosseguir. |
| Growth | Facilitar parceria sem gerar receita falsa; não mudar captação, newsletter, SEO nem autorização de mensagens. Prosseguir. |
| QA | Testar busca/paginação, gates Admin/browser, tentativa de spoofing, concessão repetida, uso/reativação/troca/expiração/revogação e concorrência. Preservar testes de direitos pagos e notificações. Prosseguir condicionado. |

## Decisão consolidada

Implementar abas Usuários / Anúncios / Bikes do canal no painel existente, preservando métricas. Ficha administrativa por usuário, sem entrar na sua sessão. Conceder de 1 a 10 cortesias por ação com motivo obrigatório; cada unidade é um direito de 90 dias corridos iniciado na primeira publicação, transferível para outra bike inativa do mesmo usuário sem reiniciar o prazo. Uma bike ativa por direito. Antes do primeiro uso, o direito não expira; revogação explícita disponível com motivo. Identidade e autorização de contato continuam obrigatórias para anunciar. Não publicar automaticamente pelo Admin nem disparar cobranças/mensagens de teste. Nenhuma cortesia é pagamento, faturamento ou evento de anúncio pago.

Trade-off: tabela de direitos de cortesia separada acrescenta um contrato pequeno, mas evita forjar cobranças/confirmar pagamentos inexistentes. UI deve reconhecer cortesia disponível e oferecer publicação sem checkout. Compras reais continuam com o fluxo atual. Direito grátis e pedido pendente não podem cobrir simultaneamente a mesma bike.

Aceite: busca paginada por nome/e-mail/telefone, detalhes de usuários/anúncios com métricas e prazo, concessão/revogação auditada, cortesia utilizável pelo próprio usuário, uma publicação por unidade, faturamento e e-mails pagos intactos, pnpm validate e ensaios SQL/UI aprovados. Rollback: retirar novas entradas do frontend e revogar endpoint de gestão; preservar tabela/auditoria e direitos já concedidos (não apagar benefícios). SQL de rollback deve preservar direitos existentes e impedir novas concessões.

Publicação, migration e merge somente após autorização específica ao final do trabalho local.

## Revisão posterior

| Perspectiva | Resultado | Evidência |
|---|---|---|
| Produto | Pass | Ficha privada, busca por três contatos, anúncios e cortesias quantificadas. Direito gratuito tem a mesma regra de uma bike ativa/90 dias sem pagamento fictício. |
| Arquitetura | Pass | Endpoint Admin existente e RPC privada; writer de publicação preservado. Benefícios separados de Asaas e serializados pelo proprietário. Nenhum serviço ou job paralelo. |
| IA | N/A | Não altera modelos ou agentes. |
| Segurança | Pass | Role ativa validada pelo servidor e RPC; sem impersonação, tokens/segredos ou contatos na projeção pública nova. Tabelas/funções auxiliares sem privilégios browser mesmo com defaults amplos. Respostas privadas no-store, paginação/inputs limitados; grants/revogação/transferências auditados. |
| UX/UI | Pass | Três áreas acessíveis no topo; busca e ficha sem ficar abaixo de 30 linhas de faturamento. Desktop e 390px conferidos, foco na ficha, estados vazios/erro, contador de motivo, revisão antes de conceder/revogar. Parceiro recebe CTA sem pagamento. |
| CX | Pass | Históricos preservados e destinatário da cortesia explícito. Se houver checkout pendente, UI orienta cancelamento antes de usar a cortesia e esconde o CTA para pagar; não cancela/reembolsa no provedor por conta própria. |
| Growth | Pass | Benefício não conta como receita nem gera aviso de anúncio pago. Captação, newsletter, mensagens reais e fontes públicas herdadas permanecem preservadas. |
| QA | Pass | 51 testes unitários dirigidos; ensaio SQL com backup/restauração sintética, autenticação/grants, busca literal/paginação, idempotência/concorrência, identidade/consentimento, início do prazo, reativação/troca, expiração/revogação, exclusão de receita/pedidos/avisos pagos e rollback. UI Admin, parceiro com checkout prévio, fluxo pago e canal passaram; lint e pnpm validate (66 testes/typecheck/build). |

## Evidência e operação

- Runner SQL: `python3 tests/member-community-db.py --partners`; cria PostgreSQL descartável sem TCP e restaura o backup sintético antes de testar a migration. Nenhum dado de produção.
- UI: `tests/admin-members-partners-ui.mjs` e `tests/partner-courtesy-ui.mjs`. Todas as chamadas externas são bloqueadas; os usuários e bikes das capturas são sintéticos. Regressões existentes em `tests/bike-classifieds-ui.mjs` e `tests/admin-community-ui.mjs` também passaram.
- Logs locais em `/tmp/vitale-partners-{db,unit,ui,courtesy-ui,paid-ui,channel-ui,lint,validate}.log`.
- Capturas: `artifacts/admin-partners/member-partner-desktop.png`, `member-partner-mobile.png`, `courtesy-published-mobile.png`.
- Nova migration: `20261106150000_admin_members_partners.sql`. Não altera dados existentes: novas tabelas privadas, projeções e wrappers. Comprovar assinaturas e triggers existentes e guardar definições/backup antes da aplicação produtiva.
- Rollback operacional: `supabase/rollback/20261106150000_admin_members_partners.sql` bloqueia novas consultas/concessões pelo endpoint Admin. Retirar somente a entrada administrativa nova do frontend. **Manter suporte de publicação e UI às cortesias já concedidas**, datas e auditoria; não reverter o enum/leitor público para uma versão que desconheça benefícios existentes. Não apagar tabela nem restaurar a base inteira para desfazer esta entrega.
- Sem cobrança real, envio de e-mail/WhatsApp, criação de conta real ou concessão produtiva de cortesia no desenvolvimento. Nenhum serviço ou plano pago novo.

Preflight produtivo somente leitura: os sete contratos esperados e o trigger de início de exibição existem; nomes da nova tabela e RPC livres. Nenhuma alteração produtiva aplicada.

Estado: pronto localmente para revisão e PR; publicação, merge e migration ainda não executados. Requer autorização específica do responsável para o release deste escopo. Cortesia concedida pelo Admin não publica uma bike automaticamente e nunca dispensa validação de contato/consentimento do proprietário.
