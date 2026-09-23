# Roadmap Vitale Mobilidade

> Contrato de intenção de página e sinergia: ver [docs/PAGE_INTENT_AND_SYNERGY.md](./PAGE_INTENT_AND_SYNERGY.md) (governança; não autoriza implementação nem publicação).

## 1. Objetivo final

Uma única aplicação neste projeto Lovable, em TanStack Start + React 19 + TypeScript com SSR, usando o Supabase/Lovable Cloud e as planilhas Google Sheets existentes como fontes de dados.

## 2. Mapa de fases (25 etapas agrupadas)

As 25 etapas abaixo estão agrupadas em cinco fases, **sem mudar sua ordem nem marcar nenhuma como concluída**.

- **Fase A — Fundação (etapas 1–5):** base TanStack Start, SEO/GEO, performance, taxonomia de rotas/slugs e Home B2C.
- **Fase B — Entidade Bike e operações (etapas 6–11):** modelagem central da bike no Supabase, sincronização Sheets → Supabase, oferta/preço/link afiliado, novo Radar, página `/bikes/{slug}` e analytics de clique.
- **Fase C — Conteúdo e publicação piloto (etapas 12–18):** vídeos, artigos, CMS, Article Compiler IA, primeiros artigos, escala para 98 artigos e Content Graph.
- **Fase D — Ferramentas e engajamento (etapas 19–23):** comparador, newsletter, alertas de preço, podcast e calculadora de economia.
- **Fase E — Inteligência e automação (etapas 24–25):** Hotpipe IA e loop de inteligência de conteúdo.

**Dependências-chave:** o `bike_id` estável conecta preço, oferta, quiz, vídeo, artigo e comparação; as planilhas continuam como interface humana; o Supabase é a fonte central; conteúdo e comportamento dos usuários retroalimentam a pauta. Links do Mercado Livre continuam **diretos** e analytics **não bloqueantes**. A menção a “redirect intermediário” em qualquer briefing não autoriza alterar links nesta task.

### Revisão compacta squad (atualização documental)

- **Produto:** agrupamento clarifica sequência e dependências; nenhuma funcionalidade entregue.
- **CTO:** fases espelham ordem de risco técnico (Bike ID → dados → conteúdo → ferramentas).
- **IA:** Fase E depende de dados estruturados das Fases B/C; nada gerado agora.
- **Segurança:** nenhuma mudança de acesso; proposta SQL continua fora do vivo.
- **UX/CX:** nenhuma alteração de interface; links diretos preservados.
- **Growth:** prioridade de conversão na Fase B antes de escalar conteúdo.
- **PMO/QA:** status das etapas não muda; Gate 0 retirado como impedimento pelo responsável; Etapa 6 schema/backfill fechados; Etapa 7 implantada, aguardando confirmação no próximo run.

## 3. Etapas (ordem definida pelo responsável)

1. Fundação TanStack Start / SSR / Supabase / estrutura / testes / build
2. SEO/GEO: metadata, OG, canonical, JSON-LD, sitemap, robots
3. Validar SSR e performance
4. Taxonomia, rotas, slugs e relacionamentos
5. Home B2C
6. Criar entidade Bike no Supabase. Modelo central.
7. Sheets → Supabase
8. Oferta, preço e link afiliado
9. Novo Radar em `/radar` e `/radar/{bikeId}`
10. `/bikes/{slug}`
11. Analytics de clique afiliado
12. Conteúdo: Video, Article, Relations
13. CMS
14. Article Compiler IA
15. Primeiro artigo real
16. Dez artigos
17. Escalar para 98 artigos
18. Content Graph
19. Comparador
20. Newsletter
21. Alertas de preço
22. Podcast
23. Calculadora de economia
24. Hotpipe IA
25. Loop de inteligência de conteúdo

## 3. Estado atual — 23/09/2026

> Esta seção reflete o status vigente. As seções 4 e 5 são **fotografias históricas** e não devem ser lidas como status atual.

- **Mesmo projeto Lovable agora serve TanStack Start no domínio público.** A conversão nativa não criou um projeto separado: o código TanStack foi publicado no domínio existente por decisão explícita do responsável.
- **Home v2.1 foi publicada em 23/09/2026.** A revisão inclui painel Radar multi-bike (até 3 bikes reais), calculadora e comparador mais visuais, e Assistente Vitale configurado com `manualOnly` (não abre sozinho).
- **Verificação no domínio público (`vitalemobilidade.com`):** o H2 “O preço de hoje está bom?” foi encontrado na Home publicada; após 25 segundos sem interação, o chat do Assistente Vitale permaneceu fechado, permanecendo visível apenas o botão flutuante.
- **Home v2 (revisão visual inicial) também está em produção**, pois v2.1 é evolução direta da mesma branch publicada.
- **Resultado do Quiz (`/escolherbike`) em rascunho:** removidos header/footer e links visíveis de Radar na tela de resultado; o CTA "Comprar aqui" abre o link afiliado do Mercado Livre imediatamente; o Assistente Vitale na tela de resultado foi configurado com `manualOnly` (sem convite nem autoabertura).
- **Banco/Sheets/Quiz/Radar/Edge Functions (na época dessas publicações da Home):** nenhuma nova migration, writer, Edge Function, job, integração de CRM ou alteração de planilha foi criada para estas publicações.
- **A publicação foi decisão explícita do responsável com pendências aceitas.** Isso não equivale a gates técnicos completos nem fecha os itens pendentes de arquitetura, SEO/GEO, performance, taxonomia e produtos futuros.

### Quadro compacto — etapas 1–5

| Etapa                                                   | O que foi entregue                                                                                                                                                                                                                                | O que ainda falta / não comprovado                                                                                                                                                 | Status                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1 — Base técnica TanStack/SSR/Supabase/auditoria/testes | Conversão nativa para TanStack Start v1; rotas SSR de Radar read-only; 503/404 via `headers({ loaderData })` e wrapper em `src/server.ts`; testes direcionados e build passando.                                                                  | Aceite operacional; ensaio de recuperação/rollback/paridade; 503 real, `Retry-After` e `Cache-Control` ainda não comprovados em falha controlada; baseline de backup não validado. | Entrega técnica feita; aceite formal e recuperação pendentes. |
| 2 — SEO/GEO                                             | Helper `src/lib/seo.ts`; `head()` SSR nas rotas públicas; canonical sem query/UTM; JSON-LD Organization + WebSite; `robots.txt` com `Disallow: /painel-bikes`; sitemap com URLs públicas existentes; useEffect SEO redundante do Quiz removido.   | OG image dinâmico; metadata de entidades (Bike, Product, Article) quando o contrato existir; JSON-LD e sitemap dinâmicos baseados em catálogo; validação final no HTML publicado.  | Parcial.                                                      |
| 3 — Performance                                         | `RadarAssistant` lazy + `Suspense` em `src/routes/__root.tsx`; payload `getHomeCards` reduzido (até 5 cards).                                                                                                                                     | PageSpeed/CWV real; medida de payload; bundle split; otimização de imagem/fonte.                                                                                                   | Não validada.                                                 |
| 4 — Taxonomia                                           | Regex `BIKE_ID_RE` centralizada em `src/lib/bike-identity.ts`; `docs/TAXONOMY.md` e `docs/BIKE_MODEL.md` com mapeamento; repositório Quiz usa a constante.                                                                                        | Mapeamento explícito `/radar/{bikeId}` ↔ `/bikes/{slug}`; sitemap dinâmico dos detalhes. Feito e publicado: `/radar` canônica com 301 de `/acompanhamento`; `/ferramentas` real com 301 de `/calc` (301 com query/UTM verificado no domínio). | Parcial.                                                      |
| 5 — Home B2C                                            | Publicada visualmente (v2 e v2.1); Home com dados reais de `getRadarCatalog` (até 5 cards), CTAs ativos para `/escolherbike` e `/radar`, CTAs inativos claramente desabilitados para produtos sem backend; `/grupodeofertas` preservado. | Ecossistema comparador, calculadora, conteúdos e newsletter ainda não funcional; o atalho "Calculadora de economia" rola para `/#ferramentas` (âncora `#calc` mantida como alias). Depende das etapas 19, 20, 23 e 12–18.                                                            | Visual publicado; funcionalidades pendentes.                  |

### Quadro factual das 25 etapas — auditoria estática de 23/09/2026 06:51 UTC

> Legenda: **Operando** = em produção com contrato real; **Parcial** = existe e funciona em parte; **Pendente** = não existe como módulo. UI ou build sozinhos não contam como entrega. Rotas publicadas (atualizado em 23/09/2026, deployment vigente `7faa0513-44fa-4055-99c2-6b2966e6417d`; `f3211bc5-dc3d-42b3-ab9f-7a17647fc267` é snapshot da auditoria antiga): `/`, `/bikes`, `/bikes/$slug`, `/radar`, `/radar/$bikeId`, `/ferramentas`, `/escolherbike`, `/grupodeofertas`, `/painel-bikes`. `/acompanhamento[/{bikeId}]` e `/calc` existem apenas como aliases 301. Não existem `/comparar` nem `/conteudos`.

| #     | Etapa                          | Status                                                                                                                                                                       | Evidência                                                                                                                                                                                                                                                                                                                                                                                 | Próxima lacuna verificável                                                                                                                                             |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Fundação TanStack/SSR/Supabase | Operando (aceite formal pendente)                                                                                                                                            | TanStack Start publicado; `src/server.ts`; 34 migrations; 11 Edge Functions                                                                                                                                                                                                                                                                                                               | 503 com `Retry-After`/`no-store` comprovado em falha controlada                                                                                                        |
| 2     | SEO/GEO                        | Parcial                                                                                                                                                                      | `src/lib/seo.ts`; `head()` por rota; `public/robots.txt`; `public/sitemap.xml` estático com 5 URLs (`/`, `/escolherbike`, `/radar`, `/bikes`, `/ferramentas`)                                                                                                                                                                                                                                                                                        | Sitemap sem páginas de detalhe (`/radar/{id}`, `/bikes/{slug}`) por depender de geração dinâmica; JSON-LD Product/Bike; canonical entre `/radar/{bikeId}` e `/bikes/{slug}`                                             |
| 3     | SSR/performance                | Pendente (validação)                                                                                                                                                         | `RadarAssistant` lazy; heros WebP com `<picture>`                                                                                                                                                                                                                                                                                                                                         | Medição PageSpeed/CWV real no domínio publicado                                                                                                                        |
| 4     | Taxonomia                      | Parcial                                                                                                                                                                      | `src/lib/bike-identity.ts`; slug = bikeId com `_`→`-`; `docs/TAXONOMY.md`                                                                                                                                                                                                                                                                                                                 | Aliases de vídeo fixos no código; sem tabela explícita de aliases `/bikes/{slug}` ↔ IDs legados                                                                                    |
| 5     | Home B2C                       | Parcial (publicada)                                                                                                                                                          | `src/pages/HomeB2C.tsx` com cards reais (`getHomeCards`) e vídeos reais; CTAs Quiz/Radar ativos                                                                                                                                                                                                                                                                                           | Comparador, calculadora e newsletter são superfícies visuais (newsletter com campo `disabled`, sem coleta)                                                             |
| 6     | Entidade Bike                  | Operando (schema/backfill)                                                                                                                                                   | `public.bikes` 30 IDs, migration `20260923063339`; RLS fechado                                                                                                                                                                                                                                                                                                                            | Specs com fonte validada; decisão sobre IDs órfãos `jflsjdlksjdl` e `v9_max_duas_baterias`                                                                             |
| 7     | Sheets → Supabase              | Parcial                                                                                                                                                                      | Projeção em `supabase/functions/_shared/bike-projection.ts` chamada por `bike-sync.ts`; RPC `project_bikes_from_snapshot`; Edge Functions reimplantadas                                                                                                                                                                                                                                   | Primeiro run automático com `detail.bikesProjection`: consulta às 06:51 UTC mostra último run às 06:07 UTC, **anterior à implantação**, sem esse campo                 |
| 8     | Oferta/preço/link              | Parcial (shadow)                                                                                                                                                             | `public.bike_offers` 30 atuais, 20 `radar_eligible` = conjunto do RPC do Radar; preço+URL = snapshot; CHECK `meli.la` exato (migration `20260923064843`)                                                                                                                                                                                                                                  | Primeiro run com `detail.offersProjection`; leitores ainda usam snapshot/RPCs                                                                                          |
| 9     | Radar `/radar`                 | **Publicada e verificada** (deploy `22834d61-c1e0-481b-af40-1a2243c47f33`; 301 com query, 200 `/radar` e detalhe, 404 ID inexistente conferidos no domínio pelo responsável) | `/radar` e `/radar/$bikeId` (loader/head/503/404 em `src/lib/radar-routes.tsx`); `/acompanhamento[/{bikeId}]` → **301 real** em `src/server.ts` (ID literal e query preservados; comprovado por HTTP local); menu, rodapé, Home, `/bikes`, assistente e cards apontam para `/radar`; sitemap com `/radar` e `/bikes`, sem `/acompanhamento`. Mesmos links `meli.la` e preços antes/depois | Detalhes `/radar/{id}` e `/bikes/{slug}` no sitemap só com geração dinâmica confiável. Rollback: remover bloco de redirect em `src/server.ts` + reverter links; sem DB |
| 10    | `/bikes/{slug}`                | Parcial (publicada)                                                                                                                                                          | `src/routes/bikes/$slug.tsx`, `src/routes/bikes/index.tsx`: 30 bikes da planilha (inclui não elegíveis), vídeos reais, Radar quando existe                                                                                                                                                                                                                                                | Ler `public.bikes`/`bike_offers` em vez da planilha; entrar no sitemap                                                                                                 |
| 11    | Analytics afiliado             | Parcial                                                                                                                                                                      | `dataLayer` em `src/lib/radar-analytics.ts` e Quiz; Edge Function `quiz-track` (eventos do Quiz)                                                                                                                                                                                                                                                                                          | Evento de clique afiliado padronizado para todas as superfícies, com `bikeId`/oferta, sem bloquear o clique                                                            |
| 12    | Video/Article/Relations        | Parcial                                                                                                                                                                      | Vídeos: aba "Videos Youtube" → `src/lib/video-catalog.server.ts` (read-only, cache 10 min)                                                                                                                                                                                                                                                                                                | Article e Relations inexistentes; vídeo fora do Supabase                                                                                                               |
| 13    | CMS                            | Pendente                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                         | Definir fonte/fluxo editorial                                                                                                                                          |
| 14    | Article Compiler IA            | Pendente                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                         | Depende de 12–13 e fontes datadas                                                                                                                                      |
| 15–17 | Artigos (1 / 10 / 98)          | Pendente                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                         | Primeiro artigo real com fonte                                                                                                                                         |
| 18    | Content Graph                  | Pendente                                                                                                                                                                     | `bikeId` já liga bike, oferta, vídeo                                                                                                                                                                                                                                                                                                                                                      | Relações persistidas                                                                                                                                                   |
| 19    | Comparador                     | Pendente (visual na Home)                                                                                                                                                    | Bloco visual em `HomeB2C.tsx`                                                                                                                                                                                                                                                                                                                                                             | Ferramenta real sobre `bikes`/`bike_offers`                                                                                                                            |
| 20    | Newsletter                     | Pendente (visual na Home)                                                                                                                                                    | Campo desabilitado, sem coleta                                                                                                                                                                                                                                                                                                                                                            | Consentimento, provedor, envio                                                                                                                                         |
| 21    | Alertas de preço               | Parcial                                                                                                                                                                      | `PriceAlertDialog.tsx` + Edge Function `bike-price-alert` gravam interesse com `delivery_enabled=false`                                                                                                                                                                                                                                                                                   | Entrega real desativada; não anunciar alerta ativo                                                                                                                     |
| 22    | Podcast                        | Pendente                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                         | —                                                                                                                                                                      |
| 23    | Calculadora                    | Pendente (visual na Home)                                                                                                                                                    | Bloco visual sem valores inventados                                                                                                                                                                                                                                                                                                                                                       | Fórmula e fontes aprovadas                                                                                                                                             |
| 24    | Hotpipe IA                     | Pendente                                                                                                                                                                     | Nenhuma referência no código. Lucas SDR (`sdr-lucas-chat`, `LucasSDRWidget`) e Assistente do Radar são outros produtos                                                                                                                                                                                                                                                                    | Definir escopo próprio                                                                                                                                                 |
| 25    | Loop de inteligência           | Pendente                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                         | Depende de 11, 12 e 18                                                                                                                                                 |

Gate 0 (restauração): ensaio parcial em `docs/GATE0_RESTORE_REHEARSAL.md`; retirado como impedimento pelo responsável, segue não fechado.

**Próxima ordem:** (1) confirmar o primeiro run automático após a implantação e a paridade `bikes`/`bike_offers`; (2) evoluir o Radar existente para `/radar`, sem duplicar regra; (3) página Bike existente sobre os contratos novos; (4) analytics de clique afiliado; (5) conteúdo. O Quiz continua focado no clique direto no Mercado Livre e fica intocado.

**Squad (decisão de NÃO recriar):** Produto: evoluir o que já converte. CTO: uma regra, um writer, sem rotas paralelas. IA: N/A até existir grounding. Segurança: tabelas novas fechadas; nada novo exposto. UX/CX: URLs e jornadas atuais mantidas até redirect aprovado. Growth: links `meli.la` diretos e byte a byte preservados. PMO: status só avança com evidência no vivo.

### Gates de cutover ainda pendentes

- [ ] Paridade das rotas e jornadas críticas: `/escolherbike`, `/acompanhamento`, detalhe de bike e `/painel-bikes`.
- [ ] Links afiliados exatos e diretos, byte a byte.
- [ ] Dados, Sheets, CRM, analytics, Edge Functions e jobs sem regressão.
- [ ] Comportamento de falha SSR documentado e aceito.
- [ ] Baseline do ambiente e recuperação isolada a partir do backup validada.
- [ ] Aceite operacional e plano de rollback.

## 4. Snapshot histórico — 22/09/2026

> Esta seção é uma **fotografia histórica** e não representa o status vigente. Leia a seção 3 para o estado atual.

- **Etapa 1**: em andamento. A conversão nativa no próprio Lovable foi feita e ainda **não era publicada** naquele momento.
- Radar e Quiz possuem leitura SSR parcial (catálogo/histórico de preços).
- Build do commit `16e6bbe741d867a07ba9af73ac7926fface8d15e` passou; isso comprova compilação, não paridade funcional.
- `/acompanhamento/d50_cross` respondeu 200 no preview com nome e preço no HTML inicial.
- A bike ausente (`/acompanhamento/zz_vitale_inexistente_404`) inicialmente respondeu 200; após a correção nativa `throw notFound()` no commit `16e6bbe741d867a07ba9af73ac7926fface8d15e`, passou a responder 404 com `noindex, follow`, sem preço nem link de compra.
- Falha real 503 **não foi simulada**.
  - **Nota:** revisão estática do código instalado (`@tanstack/react-router` v1.170.18) indica que `renderRouterToStream` usa o status do router (200/404/500/redirect) e não garante a propagação de `setResponseStatus(503)` chamado por `markRadarUnavailable`; portanto o 503, `Retry-After` e `Cache-Control` ainda não estavam comprovados no documento SSR e deveriam ser tratados como bloqueio de release. A correção de servidor/middleware e a validação com falha controlada ficavam pendentes de escopo/autorização, sem afetar o Supabase real.
- O commit `ddeddb063dbc6c6cc832825fe543af25c5e04901` substituiu o marcador SSR 503 inefetivo por headers de rota condicionais e ajuste restrito do Response HTML do Radar em `src/server.ts`; `bun run build` passou; HTTP 503 real ainda **NÃO era comprovado** em falha controlada, portanto o gate de release seguia bloqueado.
- `/painel-bikes` sem sessão apresentava apenas shell vazia no HTML inicial e herdava metadata geral indexável.
- Rota desconhecida respondia 404, mas também herdava metadata geral.
- O commit `127ed61c6f6d2e61cd414ddcda2a4d49478181a5` adicionou title e `robots: noindex, nofollow` via `head()` SSR à rota `/painel-bikes` e removeu o efeito cliente redundante; `bun run build` passou; o HTML inicial após esse commit e o comportamento pós-login ainda **não tinham sido verificados**.
- **Testes posteriores ao último commit não foram executados**, por instrução do responsável.
- **Etapa 2**: implementação avançava no rascunho (helper `src/lib/seo.ts` com canonical sem query/UTM; `head()` SSR na Home atual — provisória até a Etapa 5 — e em `/escolherbike`; JSON-LD global reduzido a Organization + WebSite, sem ProfessionalService; `robots.txt` com `Disallow: /painel-bikes`; `sitemap.xml` só com `/`, `/escolherbike` e `/acompanhamento`). Também foi removido o useEffect cliente redundante que aplicava metadata em `/escolherbike`; a rota seguia com `head()` SSR inalterado. `bun run build` passou, mas **não fora validada no HTML final nem publicada**; **não estava concluída**. Novas rotas e detalhes de bike só entrariam no sitemap depois do contrato Bike/oferta.
- Fallback global de title/description em `src/routes/__root.tsx` fora alinhado ao posicionamento B2C de escolha de bike e histórico de preços, e o meta `keywords` legado fora removido; o restante do SEO/Etapa 2 ainda **não fora validado no HTML nem publicado**.
- Rota `/grupodeofertas` recebera `head()` SSR próprio com title/description factual, canonical, OG e `robots: noindex, follow`; URL externa, link HTML e comportamento de encaminhamento preservados. A URL **não** fora incluída no sitemap. Etapa 2 ainda **não estava validada no HTML nem publicada**.
- **Etapa 3**: não concluída. Otimização estática de bundle no rascunho: `RadarAssistant` passara a ser carregado por `React.lazy` + `Suspense` em `src/routes/__root.tsx`, com exclusão efetiva de `/escolherbike` e `/painel-bikes` calculada no `RootComponent` antes de montar o lazy; sem medida real de PageSpeed/CWV e sem validação no preview.
- **Etapa 4**: contrato inicial no código/docs (`src/lib/bike-identity.ts` e `docs/TAXONOMY.md`) — centralização da regex de `bike_id` e mapeamento de rotas futuras; **NÃO estava concluída**. Slugs, aliases e redirects ainda estavam pendentes de reconciliação de 100% dos IDs legados.
- **Etapa 5**: estava em rascunho — Home B2C (`src/pages/HomeB2C.tsx`) com CTAs para `/escolherbike` e `/acompanhamento`, cards de bikes monitoradas só com dados reais de `getRadarCatalog` (omitidos em falha), link para `/grupodeofertas`, `head()` B2C e sem FAQ JSON-LD de consultoria; Home legada preservada em `src/pages/Index.tsx`. `bun run build` passou; **não estava validada nem publicada**. Etapas 1–4 e o gate de Publish continuavam pendentes.
- **Etapas 5 a 25**: não concluídas.
- O site legado publicado permanecia no ar.

### 4.1 Estado da Home v2 — 22/09/2026 (rascunho)

- A Home B2C em `src/pages/HomeB2C.tsx` recebera **revisão visual substancial** no rascunho: novo hero com a foto original otimizada (`vitale-hero-v2.webp` e variações), barra de atalhos, seção de bikes em destaque, painéis de Radar/calculadora/comparador/conteúdos e bloco de grupo + newsletter.
- A prévia do rascunho fora inspecionada visualmente (desktop e mobile), mas **a Home v2 continuava somente na prévia**. A **versão publicada anterior permanecia em produção**; não houbera cutover.
- Nenhuma URL pública fora alterada nesta revisão. O deploy publicado servia ainda a Home anterior.
- Os CTAs de **comparador**, **calculadora**, **conteúdos** e **newsletter** continuavam semanticamente desativados: dependiam de backend/rotas (`/comparar`, `/calc`, `/conteudos`, funcionalidade de newsletter) que ainda não existiam.
- A barra de atalhos e o menu superior usavam âncoras reais (`#bikes`, `#comparar`, `#conteudos`, `#calc`) e rotas já existentes (`/acompanhamento`, `/escolherbike`, `/grupodeofertas`); nenhum link falso fora criado.
- Build/typecheck/testes direcionados passaram quando a alteração visual fora entregue, mas esta atualização documental não repetiu a suíte completa.

## 5. Snapshot histórico — 23/09/2026 (pré-v2.1)

> Fotografia do estado **após a publicação da Home v2 e antes da publicação da Home v2.1**. Leia a seção 3 para o status vigente.

### 5.1 Estado da Home v2 — 23/09/2026 (publicada)

- A Home B2C em `src/pages/HomeB2C.tsx` fora publicada no domínio existente por autorização explícita do responsável em 23/09/2026.
- A revisão visual incluía hero com a foto original otimizada (`vitale-hero-v2.webp` e variações), barra de atalhos, seção de bikes em destaque (até 5 cards), painéis de Radar/calculadora/comparador/conteúdos e bloco de grupo + newsletter.
- Os CTAs de **comparador**, **calculadora**, **conteúdos** e **newsletter** continuavam semanticamente desativados: dependiam de backend/rotas (`/comparar`, `/calc`, `/conteudos`, funcionalidade de newsletter) que ainda não existiam.
- A barra de atalhos e o menu superior usavam âncoras reais (`#bikes`, `#comparar`, `#conteudos`, `#calc`) e rotas já existentes (`/acompanhamento`, `/escolherbike`, `/grupodeofertas`); nenhum link falso fora criado.
- Build/typecheck/testes direcionados passaram quando a alteração visual fora entregue.

### 5.2 Revisão Home v2.1 — somente rascunho (23/09/2026, ainda não publicada neste snapshot)

- Painel Radar virara vitrine: até 3 bikes reais do array `radar` (foto/nome/preço/selo), contagem real `search.length`, SVG decorativo abstrato (não é dado), CTA ativo "Explorar Radar de preços" → `/acompanhamento`. Sem gráfico temporal, quedas ou economia.
- Calculadora: narrativa visual carro/Uber/ônibus → bike, sem valores nem botão "Calcular"; CTA ativo "Escolher minha bike" → `/escolherbike`. Calculadora funcional seguia dependente da etapa 23. Âncora `#calc` mantida.
- Comparador: duas bikes reais lado a lado com VS, sem specs nem vencedor; CTA ativo "Explorar modelos no Radar" → `/acompanhamento`. `/comparar` não existia. Âncora `#comparar` mantida.
- Assistente Vitale global (`RadarAssistant`): prop `manualOnly` no `LucasSDRWidget` removera convite e autoabertura temporizados (e seus eventos); abria só por clique. Widget do Quiz inalterado (default `false`).
- Dependências reais pendentes: backend/rotas de comparador, calculadora, conteúdos e newsletter.

## 6. Design System (rascunho)

- Parte 1 e 2 do DS aplicadas no rascunho (Home, Radar, detalhe, resultado do Quiz). Ver docs/DESIGN_SYSTEM.md.
- Evidências capturadas: 8 screenshots (Home, Radar, detalhe V8 Ultra e resultado do Quiz). Resultado do Quiz fotografado localmente com fixture temporária não comitada, respostas sintéticas, catálogo real/read-only e `leadId` nulo — sem criação de lead, alerta ou webhook.
- `pnpm validate` passou no commit `82bc781` (typecheck + 26 testes direcionados + build).
- Status pós-QA: CTO/Segurança/IA/PMO Pass; CX Pass com ressalva de dado da V8 Ultra; Produto/UX/Growth ainda não aprovam release integral por produtos pendentes.
- Não validado em produção; **não publicado**.

## Atualização operacional — 23/09/2026, 04:07 BRT

A primeira sincronização automática após as Etapas 6–8 concluiu com `status=ok_no_changes` em 07:07:02 UTC. `bikesProjection`: 30 atualizadas, 0 conflitos; `offersProjection`: 30 inalteradas, 0 inseridas, 0 encerradas, 0 ignoradas. A tabela `bikes` tem 30 IDs, com autonomia e capacidade preenchidas nos 30; há 30 ofertas atuais, 20 elegíveis para o Radar, e zero divergências de ID, nome, preço ou URL frente ao snapshot. `synced_at` das ofertas avançou; próxima execução às 08:07 UTC. A leitura pública de `/bikes` ainda vem da planilha; imagem e descrição ainda não foram projetadas em `public.bikes`.

O Radar foi publicado no deployment `22834d61-c1e0-481b-af40-1a2243c47f33`: `/radar` e detalhe retornam 200 SSR, ID inexistente retorna 404 e `/acompanhamento/{id}?utm_source=...` retorna 301 preservando ID e query. O Quiz não foi alterado.

Próximo gate: completar os campos reais de imagem/descrição na entidade Bike, reconciliar o catálogo público e só então mudar a leitura de `/bikes`, sem recriar a página nem alterar a oferta/Quiz.

## Atualização — campos editoriais em `public.bikes` (23/09/2026)

Migration aditiva `20260923125414` adiciona `image_url` (CHECK https), `description` e `short_description` a `public.bikes`, atualiza `project_bikes_from_snapshot` para projetá-los a partir do snapshot (`image`, `description`, `shortDescription`) e faz backfill idempotente. Valor ausente/inválido nunca sobrescreve o que já existe; sem regravação quando nada muda. Verificação no vivo: 30 bikes, 30 com `image_url`, `description` e `short_description`, 0 divergências vs snapshot; 30 ofertas atuais inalteradas. Edge Functions `sync-bike-catalog` e `bike-panel` reimplantadas. Etapa 6 passa a **operando (schema + backfill + campos editoriais)**; Etapa 7 segue operando com a mesma rotina única. Quiz, Radar, ofertas, preço, links afiliados e leitores web **não** foram alterados; leitura de `/bikes` continua vindo da planilha.

## Correção — ofertas de bikes preservadas como draft (23/09/2026)

Auditoria após a migration `20260923125414` mostrou que `v29_pro`, `v35` e `x50_action_pro` mantinham oferta atual com link/preço **antigos**, porque `mergeWithPreserved` preserva a versão anterior das linhas pendentes e esse array mesclado alimentava a projeção de ofertas.

Correção restrita à projeção de ofertas (`supabase/functions/_shared/bike-projection.ts` + repasse em `bike-sync.ts`): `result.pending` passa a ser a fonte; IDs sem **Link Vitale** e/ou **Preço R$** vão com `url`/`price` NULL à RPC existente `project_bike_offers_from_snapshot`, que encerra a oferta atual sem apagar histórico. Nenhuma alteração em schema, RPCs públicos, Quiz, Radar, `public.bikes`, snapshot de recuperação ou nas URLs das 27 bikes válidas.

Verificação no vivo (run `f5ad8c04`): 30 bikes preservadas, 27 ofertas atuais, 3 encerradas (`invalid_price`, `ended_at` preenchido, 0 deleções), 20 `radar_eligible`, 0 divergências de preço/URL vs snapshot. Testes dirigidos 9/9. Edge Functions `sync-bike-catalog` e `bike-panel` reimplantadas. Etapa 8 segue **operando (shadow)**: leitores de `/bikes` **não** foram trocados; cutover continua pendente e nada foi publicado.

## Publicação e gate seguinte — 23/09/2026, 10:14 BRT

Publicado no mesmo projeto Lovable: campos editoriais de `public.bikes` (deploy `684440ef-9958-49f1-8430-d2f668c872ba`) e correção da projeção de ofertas de linhas pendentes (deploy `a148674e-490f-4790-ae14-b1d7de9e5b64`). O Lovable confirmou “Your website was updated”. No banco após sincronização controlada: 30 bikes; 27 ofertas atuais, 3 encerradas sem exclusão; 20 elegíveis para o Radar; 0 divergências de ID/preço/URL nas 27 ofertas válidas. `/bikes`, `/radar` e `/escolherbike` responderam 200; `/acompanhamento/v8_ultra` continua 301 preservando UTM. `pnpm validate` passou (28 testes direcionados da validação geral, typecheck e build).

**Etapa 10 — cutover de leitura de `/bikes` PUBLICADO (23/09/2026, commit `c63c598`, deploy `c8b1f67e-f4dc-4ed6-bccf-440847d0269a`).** `/bikes` e `/bikes/$slug` leem `public.bikes` + oferta atual de `bike_offers` pela RPC `get_bikes_public_catalog()`, através de `src/lib/bikes-repository.server.ts`; a leitura direta do CSV saiu das páginas e fica apenas como rollback. Paridade CSV vs banco: 30/30 IDs, 0 divergências em slug, nome, autonomia, capacidade, categoria, imagem, descrição, preço e URL. Detalhe da bike usa o par preço+link do mesmo registro de oferta; Radar é observação histórica rotulada e o selo do Radar no topo só aparece com oferta ativa. Card, filtro e ordenação de `/bikes` usam só o preço comercial da oferta. 3 modelos sem oferta (`v29_pro`, `v35`, `x50_action_pro`) exibem "Link indisponível no momento". Quiz e Radar intocados (`get_quiz_catalog` = 20, `get_price_tracker_catalog` = 20). Verificado em produção no domínio: `/bikes`, `/bikes/v8-ultra`, `/radar` e `/escolherbike` 200; `/bikes/v29-pro` com "Sem oferta ativa registrada" e "Link indisponível no momento" no SSR; redirect `/acompanhamento/v8_ultra` 301 preservando UTM. `pnpm validate` passou (28 testes) e testes dirigidos do repositório/projeção (9) passaram. Rollback: reverter `editorial-bikes.functions.ts` e `bikes-discovery.functions.ts` para o leitor CSV, sem apagar tabelas.

**Pendências honestas da Etapa 10:** (a) não há prova de melhor experiência ou conversão sem análise de cliques reais — depende da Etapa 11; (b) a descrição da V8 Ultra na planilha contradiz sua autonomia estruturada (50 km vs alegação de até 80 km) — requer revisão editorial na fonte (Sheets), não no código; (c) imagens ainda grandes — otimização pendente. **Próximo gate: Etapa 11 (analytics de clique afiliado não bloqueante).**

**Etapa 11 — analytics de clique afiliado: instrumentação PUBLICADA, etapa ainda PARCIAL (23/09/2026).** Publicada pelo responsável no deployment `502f362a-df2d-418c-9a2c-511f5790b299` (código `8e6cf3a1eaed160e587d143f2543ab80f60feff4`). Evidência no domínio: `/bikes/v8-ultra` mantém o link direto `https://meli.la/2keMDer` e o bundle público contém `affiliate_click` e `mercado_livre`; `pnpm validate` passou (28 testes, typecheck, build) e os testes direcionados de analytics/repositório passaram 14/14. Contrato único em `src/lib/affiliate-analytics.ts`: evento `affiliate_click` no `dataLayer` já existente (GTM `GTM-NM9MGXNM`, carregado em `src/routes/__root.tsx`), com chaves fechadas `bike_id`, `position`, `route` (pathname, sem query/hash) e `destination` (`mercado_livre`). Sem PII, sem texto livre, sem URL completa. **Endurecimento pós-revisão de Segurança (23/09/2026):** a entrada pública aceita APENAS `bike_id` e `position` — `route` não é mais aceita do chamador: vem exclusivamente de `window.location.pathname` (sem query/hash) e só é incluída se casar com as rotas emissoras (`/bikes/{slug}`, `/radar`, `/radar/{bikeId}`); `destination` é constante `mercado_livre`; `bike_id` é validado com a regex canônica `BIKE_ID_RE` (`src/lib/bike-identity.ts`); `position` é validado em runtime contra a allowlist fechada (correspondência exata, sem trim). Qualquer campo ou valor fora disso impede a emissão — tipos TypeScript não são tratados como validação. Posições instrumentadas: `bike_detail_hero` e `bike_detail_final` (`src/routes/bikes/$slug.tsx`), `radar_detail`, `radar_highlight`, `radar_catalog` (`AcompanhamentoBike.tsx`, `Acompanhamento.tsx`, `RadarBikeCard.tsx`). O evento legado `radar_ml_click` continua sendo disparado nos três pontos do Radar, sem alteração de payload. Disparo não bloqueante: `onClick` síncrono, sem `preventDefault`, sem `await`, sem rede, `try/catch` silencioso; `href`, `target` e `rel` das URLs `meli.la` preservados byte a byte. Sem tracking em modelos sem oferta — o CTA final de `/bikes/$slug` passou a depender do par atômico preço+link da oferta atual (antes usava `bike.link` isolado). Quiz e `quiz-track` intocados.

**Pendência que impede declarar a Etapa 11 concluída:** não há destino de analytics comprovado a partir deste repositório — existe apenas o container GTM; nenhuma variável de GA4 (`G-…`) ou conector de Analytics está configurada no projeto. A coleta final em GA4 depende de mapear `affiliate_click` e suas variáveis no container GTM, o que não é verificável aqui. Nenhuma conversão foi declarada. Próximo passo verificável: criar no GTM o gatilho de evento customizado `affiliate_click` e as variáveis `bike_id`/`position`/`route`, publicar o container e conferir o evento chegando no GA4 em tempo real.

**Rollback da Etapa 11:** remover os `onClick` de `affiliate_click` nos cinco pontos e apagar `src/lib/affiliate-analytics.ts` (+ teste). Nada em banco, sync, Quiz ou links afiliados muda. Para voltar o CTA final de `/bikes/$slug` ao comportamento anterior, trocar a condição `offer` por `bike.link` — não recomendado, pois reintroduz botão sem preço da mesma oferta.

## Etapa de taxonomia/navegação — `/ferramentas` e aposentadoria de `calc` (23/09/2026, prévia)

- **Decisão:** abandonar "acompanhamento" e "calc" como nomes públicos. Radar canônico em `/radar` (já publicado) e ferramentas em `/ferramentas` (nova rota real, em prévia).
- **Entregue:** `src/routes/ferramentas.tsx` (SSR, H1 único, `head()`/canonical próprios, mobile-first) listando com CTA apenas Quiz, Radar e catálogo; comparador e calculadora citados sem CTA e sem número. Header, menu mobile, rodapé e atalhos da Home apontam "Ferramentas" para `/ferramentas`. Bloco da calculadora na Home passou a ter ID canônico `#ferramentas`, com `#calc` mantido como âncora alias (sem H2 duplicado). Redirect 301 `/calc` e `/calc/` → `/ferramentas` preservando query/UTM, centralizado em `src/lib/legacy-redirects.ts` e aplicado em `src/server.ts` antes do SSR; os 301 de `/acompanhamento[/{bikeId}]` → `/radar[/{bikeId}]` foram preservados. Sitemap com `/ferramentas`.
- **Comprovado (local, HTTP real):** `/calc` → 301 `/ferramentas`; `/calc/?utm_source=yt&x=1` → 301 `/ferramentas?utm_source=yt&x=1`; `/acompanhamento/v8_ultra?utm_source=t` → 301 `/radar/v8_ultra?utm_source=t`; `/ferramentas` 200 com canonical `https://vitalemobilidade.com/ferramentas`; rota inexistente 404. 18 testes direcionados + typecheck + build.
- **Não comprovado:** comportamento no domínio publicado (depende do Publish do responsável); nenhum ganho de tráfego/conversão medido.
- **Rollback:** remover o bloco de redirect em `src/server.ts` (ou a função `legacyToolsRedirect`), reverter os links de "Ferramentas" para `/#calc` e retirar `/ferramentas` do sitemap. Nada de banco, Quiz, preço, elegibilidade, link afiliado ou analytics envolvido.

---

**Etapa 12 (incremento) — Radar público desacoplado da elegibilidade do Quiz + histórico arquivado (23/09/2026, PREVIEW, não publicado).**

Migration `20260923142233_8a61d066-b019-4543-9aa3-b6f6b7f482b2.sql`: substitui apenas `get_price_tracker_catalog()` e `get_bike_price_history(text,int)`. Nenhum INSERT/UPDATE/DELETE, nenhuma mudança de schema, RLS, grants ou writer; `get_quiz_catalog()` intocada. Detalhe do contrato em `docs/BIKE_MODEL.md` §16.

Estado verificado (leitura pela chave publicável + prévia local):
- Radar ativo: **27 bikes** com oferta atual válida (eram 20), incluindo as 7 que o Quiz classifica como não elegíveis. Preço e link sempre da mesma linha de `bike_offers`; 0 divergências e 0 URLs fora do padrão `meli.la`.
- Paridade das 20 já públicas: preço e link idênticos, nenhuma saiu do Radar.
- Sem oferta no momento: **3 bikes** (`v29_pro`, `v35`, `x50_action_pro`) em seção própria no fim de `/radar` ("Sem oferta no momento (3)"), fora dos rankings e do destaque; o indicador do hero é "Modelos com histórico" e soma 30 (27 com oferta + 3 sem). Não são "arquivadas" como entidade: só a oferta está indisponível agora e o preço validado segue no histórico. Detalhe acessível em `/radar/{bikeId}` sem preço atual, sem farol, sem CTA do Mercado Livre e sem alerta; `/radar/v35` traz "Último preço verificado" R$ 11.500 com data da última confirmação (22/09/2026) e "última alteração de preço registrada em 10/09/2026", mais o gráfico real (15 dias confirmados, 12 reconstruídos, desde 27/08/2026) com o ponto vermelho de indisponibilidade explicado.
- `PriceIntelPanel` declara a evidência da janela em nota transparente ("18 dia(s) confirmados e 10 reconstruído(s), em 28 dia(s) do período · a partir de 27/08/2026"). **Correção de leitura (ajuste do responsável):** com histórico curto/descontínuo a página é descritiva — não existe selo "Histórico em formação" no topo nem no painel, nem selo positivo derivado de cobertura; mostra preço atual, mínimo/mediana/máximo dos registros reais e a posição na escala colorida como referência visual, sem dizer se está barato ou caro. `dailyMetrics`, thresholds e a proveniência (confirmado vs reconstruído) não mudaram; dias reconstruídos continuam marcados como tais.
- Quiz: `get_quiz_catalog()` = 20, `/escolherbike` sem alteração. Home e `/bikes` continuam recebendo só o catálogo ativo (filtro em `fetchTrackerSplit`).
- Verificação: typecheck, build e testes dirigidos (radar-archived 3, radar-rankings 12, quiz-radar-regression 6, radar-base 2, bikes-repository 5, affiliate-analytics 9).

Arquivos: `src/lib/radar-repository.server.ts` (`fetchTrackerSplit`), `src/lib/radar.functions.ts`, `src/components/radar/ArchivedHistorySection.tsx` (novo), `src/components/radar/PriceIntelPanel.tsx`, `src/pages/Acompanhamento.tsx`, `src/pages/AcompanhamentoBike.tsx`, `src/lib/radar-archived.test.ts` (novo).

Ressalva: o linter do Supabase mantém os avisos pré-existentes (RLS sem policy em 15 tabelas; RPCs SECURITY DEFINER executáveis por anon/authenticated, que é o desenho público intencional). Nenhum aviso novo.

Rollback: restaurar as definições anteriores das duas funções e reverter os arquivos acima; nenhum dado de preço/histórico é tocado.

---

**Etapa 12 (incremento) — Radar sem selos automáticos na listagem (23/09/2026, PREVIEW, não publicado).**

Ajuste de copy pedido pelo responsável após verificar a produção: a listagem `/radar` ainda exibia badges "Bom preço", "Menor preço observado" e "Histórico em formação" (inclusive na FT03). Selos comerciais ficam restritos a `/bikes/{slug}` (`CommercialPriceBadge`, intacto); `/radar/{bikeId}` continua sem selo.

- `src/components/radar/RadarBikeCard.tsx`: removido o `Badge` de classificação.
- `src/components/radar/BikeSearchCombobox.tsx`: removido o selo das sugestões.
- `src/pages/Acompanhamento.tsx`: título fixo "Destaque do Radar", `PriceStatus` removido do destaque, legenda do rodapé sem `Badge`.
- `src/lib/radar-rankings.ts` — `shortDiagnosis`: diferença zero → "Hoje está igual ao preço típico do período."; `forming` → "É o menor preço registrado por nós até agora." (quando verdadeiro) ou "Preço registrado no histórico da Vitale."; nenhuma frase de "formação".
- Sem mudança em cálculo, `classification`, backend, rankings, preços, datas, links/CTA ou Quiz. As 27 ativas + 3 sem oferta já em produção via RPC seguem iguais.
- Verificação: typecheck, build, testes dirigidos (radar-rankings 14, radar-archived, radar-unavailable, commercial-badge) e conferência ao vivo em `/radar` (nenhum dos textos removidos aparece; "Destaque do Radar" presente).


---

## Ferramentas de Mobilidade — 1ª entrega: arquitetura de motores + calculadora de economia (23/09/2026, PREVIEW, não publicado)

**Escopo entregue (somente esta etapa; as outras oito calculadoras NÃO foram iniciadas).**

- **Motores puros e testáveis** em `src/lib/mobility/`:
  - `config.ts` — regras centrais: `WEEKS_PER_MONTH = 52/12`, `AUTONOMY_SAFETY_MARGIN = 1.2`, `MAX_RECOMMENDATIONS = 3`, `MELI_LINK_RE`, `LIMITS` de plausibilidade e `roundMoney` (centavos).
  - `cost-engine.ts` (**MobilityCostEngine**) — economia mensal/anual determinística. Fórmula: `diasNoMes = diasPorSemana × 52/12`; `kmNoMes = kmPorDia × diasNoMes`; `kmSubstituidos = kmNoMes × pct`; `custoAtualSubstituido = variável proporcional (+ fixos somente se o usuário deixar de manter o veículo)`; `custoDaBike = kmSubstituidos × energiaPorKm + manutençãoMensal (pct > 0)`; `economiaMensal = custoAtualSubstituido − custoDaBike`; `economiaAnual = mensal × 12`. Modais: carro, moto, Uber, transporte público e misto. Economia ≤ 0 é exibida como está. Entrada inválida (não finita, negativa, fora dos limites, consumo 0) devolve `ok:false` com erros — não há divisão por zero nem valor "padrão".
  - `time-engine.ts` (**MobilityTimeEngine**) — fundação de tempo (minutos/dia e horas/mês a partir de velocidades informadas). Não é renderizada nesta página; existe para as rotas futuras.
  - `recommendation-engine.ts` (**BikeRecommendationEngine**) — filtro verificável + ordenação explicada; nenhum score inventado.
- **Rota nova `/calculadoras/economia`** (`src/routes/calculadoras/economia.tsx`): SSR, H1 único, `head()` com título/description/canonical/OG/Twitter próprios e JSON-LD `WebApplication`. Formulário progressivo em 3 etapas, mobile-first, com todas as premissas visíveis e editáveis. **Nenhuma captura de nome, e-mail ou telefone**; nada sai do navegador. Sem amortização do preço da bike — payback fica para a rota futura.
- **Bikes compatíveis no resultado** (`src/lib/mobility-bikes.functions.ts`): interseção exata por `bikeId` entre `get_quiz_catalog` (apenas `status = "eligible"`) e `get_bikes_public_catalog` (par atômico preço+link da oferta atual). Filtros: link `https://meli.la/...` válido, preço > 0, `autonomyKm ≥ kmDiário × 1.2`, capacidade ≥ 2 quando há garupa, orçamento máximo quando informado. Ordenação determinística: preço asc → autonomia desc → `bikeId`. Máximo 3 cards, cada um com imagem real, preço com fonte, autonomia/capacidade, motivo calculado, CTAs `/bikes/{slug}`, `/radar/{bikeId}` **só quando a bike está no catálogo ativo do Radar**, e link afiliado byte a byte. Falha de fonte ou zero compatíveis → mensagem honesta, sem relaxar filtro e sem preço/link inventado. **Quiz e Radar intocados.**
- **Analytics:** nova posição fechada `calculadora_economia` e rota `/calculadoras/economia` na allowlist de `src/lib/affiliate-analytics.ts`. Disparo síncrono, sem `preventDefault`, nunca bloqueia o clique; `href`/`rel`/`target` preservados.
- **Ligações:** `/ferramentas` ganhou o card da calculadora (CTA real); a Home e o rodapé passaram a apontar "Calculadora de economia" para `/calculadoras/economia`; `public/sitemap.xml` recebeu apenas essa rota funcional. As demais oito calculadoras seguem como plano interno, **sem link público**.
- **Verificação:** 15 testes dirigidos dos motores (zero, inválidos, 0%/100%, economia negativa, veículo mantido x vendido, arredondamento, autonomia/capacidade/orçamento, link/preço inválidos, lista vazia), `bun run validate` (typecheck + testes da validação geral + build) e conferência viva em desktop (1280px) e celular (390px) de `/calculadoras/economia`: resultado mensal/anual, detalhamento, 3 bikes reais com link `meli.la`, sem erro de console.
- **Não comprovado:** comportamento em produção (nada publicado) e qualquer efeito em conversão.
- **Rollback:** remover `src/routes/calculadoras/`, `src/lib/mobility/`, `src/lib/mobility-bikes.functions.ts`, a entrada do sitemap, a posição de analytics e reverter os links de Home/rodapé/`/ferramentas`. Nada de banco, RLS, Sheets, Edge Functions, Quiz, Radar ou preços foi tocado.

### Correção de credibilidade da 1ª entrega (23/09/2026, PREVIEW, não publicado)

Revisão do responsável sobre o commit `3637e505` apontou três quebras de contrato; contrato final:

1. **Nenhum número é presumido pela Vitale.** `/calculadoras/economia` carrega com todos os campos de cálculo
   **vazios** e **sem modal pré-selecionado** ("Como você se desloca hoje? (escolha uma opção)"). Campos que podem
   legitimamente ser zero (pedágio/estacionamento, custos fixos, manutenção da bike) trazem a instrução explícita
   "Digite 0 se você não tem esse custo" — o zero é uma declaração do usuário, não um valor nosso. A etapa 1
   (modal, dias/semana, km/dia, % substituível) é validada antes de avançar e a etapa 2 (custos do modal, custos da
   bike, orçamento opcional) antes de mostrar qualquer resultado. Erros aparecem junto ao campo (`aria-invalid` +
   `aria-describedby`) e em um resumo `role="alert"`; os campos têm `id`/`label` ligados e são navegáveis por teclado.
   Voltar preserva tudo o que já foi digitado. Com 0% de substituição não há sugestão de modelos, e o texto diz por quê.
2. **Orçamento máximo é opcional, mas nunca "corrigido".** Em branco = não filtrar por preço. Preenchido, precisa
   ficar entre `LIMITS.budget` (1 a 200000); valor inválido, ≤ 0 ou fora da faixa faz `recommendBikes` devolver
   `{ ok: false, errors }` — **nenhuma bike é recomendada até o usuário corrigir**. `recommendBikes` passou a devolver
   `RecommendationResult` (`{ ok: true; bikes }` | `{ ok: false; errors }`) em vez de array. No motor de custo,
   `keepsVehicle` precisa ser booleano de verdade: `undefined` é erro ("Manter o veículo: responda…"), nunca
   interpretado como "vendeu o veículo". No modal misto, campo e "Como calculamos" avisam que custo fixo de carro/moto
   mantido não entra no valor substituível.
3. **MobilityTimeEngine passou a falar em minutos.** Contrato: `currentMinutesPerDay` (ida + volta, informados),
   `bikeMinutesPerDay` opcional, `daysPerWeek` e `weeksPerYear` editável (padrão explícito `WEEKS_PER_YEAR = 52`).
   Saídas: `daysPerYear`, `savedMinutesPerDay`, `currentHoursPerYear`, `bikeHoursPerYear`, `savedHoursPerYear`,
   `savedFullDaysPerYear` (÷24) e `savedWorkdaysPerYear` (÷8). Zero é zero, resultado negativo (bike mais lenta) é
   devolvido como está e nenhuma velocidade é presumida — km/h saiu do contrato.

**Provas:** 21 testes dos motores (10 custo, 4 tempo, 7 recomendação), incluindo orçamento inválido recusado,
`keepsVehicle` ausente recusado, tempo zero/negativo e semanas por ano configuráveis; `bun run validate`
(typecheck + testes + build); conferência viva em 1280px e 390px: nenhum campo preenchido ao carregar, nenhum modal
marcado, etapas 1 e 2 bloqueadas quando vazias, orçamento negativo barrado, cenário 0% sem modelos e cenário real
(Uber, 5 dias, 20 km, 70%) com economia calculada e 3 bikes com link `meli.la`. Nada publicado; Supabase, ofertas,
links, Quiz e Radar intocados.

### Ajuste visual do topo da calculadora (23/09/2026, PREVIEW, não publicado)

O hero escuro de `/calculadoras/economia` ocupava ~620 px no desktop 1280x720 e empurrava o formulário inteiro para
abaixo da dobra; no mobile 390x844 o H1 longo ocupava 6 linhas. Ajuste **local desta rota** (sem tocar no hero da
Home, Bikes ou Radar, nem nos estilos globais `entry-h1`/`section-h2`):

- H1 direto conforme o briefing: "Quanto você pode economizar por mês usando uma bike elétrica?", com override de
  tamanho apenas nesta página (`text-2xl sm:text-3xl lg:text-4xl`).
- Suporte reduzido a 2 frases; paddings do topo de `py-12 sm:py-16` para `py-7 sm:py-9` e da área do formulário de
  `py-10 lg:py-14` para `py-8 lg:py-10`.
- Primeira escolha do formulário (os 5 modais) visível acima da dobra no desktop 1280x720 e no mobile 390x844.

**Pendência registrada — imagem OG da rota:** a página não exibe imagem própria no hero (topo escuro só com texto),
e nenhum ativo de marca existente em `public/` é a imagem que a página mostra. Pela regra de OG do projeto
(`og:image`/`twitter:image` só apontam para a imagem que a página exibe, em tamanho de compartilhamento ~1200x630),
**nenhuma tag de imagem foi adicionada** — `logo-192.webp` é pequeno demais e os `vitale-hero-*.webp` (1280x720)
não são exibidos nesta página. Pendência: quando houver uma imagem real desta página (ou decisão de criar uma
arte 1200x630 aprovada), adicionar `og:image`/`twitter:image` no `head()` da rota. Até lá, o compartilhamento usa
título e descrição.

### Refação para ferramenta rápida em uma tela (23/09/2026, PREVIEW, não publicado)

Direção de produto corrigida após a primeira calculadora: `/calculadoras/economia` deixou de ser um wizard técnico de
três etapas e passou a ser o padrão de experiência antes da expansão das demais calculadoras. As outras oito rotas
continuam não implementadas e sem links públicos.

- **Uma tela e resultado reativo:** sem etapas, submit ou botão Calcular. O topo continua compacto; a área principal
  reúne modal atual, gasto mensal aproximado, km/dia, dias/semana, percentual substituível e orçamento opcional, mais
  o toggle de garupa. Todos começam vazios/sem seleção. O resultado só aparece quando os obrigatórios são válidos;
  erros locais usam `aria-invalid`/`aria-describedby`. Orçamento oferece sem limite, presets de R$ 5/7/10/15 mil e
  outro valor; zero, negativo, não finito ou fora de `LIMITS.budget` nunca vira “sem limite”.
- **Contrato rápido no `MobilityCostEngine`:** preservado o cálculo detalhado anterior e adicionado `computeQuick`.
  `gastoSubstituível = gastoMensal × percentual`; `kmSubstituídos = km/dia × dias/semana × 52/12 × percentual`;
  `custoBike = kmSubstituídos × R$ 0,05/km + R$ 30/mês quando há uso`; `economiaMensal = gastoSubstituível − custoBike`;
  anual = mensal × 12. As duas premissas operacionais ficam centralizadas em `QUICK_BIKE_COST` e expostas em “Como
  calculamos?”. Para carro/moto, o gasto informado exclui seguro, IPVA e custos fixos do veículo mantido. Compra da
  bike não entra na economia operacional. Zero e resultado negativo são preservados.
- **Até duas bikes reais:** `recommendQuickComparison` mantém os filtros rígidos existentes (elegibilidade, oferta
  atômica atual, preço positivo, link `meli.la`, autonomia com margem, capacidade e orçamento). Mostra a compatível de
  menor preço e, quando existe, uma alternativa distinta priorizada por autonomia/capacidade. Sem score e sem “melhor
  bike”. Mudanças em km, orçamento, garupa ou percentual atualizam a lista; 0% mostra nenhuma bike.
- **Projeções:** `MobilityProjectionEngine` calcula custo acumulado do trajeto atual e da bike (preço real da oferta +
  operação) em 12/24/36 meses, payback apenas com economia mensal positiva e saldo `economiaMensal × meses − preço`.
  No gráfico, 0 mês começa em zero para o trajeto atual e exatamente no preço real da bike selecionada; 12/24/36 permanecem os pontos do motor.
  Um SVG local, sem biblioteca de gráfico, destaca a bike selecionada sem recarregar. Cards mostram imagem, fatos,
  preço/fonte, autonomia/capacidade, motivo, payback/saldos e somente CTAs reais: bike, Radar quando monitorada e link
  afiliado direto com analytics não bloqueante. Nenhum CTA de comparação ou caixa genérica foi adicionado.
- **Limites e escopo:** estimativas não são garantias e excluem financiamento, inflação, revenda, depreciação e
  imprevistos. SSR, metadata/canonical/JSON-LD, leitores e links existentes foram preservados. Sem alteração em Quiz,
  Radar, banco, RLS, Sheets, ofertas, links, scripts operacionais ou publicação.


## Calculadora de payback + componentes compartilhados (23/09/2026, PREVIEW, não publicado)

- Extraídos sem mudar UX/cálculo da Economia: `src/lib/mobility/format.ts` (brl, decimal, parseNumber, validateNumber, resolveBudget) e `src/components/mobility/calculator-ui.tsx` (NumberField, Metric, BudgetSelector, PassengerToggle, BikeResultCard com `position` de analytics). `BUDGET_PRESETS` em `config.ts`.
- Nova rota `/calculadoras/payback` (SSR, head/canonical/JSON-LD próprios, sitemap, card em /ferramentas). Uma tela, 6 controles: gasto mensal evitável, % substituível, km/dia, dias/semana, orçamento (Sem limite, 5/7/10/15 mil, Outro valor) e garupa. Resultado imediato, sem botão/etapas.
- Contrato (`src/lib/mobility/payback-engine.ts`): custo = `computeQuickMobilityCost` com gasto já evitável (nenhum custo fixo somado); por bike, `computeCostProjection` (payback = preço ÷ economia mensal positiva, ↑0,1 mês; saldos 12/24/36 = economia × meses − preço; economia ≤ 0 → sem payback). Insight determinístico usa o menor payback real.
- Bikes: `getMobilityBikeCandidates` + `recommendQuickComparison` (máx. 2; mesmos filtros estritos). Gráfico compartilhado inicia com preço real no mês 0. Analytics `position: "calculadora_payback"`, não bloqueante.
- Demais 7 calculadoras seguem apenas planejadas; não são exibidas ao público.


## Custo anual de mobilidade (23/09/2026, PREVIEW, não publicado)

- Rota `/calculadoras/custo-anual-mobilidade` (SSR, head/canonical/JSON-LD próprios, sitemap, card em /ferramentas). Pergunta: "Quanto você realmente gasta por ano para se locomover?".
- 5 entradas vazias ao carregar (carro/moto, Uber/99, transporte público, estacionamento/outros em R$/mês; percentual substituível 0–100). Gastos são OPCIONAIS: branco = ausente (vira 0 só quando outra categoria tiver valor, via `normalizeOptionalSpend`); 0 digitado é resposta honesta. Resultado só aparece com pelo menos um gasto preenchido e percentual válido; tudo vazio = estado inicial. Negativos/NaN/fora de limite seguem erro local.
- Cálculo em `computeAnnualMobilityCost` (`src/lib/mobility/cost-engine.ts`): mensal = soma; anual = × 12; substituível = mensal × % (e × 12). 4 métricas + insight determinístico (maior categoria). Parcela substituível é rotulada como potencial, nunca economia garantida.
- Sem recomendação de bikes (sem km/dia não há filtro honesto). CTA "Simular economia com bike" → `/calculadoras/economia` sem repassar valores; lá a pessoa confirma só custos que desapareceriam.
- Contrato global das 9 rotas: `docs/MOBILITY_TOOLS_UX.md` (6 restantes nomeadas e PLANEJADAS, sem link). Testes: `src/lib/mobility/annual-cost.test.ts` e casos de gasto opcional em `src/lib/mobility/cost-engine.test.ts`.

- `/calculadoras/uber-vs-bike` (23/09/2026, PREVIEW, não publicado): uma tela, 6 controles (gasto mensal total com Uber/99, % de corridas substituíveis, km/dia, dias/semana, orçamento opcional, garupa). Reusa `computeQuickMobilityCost` (modal uber), projeção, `recommendQuickComparison` e UI compartilhada; métricas: gasto anual atual, substituível mensal, economia líquida mensal/anual; até 2 bikes reais; analytics `calculadora_uber_vs_bike`; sitemap e card em /ferramentas. Custo Anual: ressalva de custos fixos só aparece no resumo quando há gasto em carro/moto > 0.
- `/calculadoras/carro-vs-bike` (23/09/2026, PREVIEW, não publicado): 6 controles + garupa; `computeQuickMobilityCost` ganhou `keepsVehicle`/`fixedAvoidedMonthly` opcionais (custo fixo só com keepsVehicle === false e valor digitado, somado integralmente; nunca estimado). Métricas: gasto evitável, custo da bike, economia líquida mensal/anual, payback da bike selecionada. Analytics `calculadora_carro_vs_bike`; sitemap e card em /ferramentas. Uber vs bike: campo renomeado para "Distância por dia nas corridas avaliadas" e insight em "economia líquida estimada".
- `/calculadoras/transporte-publico-vs-bike` (23/09/2026, PREVIEW, não publicado): gasto, tempo atual, tempo de bike, dias, km/dia, orçamento + garupa; `computeQuickMobilityCost` (100% do subconjunto) + `computeMobilityTime` (52 semanas); métricas: economia mensal/anual, tempo recuperado/adicional por ano, benefício dominante determinístico; analytics `calculadora_transporte_publico_vs_bike`; sitemap e card. Correção no motor rápido: com 0% de substituição, custo fixo evitado não entra (igual ao motor detalhado).
- `/calculadoras/moto-vs-bike` (23/09/2026, PREVIEW, não publicado): mesma UX do Carro via componente compartilhado `VehicleVsBikeCalculator` e `computeVehicleVsBike` (`vehicle-vs-bike.ts`, modo rápido carro/moto; regras de custo fixo e 0% preservadas). Carro migrado sem mudança de comportamento. Analytics `calculadora_moto_vs_bike`; sitemap e card. Transporte público: sem ganho em dinheiro nem tempo, a copy diz apenas que não houve ganho com a bike.
- `/calculadoras/tempo-no-transito` (23/09/2026, PREVIEW, não publicado): `computeMobilityTime` + novo `computeTimeProjection` (1/3/5 anos) e `TimeProjectionChart` SVG; métricas: horas/dias hoje e de bike por ano, diferença por semana/ano (negativa com copy honesta); até 2 bikes só com km/dia, sem payback/custo (`BikeResultCard` aceita `projection` opcional). Semanas/ano editável em "Como calculamos?". Analytics `calculadora_tempo_no_transito`; sitemap e card.
