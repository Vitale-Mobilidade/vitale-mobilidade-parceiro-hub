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
6. Página Bike
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
- Build da versão `44ed115b` passou.
- **Testes posteriores ao último commit não foram executados**, por instrução do responsável.
- **Etapa 2** tem apenas metadata parcial do Radar; **não está concluída**.
- **Etapas 3 a 25**: não concluídas.

O site legado publicado permanece no ar.

## 4. Gates antes de publicar (cutover)

- [ ] Paridade das rotas e jornadas críticas: `/escolherbike`, `/acompanhamento`, detalhe de bike e `/painel-bikes`.
- [ ] Links afiliados exatos e diretos, byte a byte.
- [ ] Dados, Sheets, CRM, analytics, Edge Functions e jobs sem regressão.
- [ ] Comportamento de falha SSR documentado e aceito.
- [ ] Baseline do ambiente e recuperação isolada a partir do backup validada.
- [ ] Aceite operacional e plano de rollback.
