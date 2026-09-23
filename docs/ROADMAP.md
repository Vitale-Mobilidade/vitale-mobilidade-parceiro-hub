# Roadmap Vitale Mobilidade

## 1. Objetivo final

Uma única aplicação neste projeto Lovable, em TanStack Start + React 19 + TypeScript com SSR, usando o Supabase/Lovable Cloud e as planilhas Google Sheets existentes como fontes de dados.

## 2. Etapas (ordem definida pelo responsável)

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

> Esta seção reflete o status vigente após publicação autorizada da Home v2. A seção seguinte (4) é **fotografia histórica de 22/09/2026** e não deve ser lida como status atual.

- **Mesmo projeto Lovable agora serve TanStack Start no domínio público.** A conversão nativa não criou um projeto separado: o código TanStack foi publicado no domínio existente por decisão explícita do responsável em 23/09/2026.
- **Home v2 foi publicada.** A revisão visual substancial (hero com foto original otimizada, barra de atalhos, seção de bikes em destaque, painéis de Radar/calculadora/comparador/conteúdos e bloco de grupo + newsletter) está no ambiente público.
- **Home v2.1 e `manualOnly` do assistente estão somente em rascunho.** Ajustes deixados para nova revisão (vitrine Radar com até 3 bikes, calculadora e comparador mais visuais, assistente sem autoabertura) ainda não foram publicados.
- **Banco/Sheets/Quiz/Radar/Edge Functions continuam no ecossistema atual.** Nenhuma nova migration, writer, Edge Function, job, integração de CRM ou alteração de planilha foi criada para esta publicação.
- **A publicação foi decisão explícita do responsável com pendências aceitas.** Isso não equivale a gates técnicos completos nem fecha os itens pendentes de arquitetura, SEO/GEO, performance, taxonomia e produtos futuros.

### Quadro compacto — etapas 1–5

| Etapa | O que foi entregue | O que ainda falta / não comprovado | Status |
|-------|--------------------|------------------------------------|--------|
| 1 — Base técnica TanStack/SSR/Supabase/auditoria/testes | Conversão nativa para TanStack Start v1; rotas SSR de Radar read-only; 503/404 via `headers({ loaderData })` e wrapper em `src/server.ts`; testes direcionados e build passando. | Aceite operacional; ensaio de recuperação/rollback/paridade; 503 real, `Retry-After` e `Cache-Control` ainda não comprovados em falha controlada; baseline de backup não validado. | Entrega técnica feita; aceite formal e recuperação pendentes. |
| 2 — SEO/GEO | Helper `src/lib/seo.ts`; `head()` SSR nas rotas públicas; canonical sem query/UTM; JSON-LD Organization + WebSite; `robots.txt` com `Disallow: /painel-bikes`; sitemap com URLs públicas existentes; useEffect SEO redundante do Quiz removido. | OG image dinâmico; metadata de entidades (Bike, Product, Article) quando o contrato existir; JSON-LD e sitemap dinâmicos baseados em catálogo; validação final no HTML publicado. | Parcial. |
| 3 — Performance | `RadarAssistant` lazy + `Suspense` em `src/routes/__root.tsx`; payload `getHomeCards` reduzido (até 5 cards, não 6). | PageSpeed/CWV real; medida de payload; bundle split; otimização de imagem/fonte. | Não validada. |
| 4 — Taxonomia | Regex `BIKE_ID_RE` centralizada em `src/lib/bike-identity.ts`; `docs/TAXONOMY.md` e `docs/BIKE_MODEL.md` com mapeamento; repositório Quiz usa a constante. | Rotas `/radar` e `/bikes`; slugs editoriais; aliases/redirects para 100% dos IDs legados; contrato Bike/oferta no banco. | Parcial. |
| 5 — Home B2C | Publicada visualmente; Home v2 com dados reais de `getRadarCatalog` (até 5 cards), CTAs ativos para `/escolherbike` e `/acompanhamento`, CTAs inativos claramente desabilitados para produtos sem backend; `/grupodeofertas` preservado. | Ecossistema comparador, calculadora, conteúdos e newsletter ainda não funcional; depende das etapas 19, 20, 23 e 12–18. | Visual publicado; funcionalidades pendentes. |

### Etapas 6–25

Não concluídas. Algumas estruturas e documentos preparatórios existem (contrato de bike, taxonomia, DS), mas nenhum módulo alvo está finalizado.

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

### 4.2 Revisão Home v2.1 — somente rascunho (23/09/2026, ainda não publicada neste snapshot)

- Painel Radar virara vitrine: até 3 bikes reais do array `radar` (foto/nome/preço/selo), contagem real `search.length`, SVG decorativo abstrato (não é dado), CTA ativo "Explorar Radar de preços" → `/acompanhamento`. Sem gráfico temporal, quedas ou economia.
- Calculadora: narrativa visual carro/Uber/ônibus → bike, sem valores nem botão "Calcular"; CTA ativo "Escolher minha bike" → `/escolherbike`. Calculadora funcional seguia dependente da etapa 23. Âncora `#calc` mantida.
- Comparador: duas bikes reais lado a lado com VS, sem specs nem vencedor; CTA ativo "Explorar modelos no Radar" → `/acompanhamento`. `/comparar` não existia. Âncora `#comparar` mantida.
- Assistente Vitale global (`RadarAssistant`): prop `manualOnly` no `LucasSDRWidget` removera convite e autoabertura temporizados (e seus eventos); abria só por clique. Widget do Quiz inalterado (default `false`).
- Dependências reais pendentes: backend/rotas de comparador, calculadora, conteúdos e newsletter.

## 5. Design System (rascunho)

- Parte 1 e 2 do DS aplicadas no rascunho (Home, Radar, detalhe, resultado do Quiz). Ver docs/DESIGN_SYSTEM.md.
- Evidências capturadas: 8 screenshots (Home, Radar, detalhe V8 Ultra e resultado do Quiz). Resultado do Quiz fotografado localmente com fixture temporária não comitada, respostas sintéticas, catálogo real/read-only e `leadId` nulo — sem criação de lead, alerta ou webhook.
- `pnpm validate` passou no commit `82bc781` (typecheck + 26 testes direcionados + build).
- Status pós-QA: CTO/Segurança/IA/PMO Pass; CX Pass com ressalva de dado da V8 Ultra; Produto/UX/Growth ainda não aprovam release integral por produtos pendentes.
- Não validado em produção; **não publicado**.
