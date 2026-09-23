# Roadmap Vitale Mobilidade

## 1. Objetivo final

Uma única aplicação neste projeto Lovable, em TanStack Start + React 19 + TypeScript com SSR, usando o Supabase/Lovable Cloud e as planilhas Google Sheets existentes como fontes de dados.

O legado publicado continua no ar até que a paridade funcional seja validada e o cutover seja aprovado.

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

## 3. Status honesto em 22/09/2026

- **Etapa 1**: em andamento. A conversão nativa no próprio Lovable foi feita e ainda **não foi publicada**.
- Radar e Quiz possuem leitura SSR parcial (catálogo/histórico de preços).
- Build do commit `16e6bbe741d867a07ba9af73ac7926fface8d15e` passou; isso comprova compilação, não paridade funcional.
- `/acompanhamento/d50_cross` respondeu 200 no preview com nome e preço no HTML inicial.
- A bike ausente (`/acompanhamento/zz_vitale_inexistente_404`) inicialmente respondeu 200; após a correção nativa `throw notFound()` no commit `16e6bbe741d867a07ba9af73ac7926fface8d15e`, passou a responder 404 com `noindex, follow`, sem preço nem link de compra.
- Falha real 503 **não foi simulada**.
  - **Nota:** revisão estática do código instalado (`@tanstack/react-router` v1.170.18) indica que `renderRouterToStream` usa o status do router (200/404/500/redirect) e não garante a propagação de `setResponseStatus(503)` chamado por `markRadarUnavailable`; portanto o 503, `Retry-After` e `Cache-Control` ainda não estão comprovados no documento SSR e devem ser tratados como bloqueio de release. A correção de servidor/middleware e a validação com falha controlada ficam pendentes de escopo/autorização, sem afetar o Supabase real.
- O commit `ddeddb063dbc6c6cc832825fe543af25c5e04901` substituiu o marcador SSR 503 inefetivo por headers de rota condicionais e ajuste restrito do Response HTML do Radar em `src/server.ts`; `bun run build` passou; HTTP 503 real ainda **NÃO foi comprovado** em falha controlada, portanto o gate de release segue bloqueado.
- `/painel-bikes` sem sessão apresentou apenas shell vazia no HTML inicial e herdou metadata geral indexável.
- Rota desconhecida respondeu 404, mas também herdou metadata geral.
- O commit `127ed61c6f6d2e61cd414ddcda2a4d49478181a5` adicionou title e `robots: noindex, nofollow` via `head()` SSR à rota `/painel-bikes` e removeu o efeito cliente redundante; `bun run build` passou; o HTML inicial após esse commit e o comportamento pós-login ainda **não foram verificados**.
- **Testes posteriores ao último commit não foram executados**, por instrução do responsável.
- **Etapa 2**: implementação avançou no rascunho (helper `src/lib/seo.ts` com canonical sem query/UTM; `head()` SSR na Home atual — provisória até a Etapa 5 — e em `/escolherbike`; JSON-LD global reduzido a Organization + WebSite, sem ProfessionalService; `robots.txt` com `Disallow: /painel-bikes`; `sitemap.xml` só com `/`, `/escolherbike` e `/acompanhamento`). Também foi removido o useEffect cliente redundante que aplicava metadata em `/escolherbike`; a rota segue com `head()` SSR inalterado. `bun run build` passou, mas **não foi validada no HTML final nem publicada**; **não está concluída**. Novas rotas e detalhes de bike só entram no sitemap depois do contrato Bike/oferta.
- Fallback global de title/description em `src/routes/__root.tsx` foi alinhado ao posicionamento B2C de escolha de bike e histórico de preços, e o meta `keywords` legado foi removido; o restante do SEO/Etapa 2 ainda **não foi validado no HTML nem publicado**.
- **Etapa 3**: não concluída. Otimização estática de bundle no rascunho: `RadarAssistant` passou a ser carregado por `React.lazy` + `Suspense` em `src/routes/__root.tsx`, com exclusão efetiva de `/escolherbike` e `/painel-bikes` calculada no `RootComponent` antes de montar o lazy; sem medida real de PageSpeed/CWV e sem validação no preview.
- **Etapa 4**: contrato inicial no código/docs (`src/lib/bike-identity.ts` e `docs/TAXONOMY.md`) — centralização da regex de `bike_id` e mapeamento de rotas futuras; **NÃO está concluída**. Slugs, aliases e redirects ainda pendentes de reconciliação de 100% dos IDs legados.
- **Etapa 5**: começou no rascunho — Home B2C (`src/pages/HomeB2C.tsx`) com CTAs para `/escolherbike` e `/acompanhamento`, cards de bikes monitoradas só com dados reais de `getRadarCatalog` (omitidos em falha), link para `/grupodeofertas`, `head()` B2C e sem FAQ JSON-LD de consultoria; Home legada preservada em `src/pages/Index.tsx`. `bun run build` passou; **não validada nem publicada**. Etapas 1–4 e o gate de Publish continuam pendentes.
- **Etapas 5 a 25**: não concluídas.

O site legado publicado permanece no ar.

## 4. Gates antes de publicar (cutover)

- [ ] Paridade das rotas e jornadas críticas: `/escolherbike`, `/acompanhamento`, detalhe de bike e `/painel-bikes`.
- [ ] Links afiliados exatos e diretos, byte a byte.
- [ ] Dados, Sheets, CRM, analytics, Edge Functions e jobs sem regressão.
- [ ] Comportamento de falha SSR documentado e aceito.
- [ ] Baseline do ambiente e recuperação isolada a partir do backup validada.
- [ ] Aceite operacional e plano de rollback.

> **Nota de baseline/rollback:** O Lovable History registra a ação “Adicionou rota /grupodeofertas” como **Published** em 20/09/2026 18:28 BRT, e essa versão está favoritada. O commit Git legado `6095147846fb1279ee88a77770f5ccb4832f8f79` tem o mesmo título e timestamp `2026-09-20T21:28:54Z`. Essa correspondência indica o ponto de retorno do código publicado, mas **não comprova equivalência byte a byte do artefato servido**, nem substitui o ensaio de restauração de banco/Storage. As mudanças TanStack posteriores a essa marca continuam **não publicadas**.
