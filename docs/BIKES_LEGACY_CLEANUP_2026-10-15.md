# Limpeza do legado `/bikes` — 15/10/2026

Estado: **implementado localmente; não publicado**

## Objetivo e classificação

Remover a experiência pública duplicada de `/bikes` e concentrar toda a jornada
de Bike no Radar. A mudança é **estrutural** porque envolve migração de legado,
Radar e SEO.

## Governança — revisão pré-implementação

| Perspectiva | Impacto, risco e decisão |
| --- | --- |
| Produto e Estratégia | Remove um produto duplicado. Prosseguir mantendo Radar e comparação como experiência oficial. |
| CTO e Arquitetura | Excluir rotas e código exclusivos; preservar serviços compartilhados e resolução slug → `bikeId` no servidor. |
| IA e Agent Engineering | Nenhuma mudança em modelo ou prompt. Registrar que vídeo publicado é a fonte obrigatória de conteúdo novo. |
| Segurança | Sem banco, RLS, secrets ou permissões. Validar entradas e respostas 404/503 dos aliases. |
| UX/UI | Acesso antigo deve chegar ao Radar sem página intermediária. Comparação permanece no detalhe do Radar. |
| CX e Operação | Admin, Sheets, sync, Quiz e CRM permanecem intactos. Analytics histórico continua legível. |
| Growth e CRO | Usar 301, preservar query/UTM, retirar aliases do sitemap e manter links afiliados diretos. |
| PMO e QA | Testes de redirect, sitemap, rotas e analytics; `pnpm validate`; publicação só com nova autorização. |

Não houve conflito material. O trade-off aceito é que `/bikes?compare=...` passa a
abrir o Radar preservando a query, sem reconstruir o estado antigo; a comparação
suportada é a do detalhe `/radar/{bikeId}`.

## Decisão consolidada

- Remover `src/routes/bikes/*` e componentes/helpers usados somente por essas páginas.
- Criar 301 `/bikes[/]` → `/radar`, preservando query/UTM.
- Manter 301 `/bikes/{slug}` → `/radar/{bikeId}` pela resolução do catálogo.
- Manter 404 para slug desconhecido e 503 para catálogo indisponível, ambos sem indexação indevida.
- Sitemap, canonical e navegação pública contêm somente Radar.
- Preservar `/admin/bikes`, repositórios, sync, Quiz, CRM, histórico de analytics e dados.
- Marcar o Content Graph como concluído no escopo atual: vídeo publicado é a fonte; analytics mede resultado.

Fora de escopo: mudança de banco, RLS, Edge Function, dados históricos, conteúdo
para Bikes sem artigo, `toolSlug` editorial, publicação em produção e uso de
créditos Lovable.

## Critérios de aceite

1. `/bikes` e `/bikes/` retornam 301 para `/radar` com query preservada.
2. Slug conhecido resolve o `bikeId` canônico; desconhecido retorna 404; falha retorna 503 com `Retry-After`.
3. Nenhuma rota pública renderizável `/bikes` permanece na árvore TanStack.
4. Sitemap não contém `/bikes`; Radar e seus detalhes continuam canônicos.
5. Nenhum código público emite posições de analytics exclusivas das páginas removidas.
6. Quiz, CRM, Sheets/sync, Admin e links afiliados diretos não mudam.

Rollback local: restaurar os arquivos removidos, retirar o redirect de base e
regenerar a árvore de rotas. Em produção, republicar o commit anterior; nenhum
dado precisa ser revertido.

## Evidências e revisão pós-implementação

- Testes direcionados: 61 testes em cinco arquivos para redirects, 404/503,
  sitemap, analytics e árvore de rotas; todos passaram.
- `pnpm validate`: typecheck, 62 testes de regressão obrigatórios e build
  cliente/SSR/Cloudflare; tudo passou.
- `git diff --check`: passou.
- `rg`: sem import de componentes removidos nem link público restante para
  `/bikes`; `/admin/bikes`, classificação histórica e redirects foram preservados.
- O preview HTTP local não foi usado como evidência porque a instalação
  compartilhada aponta o plugin de preview para `dist/server/server.js` de outro
  worktree. O build é válido; smoke HTTP no domínio fica obrigatório após uma
  eventual publicação autorizada.

## Governança — revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Radar é a única experiência de Bike e a documentação viva foi reconciliada. |
| CTO e Arquitetura | Pass | Rotas e dependências exclusivas removidas; serviços compartilhados e Admin preservados. |
| IA e Agent Engineering | Pass | Nenhum agente mudou; vídeo/transcrição seguem como fonte e analytics só mede. |
| Segurança | Pass | Sem dados/RLS/secrets; slug e `bikeId` validados; 404/503 seguros. |
| UX/UI | Pass | Acesso antigo recebe redirect antes do SSR e a comparação permanece no Radar. |
| CX e Operação | Pass | Quiz, CRM, Sheets/sync, Admin e histórico não foram alterados. |
| Growth e CRO | Pass | 301 e UTM preservados; sitemap/canonical só Radar; afiliado direto intacto. |
| PMO e QA | Pass | 61 testes direcionados e `pnpm validate` aprovados; rollback documentado. |

Riscos residuais não bloqueantes: o redirect de detalhe depende do catálogo; URLs
antigas com maiúsculas retornam 404; `?compare=` não recompõe a seleção antiga; o
Google pode exibir URLs legadas até recrawl. Não houve publicação nem custo
externo nesta task.
