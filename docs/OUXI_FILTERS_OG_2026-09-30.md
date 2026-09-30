# Correção Ouxi, busca editorial e imagens de compartilhamento

## Governança — revisão pré-implementação

Classificação: **estrutural**. Altera conteúdo editorial em Supabase, descoberta pública e admin, metadata SEO e Radar. Base operacional: `origin/main` em `b046be3`. O checkout `vitale-codex` é somente referência e não contém os artigos publicados.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Marca correta e busca por modelo | Artigo sobre outra bike alterado indevidamente | Relação por `bike_id` e revisão textual | Prosseguir com inventário exato |
| CTO e Arquitetura | Filtros React e OG SSR; dados Supabase | Metadados inconsistentes ou cache antigo | Checkout operacional, RPCs existentes | Preservar SSR e URLs canônicas |
| IA e Agent Engineering | Capas e texto gerados previamente | Regeneração mudar fatos ou alegações | Revisão humana do conteúdo final | Substituição pontual, sem regenerar corpo inteiro |
| Segurança | Admin e escrita em produção | Edição em massa ou acesso indevido | Fluxo autenticado, revisão e backup | Escrita limitada por IDs e revisão |
| UX/UI | Filtros de busca e OG legíveis no WhatsApp | Opções demais e texto cortado | Teste visual 1200×630 e mobile | Busca por modelo e filtros claros |
| CX e Operação | Localizar artigos relacionados | Resultado vazio confuso | Catálogo de bikes e nomes | Estado vazio e contador de resultados |
| Growth e CRO | Nome correto em resultados e compartilhamentos | Slug antigo e previews cacheados | Mapa de migração SEO | Preservar slug até mapa aprovado; OG com URL versionada |
| PMO e QA | Release verificável | Publicação parcial gera inconsistência | Testes dirigidos, `pnpm validate`, smoke | Publicar somente conjunto revisado |

### Conflitos e decisão consolidada

- **Slug vs marca:** slugs legados com `wanshida` são URLs indexadas; manter a URL nesta entrega e corrigir título, corpo, resumo, SEO e arte. Redirect depende de mapa SEO aprovado.
- **Geração vs precisão:** não reescrever fatos técnicos ao trocar a marca. Corrigir apenas ocorrências que se referem a GT2000, V8 Pro ou V8 Pro S.
- **Publicação vs acesso:** o pedido autoriza publicação deste escopo, mas a escrita precisa passar por validação local e revisão posterior antes do deploy. Se faltar acesso autenticado, entregar artefatos prontos e registrar o bloqueio.
- **Escopo:** artigos vinculados aos três IDs e qualquer menção pública comprovada a essas bikes, filtros público/admin, OG das páginas públicas que não são artigos (inclusive Radar, ferramentas, grupo e privacidade). Excluir admin e aliases 301 do conjunto de artes promocionais.
- **Critérios de aceite:** nenhuma referência incorreta à marca nos campos públicos dos artigos atingidos; capas corrigidas; filtro de modelo nos dois índices; OG 1200×630 com mensagem identificável e legível; metadata SSR aponta para a imagem certa; testes e smoke aprovados.
- **Rollback:** reverter código e assets pelo commit anterior; dados editoriais por backup dos registros e capa anterior, condicionados à revisão exata.

## Implementação local e evidências

- O inventário público de 101 artigos encontrou 34 artigos relacionados às três bikes ou com menção a WANSHIDA. Os 34 receberam capas JPG locais de 1280×720 baseadas nas capas publicadas; 19 exigem correção textual em título, resumo, SEO, blocos ou FAQ. Transcrições e `sourceExcerpt` não são alterados. Os slugs antigos são preservados.
- Proposta transacional protegida por ID, status, revisão e valores anteriores em `artifacts/ouxi-2026-09-30/correction-proposal.sql`; rollback condicionado à revisão seguinte em `correction-rollback.sql`. O JSON de revisão e as consultas da produção permanecem locais e ignorados pelo Git porque contêm trechos de evidência editorial.
- Índice público: seleção por bike principal ou relacionada, busca textual, categoria, contador e limpeza dos filtros. Admin: status, bike, busca, contador e limpeza; a API editorial passa a listar `related_bike_ids` sem ampliar permissões.
- 50 artes OG específicas de páginas públicas (cinco destinos principais, páginas de ferramentas, grupo, privacidade e 30 detalhes do Radar), com título dentro da imagem. O Radar mostra uma representação do histórico. Caminhos versionados nas cinco páginas principais evitam servir a antiga imagem de cache. O `head` raiz deixou de anunciar a imagem da Home nas demais rotas.
- Validação: 11 testes dirigidos; `pnpm validate` passou com typecheck, 59 testes do gate e build; smoke SSR local retornou HTTP 200 e exatamente um `og:image` mais um `twitter:image` nas nove rotas amostradas. Capas e artes representativas revisadas visualmente. O lint geral do checkout tem centenas de divergências de Prettier pré-existentes; a task não reformata o repositório inteiro.

## Governança — revisão pós-implementação local

| Perspectiva | Status | Evidência ou pendência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Correção limitada às três bikes e menções verificadas, sem reescrever fatos. |
| CTO e Arquitetura | Pass | SSR local, metadata por rota, API admin sem mudança de autorização; typecheck e build aprovados. |
| IA e Agent Engineering | Pass | Geração local determinística das capas; nenhum prompt ou fonte editorial reescrito. |
| Segurança | Pass | Secrets mantidos no servidor; SQL de produção ainda não executado; proposta protegida e artefatos privados ignorados no Git. |
| UX/UI | Pass | Capas e Radar inspecionados em resolução final; filtro por modelo, contador e limpeza disponíveis. |
| CX e Operação | Pass | Admin permite encontrar artigos por título, modelo e status após deploy da Edge Function. |
| Growth e CRO | Pass | OG por página, título legível na arte e slugs canônicos preservados. |
| PMO e QA | Fail | Aplicação no Supabase e deploy ainda não concluídos; a sessão disponível no dashboard não tem acesso ao projeto. Sem release até acesso e smoke público. |

Estado: pacote local pronto; publicação bloqueada por acesso autenticado ao projeto Supabase. Após acesso, publicar assets e frontend/Edge Function, confirmar URLs de capa, salvar backup dos registros, aplicar SQL protegido, verificar 34 revisões e 19 correções públicas, então realizar smoke do admin e compartilhamento.
