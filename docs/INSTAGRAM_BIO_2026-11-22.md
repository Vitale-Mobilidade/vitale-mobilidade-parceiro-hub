# Página de links da bio — 22/11/2026

## Contexto e classificação

Estrutural por adicionar uma rota pública com metadata e caminhos para Quiz/Radar. Escopo de frontend, isolado em `codex/instagram-bio-2026-11-22`, partindo de `fa2cc75` do repositório operacional. O checkout de referência não substitui o projeto Lovable. A imagem anexada orienta apenas o layout; suas marcas, textos e URLs não são instruções nem destinos da Vitale.

## Governança — revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Entrada do Instagram reúne conteúdo, decisão e relacionamento. | Criar produto paralelo. | Rotas e canais existentes. | Prosseguir com página `/links` no mesmo aplicativo. |
| CTO e Arquitetura | Rota SSR sem loader próprio nem estado cliente. | Busca desnecessária de vídeos e overlays globais. | Excluir `/links` do loader do rodapé e overlays. | Prosseguir com alteração localizada na raiz. |
| IA e Agent Engineering | Nenhum modelo ou conteúdo gerado por IA em runtime. | Inventar fatos, ofertas ou destinos. | Endereços oficiais documentados. | Prosseguir sem chamadas de IA. |
| Segurança | Links públicos; sem formulário ou captura de PII. | Destino externo incorreto. | HTTPS e canais confirmados. | Prosseguir; Spotify sem URL fica identificado como indisponível até confirmação. |
| UX/UI | Cinco ações em coluna e três canais sociais; tokens oficiais. | Texto cortado, alvos pequenos, rolagem lateral. | Teste visual desktop/mobile, teclado e zoom. | Prosseguir com links descritivos e foco visível. |
| CX e Operação | Reutiliza `/grupodeofertas` e `/newsletter`. | Convite desatualizado ou writer duplicado. | Resolução operacional existente do grupo. | Prosseguir sem copiar convite nem criar inscrição nova. |
| Growth e CRO | YouTube primeiro, Quiz destacado, Radar canônico. | Dispersão e duplicação de conteúdo indexável. | Canonical próprio, noindex/follow e UTMs existentes. | Prosseguir sem mudanças no sitemap ou tracking. |
| PMO e QA | Entrega local revisável. | Confundir preparação com publicação. | Checks direcionados, SSR visual e `pnpm validate`. | Prosseguir localmente; release separado. |

### Conflitos e trade-offs

- O pedido põe YouTube antes do Quiz; preservar essa ordem e destacar o Quiz com o verde menta, sem mudar a navegação global.
- A referência usa botões muito largos no desktop; limitar a coluna a uma largura legível e manter uma ação por linha para leitura rápida.
- Spotify não tem endereço de programa no código inspecionado. A pergunta foi enviada ao responsável. Nenhum perfil será inventado; até confirmação o canal terá estado explícito sem link falso.
- A rota de distribuição usa `noindex, follow` para não disputar indexação com os destinos. Atribuição de campanha existente fica preservada; não ampliar contratos de analytics nesta entrega.

### Decisão consolidada

- **Escopo:** `/links`, identidade verde/menta/escuro da Vitale, logo existente, cinco CTAs e YouTube/Instagram/Spotify, responsividade, metadata e supressão dos overlays nessa rota.
- **Dependências:** base atual do GitHub sincronizado com o Lovable; links oficiais existentes; Spotify informado pelo responsável.
- **Critérios de aceite:** conteúdo em SSR; links corretos; ausência de overflow em 320/390/1440 px; foco de teclado visível; nenhum formulário/serviço novo; gate local aprovado.
- **Fora de escopo:** publicação, merge, DNS, Supabase, disparos, assinatura ou geração paga, mudanças em Quiz/Radar/grupo/newsletter.
- **Rollback:** reverter somente o diff desta branch; sem dados a restaurar. Antes de publicar, identificar versão efetivamente publicada para rollback no Lovable.

## Governança — revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Prévia local reúne os cinco CTAs na ordem solicitada e os canais sociais. Spotify está explicitamente pendente; a página não foi declarada publicada/completa para release. |
| CTO e Arquitetura | Pass | HTML inicial responde 200 com todo o conteúdo, sem loader próprio, estado ou novo serviço. Raiz dispensa vídeos de rodapé apenas em `/links`; export desnecessário removido para permitir code splitting. |
| IA e Agent Engineering | N/A | Nenhuma chamada de modelo, geração editorial, prompt ou contrato de agente alterado. |
| Segurança | Pass | Links HTTPS existentes, sem captura de PII, novos scripts externos, banco, secrets ou env no diff. Spotify sem endereço permanece sem href. |
| UX/UI | Pass | Inspeção visual em 1440, 390 e 320 px; scrollWidth igual à viewport e nenhum elemento de conteúdo fora da tela em 320 px. Texto quebra sem truncamento; links principais têm pelo menos 96 px de altura. Foco por teclado observado com outline sólido. |
| CX e Operação | Pass | Grupo usa a rota operacional de resolução de convite. Newsletter abre a inscrição existente com consentimento; não houve envio de dados ou mensagens. |
| Growth e CRO | Pass | Quiz destacado, Radar canônico, canais oficiais e canonical `/links` com noindex/follow. UTMs preservadas no href do Quiz e na navegação por teclado para newsletter. |
| PMO e QA | Pass | `pnpm validate` final: tipos, 71 testes em três arquivos e build cliente/SSR, exit 0. Diff localizado e rollback sem dados. |

### Validações e artefatos

- `pnpm validate`: aprovado após o ajuste final de code splitting. Testes de rota e preservação literal de UTMs incluem `/links`.
- Lint do novo TSX aprovado; raiz e teste de rotas aprovados com apenas a regra de formatação preexistente desativada, evitando reformatar código alheio. `git diff --check` aprovado.
- SSR HTTP 200 em `/links` com título, texto e CTAs presentes antes da hidratação e `noindex, follow`. Navegação acessível para newsletter confirmada, sem preencher ou enviar formulário.
- Screenshots desktop e mobile e `preview.html` independente, com CSS/logo incorporados e sem scripts executáveis, em `../../../artifacts/instagram-bio-2026-11-22/` (fora da branch operacional).
- O browser do Codex não permite protocolo `file:`. A prévia independente foi entregue como arquivo local; a inspeção visual aconteceu na aplicação HTTP local, sem contornar essa restrição.
- Ambiente local usou Node do runtime Codex em vez do executável protegido do ChatGPT, que recusava os bindings nativos. Dependências instaladas apenas no worktree, sem alterar manifestos ou lockfiles versionados.

### Fechamento e condição de release

**GO para revisão da prévia local; GO condicionado para release.** Falta o endereço confirmado do Spotify e autorização específica para integrar/publicar `/links` no mesmo projeto Lovable. Não houve push, merge, deploy, cobrança, alteração de dados ou publicação.

O endereço planejado, após publicação autorizada, é `https://vitalemobilidade.com/links`. Ele não é anunciado como disponível em produção. A página usa a atribuição de campanha já existente, mas `/links` ainda não está nas allowlists de pageviews GA4/site-analytics; a medição da nova entrada é uma evolução separada, sem alterar os contratos de analytics nesta task.

Rollback local: remover a nova rota e CSS e reverter somente as adições desta task na árvore gerada, raiz e teste de rotas. Para eventual release, identificar e registrar antes a versão publicada no Lovable para reversão apenas de frontend.

## Revisão de direção visual — pedido do responsável em 22/11/2026

Classificação: relevante, apenas apresentação da rota em preparação. O responsável rejeitou o excesso de informação inicial e pediu maior fidelidade à referência enviada.

### Revisão prévia e decisão consolidada

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Simplificar a entrada mantendo as oito ações pedidas. Remover slogan e descrições; prosseguir. |
| CTO | Apenas JSX/CSS locais, preservando SSR, links, metadata e raiz; prosseguir. |
| IA | Sem geração ou agente em runtime; N/A. |
| Segurança | Preservar endereços confirmados e Spotify indisponível; prosseguir. |
| UX/UI | Logo e handle compactos, botões de texto centralizado, canais em coluna como a referência; verificar 320/390/1440 px e foco. Prosseguir. |
| CX | Nenhum formulário, writer ou convite novo; prosseguir. |
| Growth | Preservar ordem, destinos e atribuição; retirar texto de apoio conforme pedido explícito. Prosseguir. |
| PMO/QA | Rever apenas apresentação; lint, inspeção responsiva e pnpm validate. Prosseguir. |

Decisão: substituir o cabeçalho promocional por logo + @vitalemobilidade, remover subtítulos e título de redes, simplificar botões e apresentar os três canais em coluna. Fora de escopo: contratos, dados e publicação. Rollback: restaurar a apresentação da primeira prévia. A redução de explicações é intencional e segue a referência do responsável.

### Revisão posterior da simplificação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Apenas logo, handle e botões solicitados; slogan e descrições removidos. |
| CTO | Pass | JSX/CSS reduzidos, SSR HTTP 200, destinos/metadata/raiz preservados. |
| IA | N/A | Sem IA em runtime. |
| Segurança | Pass | Destinos e estado indisponível do Spotify preservados. |
| UX/UI | Pass | Prévia conferida em 320/390/1440 px; sem overflow em 320 e 390 px; alvos com pelo menos 56 px, foco CSS preservado. |
| CX | Pass | Mesmos caminhos operacionais; nenhum envio ou formulário novo. |
| Growth | Pass | Ordem e destinos mantidos; apresentação segue o pedido explícito do responsável. |
| PMO/QA | Pass | Lint direcionado, diff-check e pnpm validate final aprovados: 71 testes, tipos e build SSR. |

Screenshots desta revisão: `mobile-simples.jpg` e `desktop-simples.jpg`. A prévia HTML independente e o patch foram atualizados. O texto de abertura e a disposição de canais da revisão anterior foram substituídos; demais decisões técnicas continuam. Estado: prévia local simplificada, não publicada. Spotify segue aguardando endereço confirmado.

## Direção corrigida — preservar o primeiro design

O responsável esclareceu que queria remover somente as frases do cabeçalho. A simplificação anterior ampliou indevidamente o pedido, alterando cores, cartões, ícones e canais. Esta revisão restaura o primeiro design e remove apenas o slogan e o parágrafo introdutório. Spotify confirmado pelo responsável: `https://open.spotify.com/show/4RSscwjzEskRAMNwqgA5r9?si=da3cc4fb33ce4e44`.

Classificação: relevante, exclusivamente apresentação e destino público confirmado.

### Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Restaurar a direção visual preferida, mantendo a ordem original e os textos dos cartões. Escopo exato esclarecido; prosseguir. |
| CTO | Mesmo componente SSR e CSS, sem novos serviços. Adaptar altura do fundo ao cabeçalho reduzido; prosseguir. |
| IA | Sem runtime de IA ou geração; N/A. |
| Segurança | Spotify HTTPS fornecido diretamente pelo responsável; trocar indisponibilidade por link externo com noopener/noreferrer. Prosseguir. |
| UX/UI | Restaurar fundo verde escuro, detalhes sutis, cartões claros, ícones e menta. Cabeçalho somente logo e handle; verificar mobile/desktop. Prosseguir. |
| CX | Nenhuma mudança em captura, grupo, dados ou writers; prosseguir. |
| Growth | Destinos e atribuição preservados; Spotify habilitado sem intermediação. Prosseguir. |
| PMO/QA | Lint, SSR, viewport 320/390/1440, pnpm validate e artefatos atualizados. Prosseguir. |

Decisão consolidada: recuperar a primeira composição, retirando apenas `Sua próxima bike começa aqui` e `Bikes elétricas, escolhas mais simples e uma nova forma de se mover`. Repor textos dos cartões e canais em três colunas; Spotify ativo. Fora de escopo: publicação, analytics, dados e contratos. Rollback: apresentação anterior preservada nas capturas `*-simples.jpg`; alteração só de frontend.

### Revisão posterior da direção corrigida

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Primeiro design recuperado; apenas as duas frases do cabeçalho retiradas. |
| CTO | Pass | SSR HTTP 200, sem novos serviços ou dependências; somente JSX/CSS e link confirmado. |
| IA | N/A | Nenhuma IA em runtime. |
| Segurança | Pass | Spotify exato fornecido pelo responsável presente no SSR, com rel noopener/noreferrer. |
| UX/UI | Pass | Layout inspecionado em 390/320/1440 px; sem overflow horizontal em 320/1440; cartão Spotify ativo em paridade visual com os outros canais. |
| CX | Pass | Destinos operacionais preservados; nenhum disparo ou cadastro. |
| Growth | Pass | Ordem, canais e atribuição existentes preservados. |
| PMO/QA | Pass | Lint direcionado, diff-check e pnpm validate final aprovados: 71 testes, tipos e build SSR. |

Prévia e patch atualizados. Capturas vigentes: `mobile-final.jpg` e `desktop-final.jpg`. Verificação SSR também confirma ausência das duas frases retiradas e URL exata do Spotify. As revisões anteriores são histórico de decisões, não o estado atual. A pendência de Spotify foi resolvida; permanece necessária autorização específica antes de publicar no projeto Lovable ativo. Nenhum push, merge ou deploy executado.

## Release solicitado — fundo integral e Campanhas

O responsável autorizou publicar `/links` nesta conversa e pediu fundo verde escuro com arte por toda a página, caixas da mesma cor, texto `Vídeos completos no YouTube` e contagem de acessos em Campanhas, excluída de Growth.

Classificação: estrutural por medição pública, consultas de métricas, Supabase integrado e publicação. Base operacional confirmada: `fa2cc7539bf49bab56c574c637b8e8decf9c7201`.

### Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Link de bio com identidade aprovada e medição própria. | Misturar visita de campanha com Growth. | Recorte explícito `/links`. | Prosseguir com bloco separado em Campanhas. |
| CTO | Reusar coletor e agregado diário existentes. | Trigger horário e RPCs ainda somarem `/links`. | Excluir em duas consultas e no trigger antes de habilitar coleta. | Prosseguir com três funções substituídas, sem tabelas/writers novos. |
| IA | Nenhum fluxo/modelo de IA afetado. | Geração indevida durante integração. | Integração mecânica do patch. | N/A em runtime; não gerar conteúdo. |
| Segurança | Contagens anônimas e consulta restrita a admin. | PII em URLs e leitura indevida. | Payload somente path, filtros de datas, RLS/grants preservados. | Prosseguir com testes de autorização e sem query/UTM enviada ao coletor. |
| UX/UI | Fundo escuro integral, arte discreta, todos os cartões claros. | Contraste e overflow. | Desktop/mobile e foco visível. | Prosseguir sem alterar layout além do pedido. |
| CX | Grupo/newsletter e operação preservados. | Exibir zero após falha de leitura. | Estados de erro/carregamento no bloco. | Prosseguir; falha não vira contagem zero. |
| Growth | `/links` em Campanhas, fora de total, média, páginas e horas de Growth. | Coleta habilitada antes da exclusão. | Ordem banco → Edge → frontend. | Prosseguir com replay local e verificação pós-release. |
| PMO/QA | Publicação autorizada. | Diff alheio ou migração sem rollback. | Snapshot das funções, ensaio PostgreSQL local, testes e pnpm validate. | Prosseguir condicionado aos gates e à equivalência do diff integrado. |

### Decisão consolidada

- Escopo: design final de `/links`; coleta `page_view` com path canônico via coletor existente; novo bloco Link da bio em Campanhas com o mesmo filtro de datas; exclusão exata de `/links` nas métricas Growth e no incremento horário.
- Sem nova tabela, RLS, usuário, secret, serviço pago, geração ou backfill. Rotas visitadas após sair de `/links` seguem sua medição normal.
- Dependências: snapshot das três funções de produção e contagens existentes; migration oficial com CREATE OR REPLACE preservando grants; coletor e Edge admin atualizados; integração e publicação do frontend no mesmo Lovable.
- Aceite: oito destinos reais; cartões iguais; SSR; nenhum overflow em 320/390/1440; evento sem query/PII; Campanhas lê apenas agregado de `/links`; SQL prova que visitas da bio não mudam Growth diário/horário/páginas; admin obrigatório.
- Rollback: desligar a coleta `/links` revertendo o allowlist, republicar frontend anterior e restaurar definições das três funções pelo fluxo oficial, preservando contagens acumuladas. Ensaio local testa a restauração antes de produção.
- Trade-off: relatório conta visualizações, incluindo repetições; não representa visitantes únicos. Não coletar novas dimensões ou identificadores apenas para esse relatório.

### Gate local do release

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | `/links` final mantém estrutura preferida e oito destinos; YouTube com o texto solicitado. |
| CTO | Pass | Coletor e tabela existentes; PostgreSQL local provou isolamento diário, período anterior, lista de páginas e horas. |
| IA | N/A | Nenhuma geração ou agente do produto alterado. Integração remota limitada ao patch pronto. |
| Segurança | Pass | Consulta exige admin antes da leitura; path fixo, até 366 agregados diários, payload sem query/PII; ACLs originais preservadas. |
| UX/UI | Pass | Fundo integral #082b29, arte até o fim, oito superfícies brancas; inspeção 320/390/1440 px sem overflow. |
| CX | Pass | Erro de consulta exibido como indisponível; estado sem acesso separado; nenhuma escrita em lead/grupo/newsletter. |
| Growth | Pass | Repetição na mesma rota deduplicada; `/links` isolado de todos os agregados Growth, mantendo caminhos posteriores normais. |
| PMO/QA | Pass | 31 testes direcionados; pnpm validate com 71 regressões, tipos e build SSR; lint e diff-check; restauração exata de funções/ACL e preservação de contagens em PostgreSQL local. |

GitHub recusou o dry-run de escrita com 403. O Lovable será usado somente para integrar o patch validado, executar a atualização oficial das três funções e implantar as duas Edges necessárias. Esse runtime é necessário para o Supabase integrado e sincronização sem permissão Git. Custo esperado pequeno de integração, sem chamadas de geração de conteúdo. A publicação foi autorizada pelo responsável nesta conversa; o escopo é a página `/links` e sua separação de métricas, sem alteração de schema de tabelas/RLS ou dados antigos.

Release planejado: migration oficial de três funções → implantar `site-analytics` e `editorial-admin` → conferir diff/build → publicar frontend. Rollback anterior `fa2cc7539bf49bab56c574c637b8e8decf9c7201`, com SQL original capturado em `docs/sql/links-campaign-release/rollback.sql`; nenhuma tabela nova ou remoção de dados. Canonical próprio e noindex/follow só na nova página; sitemap/robots globais não mudam.

## Integração oficial no Lovable — 22/11/2026

- Base conferida: `fa2cc7539bf49bab56c574c637b8e8decf9c7201`, árvore limpa antes da integração. Preflight de snapshots/ACL/zero eventos da etapa anterior reutilizado, sem nova auditoria prévia.
- Patch integrado por aplicação mecânica dos hunks, ignorando `src/routeTree.gen.ts`; nenhuma execução de `git apply` (comando proibido neste ambiente). A árvore foi regenerada automaticamente pelo plugin. Única adaptação no código fornecido: `instagramUrl` com optional chaining/fallback autorizado, usado em href e externalLinkProps. Verificação byte a byte contra patch adaptado passou em todos os 14 arquivos.
- Layout preservado: cinco cartões principais e três sociais, todos com fundo branco; dimensões distintas preservadas. Nenhum redesenho ou mídia gerada.
- Migration oficial aplicada: `drizzle/migrations/0022_links_campaign.sql`; `cmp` confirmou conteúdo byte a byte igual a `docs/sql/links-campaign-release/forward.sql`. SHA-256 do SQL: `67325abecd9b2953afae26da3b8aa938727db55d6bcf69005136ac12c2872d04`. Journal/snapshot criados exclusivamente pela ferramenta oficial; nenhum registro manual.
- Deploy oficial concluído somente para `site-analytics` e `editorial-admin`. SHA-256 de fonte submetida, incluindo arquivos/configuração: `site-analytics` = `3f2c8bbce6515ee9e6f6cf5344f999292d9d1492b42e4013c93781fc0cb2f75d`; `editorial-admin` = `b7fe746fff988b337a8e25f3c3f35537d54e3493547121843bece33a2994a396`. Estes são hashes informados pela ferramenta, não uma leitura independente do bundle remoto.
- Configuração intacta: `verify_jwt=false` nas duas funções; autorização Admin mantida. Smoke remoto de `links-campaign` com bearer inválido retornou 403 `Acesso não autorizado.` sem leitura de dados.
- Pós-migration read-only: três ACLs `{postgres=X/postgres,service_role=X/postgres}`, anon/authenticated sem EXECUTE e service_role com EXECUTE; search_path vazio e SECURITY INVOKER preservados. MD5 das definições: admin_public_traffic `6f5c777fbaf81b6865ea6d4bcf94b4bc`; admin_site_analytics_range `b3c883b2b7cf490587349af698562da6`; record_public_traffic_hour `70fbf4fe402d746309a218d69197347e`.
- 55 testes direcionados aprovados: 6 Links contract/segurança, 2 Campanhas UI, 47 rotas/atribuição. Deno check das duas funções passou; ESLint direcionado (sem reformatar código preexistente), diff-check e build automático da prévia passaram.
- Playwright real em 1280×1800, 390×844 e 320×800: HTTP 200 SSR, metadata, Spotify exato, oito fundos brancos, fundo #082b29, sem overflow horizontal; foco de teclado e UTMs mantidos; navegação cliente até newsletter existente sem submissão. Nenhum erro de runtime. Requisições de escrita bloqueadas na inspeção temporária para não criar eventos/dados. Screenshots inspecionados em `/tmp/browser/links-release/` (temporários, fora do Git).
- Limite de verificação: sessão própria do solicitante indisponível (`no auth user matches the requesting user's email`). Não foi criado usuário, promovida conta nem contornada autorização; leitura autenticada real de Campanhas fica para Codex/responsável. Testes locais do branch admin/read-only e bloqueio remoto passaram; fluxo autenticado completo não foi declarado verificado.
- Nenhum frontend Publish, IA/arte, newsletter, WhatsApp, Meta, job/sync, alteração de secrets/RLS/tabelas/dados históricos ou outra migration executada. Custo de créditos desta integração não disponível nas ferramentas; nenhuma chamada paga de geração feita.
- Além do patch, apenas regra arquitetural em AGENTS.md, checklist em roadmap.md, esta evidência e arquivos oficiais gerados da migration. Publicação frontend continua fora desta etapa e depende da revisão do responsável/Codex.
