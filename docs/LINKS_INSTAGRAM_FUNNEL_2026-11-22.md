# Funil Instagram → bio → próximos passos

## Pedido e classificação

O responsável quer retirar Google/Meta Ads de Campanhas e acompanhar jornadas **anônimas e conversões**, origem única Instagram. Mudança estrutural: nova medição de sequência, Quiz, newsletter e ofertas. Base operacional 4477a20. A captura orienta a tela; não autoriza apagar dados históricos ou desligar contas de anúncios.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Campanhas vira funil da bio com ramificações por botão e próximos passos. | Confundir saída externa com conversão. | Estágios observáveis e decisões por destino. | Prosseguir localmente; externo termina no clique. |
| CTO | Reusar Edge coletora e Admin existentes; adicionar contrato de jornadas. | Agregados diários não preservam ordem ou sessão. | Tabela privada aditiva, RPCs limitadas, flag desligada. | Prosseguir; manter agregado atual intacto. |
| IA | Sem modelos ou agentes no produto. | Inferir identidade/conversão sem evidência. | Somente eventos instrumentados. | N/A; nenhuma inferência ou geração paga. |
| Segurança | Identificador aleatório por aba, sem PII, sem envio a Google/Meta. | Rastreamento persistente e vazamento de URL. | Expiração por inatividade, respeito a opt-out/DNT/GPC, allowlists, retenção de 30 dias e acesso somente admin. | Prosseguir condicionado aos testes de isolamento e privacidade. |
| UX/UI | Funil visual, distribuição dos oito botões e percursos expansíveis. | Números simulados parecerem reais ou misturar denominadores. | Dados ausentes como indisponíveis, sessões distintas separadas de cliques. | Prosseguir com prévia identificada como simulada. |
| CX | Foco no canal ativo, histórico Ads preservado fora da tela. | Remover operação ou criar leads/assinaturas extras. | Instrumentar somente sinais de sucesso já existentes. | Prosseguir sem novo writer de conversão. |
| Growth | Instagram designa o canal da bio; medir visita → escolha → continuação → ação. | Recuperação retroativa impossível, sequência parcial, origem não comprovada por referrer. | Coorte por início da jornada, sequência monotônica, divulgação do início da nova coleta. | Prosseguir; sem backfill de cliques e sem tratar sessões como pessoas únicas. |
| PMO/QA | Entrega local completa e revisável antes de ativação. | Escopo novo ser confundido com autorização antiga de publicação. | Testes, ensaio SQL, preview e pnpm validate. | Prosseguir localmente; ativação requer autorização específica deste funil. |

## Decisão consolidada

- Remover consultas/filtros/tabelas de Ads da tela, preservando histórico e integrações existentes.
- Preservar acessos agregados atuais a /links. Os acessos anteriores não permitem reconstruir cliques ou jornadas.
- Novo funil usa sessões de navegação por aba, com ID aleatório só em sessionStorage, 30 minutos de inatividade, máximo de duas horas e 100 eventos. Nunca é identidade de uma pessoa; não cruza dispositivos ou associa cadastro/PII.
- Origem única `Instagram · link da bio` é a atribuição do canal definido pelo responsável. Isso não comprova que todo acesso teve referrer do Instagram.
- Medir oito botões de /links separadamente, navegação pública posterior, início/fim do Quiz, newsletter aceita pelo fluxo existente e clique em oferta. Não inferir compra, entrada no WhatsApp, visualização de vídeo ou follow externo.
- Guardar somente sessão, sequência, estágio, path permitido, botão enumerado, bike_id público quando aplicável e horário de recebimento. Sem respostas, textos de formulário, nome, contato, IP, URL completa, referrer ou user-agent. Retenção privada de 30 dias.
- Trade-off estrutural: a regra anterior prioriza o agregado existente e ausência de novo store. A nova demanda exige ordem e vínculo anônimo, informação que o agregado destrói. Preservá-lo e adicionar uma tabela privada de eventos no mesmo Supabase é a menor extensão capaz de cumprir o pedido; nenhum serviço/store externo nem writer de leads é criado. A ativação desta extensão depende de decisão explícita do responsável.
- Flags cliente e servidor desligadas por padrão. Novas RPCs somente service_role; leitura via Admin existente. Dados do novo funil ficam separados de Growth.
- Rollback: desligar flags, reverter frontend/Edges; preservar eventos privados até retenção. Não apagar tabelas/dados históricos. Antes de migration produtiva: snapshot restaurável do schema afetado e ensaio local de instalação/restauração.
- Fora de escopo: identidade/contatos, Ads externos, backfill, envio de mensagens, newsletter real, compras e publicação automática desta evolução.

## Revisão pós-implementação local

As perspectivas foram revisadas separadamente neste agente; não se alega uma auditoria independente por oito pessoas/agentes.

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Tela dedicada ao Instagram, quatro etapas, oito destinos e percursos por sessão; nenhuma consulta Ads/Meta na tela. |
| CTO | Pass | Reusa coletor/Admin e sinais de conversão existentes; fonte pública SSR preservada. SQL aditivo somente preparado em docs/sql, sem journals/migrations históricas modificados. |
| IA | N/A | Nenhum modelo, inferência, recomendação ou geração afetados. |
| Segurança | Pass local | Payload fechado/PII rejeitada, paths públicos, sequência 0–99, opt-out e expiração; RLS e RPCs só service_role; Admin verificado antes de consultar; ensaio comprovou negação de acesso anon e retenção. |
| UX/UI | Pass | Prévia estática com aviso explícito de dados simulados, inspecionada em 1440/390; mobile sem overflow da página, tabela com rolagem local; expansão nativa mostrou bio → Radar → detalhe → oferta. |
| CX | Pass | Leitura indisponível não é zero; sessões sem coleta aparecem sem medição; externo termina na saída, sem presumir entrada/follow; sinais de Quiz/newsletter/oferta são reaproveitados sem novos envios de negócio. |
| Growth | Pass | Coorte por início em São Paulo; sessões distintas por etapa ordenada, cliques e sessões separados; múltiplas escolhas não são somadas como pessoas; medição detalhada não altera agregados Growth. |
| PMO/QA | Pass local | 45 testes direcionados, gate pnpm validate com 71 regressões, tipos e build SSR, lint dos arquivos novos e diff-check. Comparação de lint dos arquivos herdados confirma nenhum novo achado; dívida antiga preservada. |

### Evidências e limites

- Ensaio PostgreSQL descartável aprovado: instalação aditiva; chegada fora de ordem; idempotência por sessão/sequência; limites de payload; saída Spotify sem conversão fictícia; oferta posterior ao Radar; permissões privadas; limpeza após 30 dias; agregado anterior 21 intacto; restauração do schema ensaiada por savepoint sem perda do agregado original.
- Leitura do relatório limita jornadas detalhadas a 20 por página, até 10.020 mais recentes; os totais incluem todas as sessões observadas na coorte. O fim da paginação respeita o limite do endpoint. Retenção e disponibilidade de cobertura são aplicadas na leitura e na limpeza.
- A janela da coorte é o início da sessão; as ações podem continuar durante até duas horas, inclusive atravessando a meia-noite. Eventos perdidos/bloqueados não são inferidos. A sessão não identifica pessoa nem dispositivo de forma persistente.
- A coleta depende de `VITE_LINKS_JOURNEY_ENABLED=true`, `VITE_SITE_ANALYTICS_ENABLED` diferente de false, preferência analítica permitida e ambiente de produção no cliente; na Edge depende de `SITE_ANALYTICS_ENABLED=true` e `LINKS_JOURNEY_ENABLED=true`. Ambos os novos gates estão desligados por padrão. Nenhum secret/token ou ID de jornada vai para URLs/Google/Meta.
- Retenção detalhada de até 30 dias com limpeza na próxima gravação; consulta não exibe eventos além da janela. Não há job novo ou cron duplicado.
- Prévia em `../../../artifacts/links-instagram-funnel-2026-11-22/preview.html`, imagens desktop/mobile e patch no mesmo diretório. Números dessa prévia são **simulados**, não resultados produtivos.
- A imagem anexada foi usada como referência da tela existente, não como instrução de executar ações externas.

### Fechamento e condição de ativação

**GO para revisão local; GO condicionado para ativação.** Não houve alteração, deploy, merge, migration, escrita de eventos, disparo ou crédito Lovable no ambiente produtivo nesta evolução. A tela atual publicada continua operacional; os blocos Ads só foram retirados da nova implementação local.

Para ativar, é necessária autorização específica para a extensão de schema (uma tabela privada e duas RPCs), implantação das duas Edges existentes, flags da nova coleta e publicação de Campanhas/instrumentação/privacidade no mesmo Lovable. O GitHub da integração anterior recusou escrita; se persistir, a integração mecânica pelo Lovable tem custo esperado moderado de créditos. Sem serviço adicional contratado.

Antes do release autorizado: snapshot proporcional restaurável do schema/grants afetados e dos agregados existentes, comparar base, aplicar SQL pelo fluxo oficial, implantar Edges com flags desligadas, publicar frontend, ativar flags e confirmar uma jornada anônima de teste sem enviar newsletter/lead ou abrir afiliado real. Rollback por desativação das flags e restauração do frontend/Edges da base 4477a20, preservando dados. Não usar DROP nem apagar histórico como rollback.

## Autorização e preflight de ativação

Em 22/11/2026, o responsável autorizou explicitamente: “Pode publicar a nova tela de Campanhas e ativar o funil anônimo do Instagram.” A autorização cobre a extensão aditiva, os deploys/flags, a integração e a publicação propostos e seu custo moderado. Não pedir confirmação novamente para esse escopo.

Preflight somente leitura: projeto e origin/main continuam em `4477a20a6a6bb3443be8c32ac62a8efb80800fd7`; nova tabela e ambas RPCs ainda ausentes. Agregado `/links`: 21 visualizações; total diário global 24.461 eventos e horário 6.929 (podem crescer com tráfego normal). As quatro funções de analytics existentes e suas ACLs permanecem no snapshot da publicação anterior. Snapshot proporcional do esquema afetado: os objetos novos não existem; nenhum objeto/dado anterior é substituído pela migration. Código/DDL anteriores estão no commit base, e o ensaio PostgreSQL foi reexecutado com instalação e restauração do schema sem perda do agregado. O runtime deve guardar a mesma evidência antes da migration oficial.

Ordem aprovada: integrar patch exato → aplicar somente forward.sql pelo fluxo oficial → implantar coletor e Admin com gate novo desligado → configurar flag pública do build sem versionar .env → conferir build/diff → publicar frontend → ativar gate servidor → smoke de uma jornada real sem formulário, afiliado ou disparo. A publicação e a ativação serão confirmadas por código publicado, eventos recebidos e relatório autenticado, não apenas pela resposta “pending”.

## Integração Lovable desta etapa — sem Publish ou ativação

O pedido de 20:29 UTC separou explicitamente preparação de publicação/ativação. Esta etapa não publicou o frontend nem habilitou `LINKS_JOURNEY_ENABLED`.

- Base `4477a20a6a6bb3443be8c32ac62a8efb80800fd7`, árvore inicial limpa. 21 arquivos do patch integrados por aplicação mecânica dos hunks, sem git apply e sem editar routeTree gerada; design/CSS/hrefs de `/links` preservados, oito data-bio-choice presentes.
- Snapshot proporcional restaurável em `docs/sql/links-instagram-funnel/preflight-snapshot.md`, sem PII/secrets. Novos objetos ausentes antes do DDL; 21 acessos preservados. Quatro MD5s/ACLs anteriores idênticos depois da migration; nenhuma tabela, política, trigger ou writer anterior alterado.
- Migration oficial `drizzle/migrations/0023_links_instagram_funnel.sql`, journal/snapshot gerados somente pela ferramenta. `cmp` comprova identidade byte a byte com forward.sql integrado. SHA-256 `03758ff78de41679464ca30df329879057c1327cd83109d6f0839a50ec39bfa8`. Adaptação de regra obrigatória: antecipação do mesmo GRANT service_role para imediatamente após CREATE TABLE, antes de RLS; nenhuma mudança de privilégio ou lógica SQL.
- Pós-DDL: tabela existe, RLS ativo, policy só service_role, anon/authenticated sem SELECT/INSERT; ambas RPCs SECURITY INVOKER, EXECUTE somente postgres/service_role. A infraestrutura acrescentou ACL técnica padrão service_role/sandbox_exec na **nova** tabela; nenhuma ACL antiga foi editada.
- Deploy oficial somente `site-analytics` e `editorial-admin` bem-sucedido. Hashes da fonte submetida, incluindo arquivos/configuração: `site-analytics` `4f03ad3865c0fe80ab3350c3a0e5d93a993b9e3df4f844ada2962fe3ebc758fd`; `editorial-admin` `ae98d80313cb8ef6b8d29ae28cb6d471c0e3ac8354121a5edcfd3662f5c392c6`. Não são uma inspeção independente do bundle remoto. Config/auth intactos, nenhum secret escrito; gate servidor ausente na listagem oficial.
- Flag pública configurada pelo mecanismo documentado `defineConfig({ vite: { define: { "import.meta.env.VITE_LINKS_JOURNEY_ENABLED": JSON.stringify("true") } } })` em vite.config.ts. É uma constante pública de build, não secret, nem arquivo .env. A API instalada admite UserConfig Vite e mergeia define; módulo cliente servido em localhost comprovou `VITE_LINKS_JOURNEY_ENABLED: "true"`. PROD continua false no dev; no build de produção a coleta ainda depende do gate servidor ausente. Rollback do cliente: trocar só essa constante para false e republicar. Nenhum env alheio alterado.
- 45 testes direcionados em 7 arquivos passaram após as adaptações: journeys/client/admin, collector, Campanhas, links-campaign, affiliate e quiz-funnel. Deno check das duas funções passou; ESLint direcionado sem regra de formatação preexistente e diff-check passaram. Build automático mais recente `20:35:28Z` = OK; não rodadas suites amplas, typecheck/build manuais nem novas dependências no projeto.
- Ensaio PGlite descartável reexecutado e passou: ordem, idempotência, bounds, privacidade/permissões, retenção, saídas externas, preservação do agregado 21 e restauração por savepoint. Dependência temporária fora do projeto, sem mudanças package.json/bun.lock.
- Adaptações mecânicas de integração, sem redesign: três arquivos novos/alterados de Campanhas usam Button existente, `bg-card` no lugar de branco e `text-background` no lugar de branco sobre escuro; tokens equivalentes no tema atual. Metadata de Campanhas completada com description/OG/type/twitter conforme regra da plataforma. Nenhuma mudança do cálculo ou instrumentação além do patch.
- Preview real em 1280×1800, 390×844 e 320×800: oito superfícies brancas e atributos, links preservados, sem overflow, navegação até newsletter sem submissão, zero requests links_journey e nenhuma chave de sessão criada. Admin real deslogado exige login. Sem conta/Admin novo ou promoção.
- Prévia isolada explicitamente rotulada com **jornadas simuladas/coleta desativada**: oito destinos, quatro etapas, expansão Radar → oferta, desktop/mobile sem overflow. Capturas inspecionadas em `/tmp/browser/instagram-funnel` (temporárias, fora do Git); não comprovam leitura autenticada em produção.
- Smoke remoto da nova categoria com gate desligado retornou 204/no-store; leitura imediata oficial comprovou **zero eventos**, `/links` ainda 21. Admin com bearer inválido retornou 403. Globais após tráfego normal: 24.489 eventos diários e 6.947 horas acumuladas, versus 24.467/6.935 no snapshot; nenhuma gravação artificial nesses agregados.
- Limites: não há sessão real do solicitante para confirmar leitura autenticada integral, e a publicação/bundle produtivo final pertence à próxima etapa do responsável. Foi comprovado módulo cliente transformado + preview + build automático, não bundle publicado. SITE_ANALYTICS_ENABLED existente foi preservado sem escrita; seu valor não foi revelado e não é estabelecido apenas por um 204 da categoria desligada.
- Custo de créditos de integração não disponível nas ferramentas; nenhuma chamada paga de IA, imagem ou conteúdo. Nenhum lead/assinatura, afiliado aberto, Meta/Ads externos, cron/job/sync, writer ou histórico alterado.
- Próximos passos fora desta etapa: responsável revisa diff e faz deploy nativo; depois solicita gate servidor final e smoke autorizado. Rollback sem DROP/DELETE de histórico.
