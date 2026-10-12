# Player direto do YouTube — 12/10/2026

Classificação: estrutural, integração pública YouTube. Objetivo: mostrar o embed nativo, sem filtro nem botão próprio.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Atende pedido de apresentação nativa; controles do terceiro; YouTube disponível; prosseguir. |
| CTO | iframe no SSR sem estado React; mais recursos que facade; lazy loading e proporção fixa; prosseguir com esses limites. |
| IA | Não altera geração editorial; nenhuma dependência de IA; prosseguir. |
| Segurança | Origem fixa youtube-nocookie, sem autoplay; contato com terceiro ao carregar; integração existente; prosseguir. |
| UX | Controles nativos e título acessível; manter 16:9/mobile/fullscreen; prosseguir. |
| CX | Sem reprocessar artigos; indisponibilidade depende do YouTube; prosseguir. |
| Growth | Conteúdo SSR preservado; maior carga do player perto da viewport; lazy loading mitiga; prosseguir. |
| PMO | Teste SSR confirma embed e ausência de camada; validate obrigatório; rollback 4cfd9a7; prosseguir. |

Trade-off: performance favorecia facade, mas preferência explícita do usuário favorece player nativo. Decisão: iframe youtube-nocookie direto, lazy, sem autoplay, título e fullscreen; remover estado/imagem/overlay apenas do player editorial. Aceite: iframe no SSR, sem botão verde/filtro, layout reservado. Fora de escopo: cards, banco, conteúdo. Rollback: restaurar ArticleView e teste da base 4cfd9a7. Publicação depende de autorização específica do novo escopo.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Player nativo substitui facade conforme preferência explícita. |
| CTO | Pass | iframe SSR sem useState, lazy; contêiner 16:9 preservado. |
| IA | Pass | Fluxo editorial e conteúdo não alterados. |
| Segurança | Pass | Origem fixa youtube-nocookie; sem secrets/autoplay; integração preexistente. |
| UX | Pass | Título, fullscreen e layout responsivo preservados; filtro/botão próprio removidos. |
| CX | Pass | Aplicável a artigos existentes sem reprocessamento. |
| Growth | Pass | SSR/metadata intactos, lazy mitiga carga adicional do embed. |
| PMO | Pass | 4 testes direcionados; pnpm validate exit 0, 61 regressões/typecheck/build; diff check limpo. |

Estado: publicado após autorização explícita nesta thread. Commit 3d90e31 sincronizado com Lovable; UI confirmou “Seu site foi atualizado”. HTTP público confirmou iframe youtube-nocookie/PMxuUNfd8TM com loading=lazy, sem Reproduzir customizado ou bg-ink/35. Chrome após atualização sem cache confirmou Player de vídeo do YouTube e controles Assistir vídeo/Assistir no YouTube. Arquivos: ArticleView.tsx, article-independent.test.tsx, este registro. Custo externo: nenhum crédito de IA previsto. Risco residual: embed carrega recursos do YouTube antes do clique quando se aproxima da viewport.
