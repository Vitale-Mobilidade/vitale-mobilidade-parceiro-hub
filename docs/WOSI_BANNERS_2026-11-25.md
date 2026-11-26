# Publicidade Wosi — 25/11/2026

Base: `origin/main` 06a4402 do projeto ativo; branch `codex/wosi-banners-2026-11-25`.
Classificação: estrutural, por envolver link comercial afiliado e superfícies Radar/Quiz.
Pedido: artes 1/2 nas páginas públicas, exceto artigos; arte 3 na lateral desktop e no fim do artigo mobile. Destino exato: https://wosi.com.br/mobilidade-eletrica/multimarcas?cupom=VITALE.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Espaço publicitário Wosi | Disputar CTA principal | Posições fornecidas | Prosseguir, sem overlay |
| CTO e Arquitetura | Componente SSR e arquivos públicos locais | Download duplicado/CLS | picture, dimensões explícitas | Prosseguir com seleção por media |
| IA e Agent Engineering | Nenhuma geração ou agente alterado | Nenhum nesta superfície | Não executar geração paga | Prosseguir |
| Segurança | Navegação comercial externa | Redirect ou envio indevido | URL fixa HTTPS, rel sponsored noopener | Prosseguir com link direto |
| UX/UI | Banner adaptado à tela | Animação contínua, excesso de branco no GIF mobile | Pausa e reduced-motion, preservar originais | Prosseguir condicionado a controle da animação |
| CX e Operação | Assets versionados junto ao frontend | Cupom/destino futuro desatualizado | Constante única, rollback Git | Prosseguir |
| Growth e CRO | Publicidade identificada | Confusão com recomendação editorial e SEO | rel sponsored, sem alterar canonical ou CTAs existentes | Prosseguir |
| PMO e QA | Diff isolado no projeto ativo | Confundir preparação com publicação | Testes direcionados, pnpm validate, aprovação de release | Prosseguir localmente |

## Conflitos e decisão consolidada

- Preservar GIFs enviados versus acessibilidade: manter GIFs, oferecer pausa e fonte estática para reduced-motion. PNGs estáticos são extrações do primeiro frame, sem redesenho.
- Margens brancas embutidas no GIF mobile: preservar arquivo original em vez de cortar sem pedido.
- Escopo: Home entre bikes e Radar/calculadora; demais páginas públicas antes do rodapé; artigos na lateral abaixo dos destaques a partir de 1024px e ao fim do conteúdo abaixo disso. Admin e áreas privadas não recebem anúncios.
- Dependências: apenas frontend e mídia local. Sem banco, tracking novo, crédito Lovable ou clique real no parceiro.
- Aceite: link direto exato, uma posição visível por viewport, proporções preservadas, sem banner geral nos artigos, SSR, teclado, reduced-motion e pausa.
- Fora de escopo: edição das artes, alterações editoriais, banco e publicação automática.
- Rollback: reverter o commit de frontend e assets; nenhuma restauração de banco necessária.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Home no ponto solicitado; demais páginas públicas antes do rodapé; sem overlay. |
| CTO e Arquitetura | Pass | Componente renderizável em SSR, picture seleciona arte por media; build e typecheck passaram. |
| IA e Agent Engineering | N/A | Nenhuma geração, prompt, agente ou contrato editorial alterado. |
| Segurança | Pass | URL fixa exata em âncora nativa HTTPS, sponsored/noopener/noreferrer; sem novo tracking ou dados pessoais. |
| UX/UI | Pass | Chrome local em 390px e 1440px: arte correta, pausa/retomada, reduced-motion, uma posição visível no artigo e sem overflow horizontal. Inspeção visual das capturas confirmou layout. |
| CX e Operação | Pass | Cinco assets locais versionados; sem alteração de banco, integrações, disparos ou operação. |
| Growth e CRO | Pass | Publicidade identificada; cupom VITALE e destino direto preservados; canonical, metadata e links existentes inalterados. |
| PMO e QA | Pass | pnpm validate passou (typecheck, 71 testes do gate e build); 23 testes direcionados passaram em três arquivos, incluindo banner e regressão do artigo. |

### Fechamento

- `pnpm validate`: concluído com Node 22.23.5. Runtime padrão Node 24 apresentou incompatibilidade de assinatura de módulo nativo rolldown; não foi alteração do produto. A execução com Node 22 passou.
- Testes direcionados: `WosiBanner.test.tsx`, `article-independent.test.tsx`, `article-bike-images.test.tsx`: 23/23.
- ESLint do componente e teste novos passou. Arquivos legados possuem divergências prévias de Prettier; lint sem essa regra não apontou erro funcional. Não foi feita reformatação ampla.
- Verificação visual/interativa usou harness local com texto fictício e componentes reais de banner/artigo, CSS do build e Chrome. Não representa navegação autenticada em produção nem clique real no parceiro.
- Assets originais copiados sem alteração: desktop GIF 2168×176, mobile GIF 793×495 e PNG de artigo 793×214. PNGs auxiliares são primeiros frames dos GIFs para pausa/reduced-motion.
- Risco residual: branco embutido no GIF mobile preservado; anúncio desktop de artigo acompanha a largura existente da sidebar. Nenhum ganho de conversão é presumido.
- Alterados: componente `WosiBanner` e teste, `site-ui`, `HomeB2C`, `ArticleView`, rotas `links`/`entrenogrupodeofertas`, CSS, mídia e este registro.
- Rollback: reverter somente o commit desta mudança de frontend. Sem migrations, dados ou secrets.
- Estado: **GO para preparação local; publicação pendente de autorização específica**. Não houve push, merge, deploy ou consumo de créditos Lovable.

