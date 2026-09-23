# Vitale Design System (rascunho, não publicado)

## Tokens (src/styles.css)
- `ink` #102b29 (header/hero), `vt-dark` #082b29 (footer), `action` #0b7b55 (CTA/preço, AA sobre branco),
  `mint` #39e6a3 (CTA sobre escuro), `surface` #f3f8f5 (fundo de mídia/blocos), `line` #dcebe4 (bordas).
- Tokens shadcn legados (`primary` etc.) continuam intactos.

## Componentes (src/components/site/site-ui.tsx)
- `SiteHeader` único, SEM busca superior (a busca existe só dentro do Radar). Itens futuros apontam para seções reais da Home (`/#bikes`, `/#comparar`, `/#conteudos`, `/#calc`).
- `SiteFooter` B2C único (sem copy de consultoria).
- `Brand`, `SectionHeading`, `BikeMedia` (imagem real, lazy; ícone quando falta), `PriceStatus` (selo da classificação já calculada; não recalcula), `DisabledCta` (visível, `disabled`/`aria-disabled`, opacidade reduzida).

## Superfícies
- Home, Radar (/acompanhamento), detalhe (/acompanhamento/$bikeId) e resultado do Quiz usam header/footer do DS.
- Detalhe: descrições legadas (slogans) não são exibidas; só perfilIndicado, specs e strengths.
- Alertas: modal, legenda ("Condição do alerta"), consentimento e confirmação falam em registro de interesse, sem envio ativo (delivery desativado). Campos, condição e envio à função de backend inalterados. UI diz "Registrar alerta de preço" e explicita que o envio automático ainda não está ativo.
- Assistente Vitale: comportamento baseline preservado (autoabertura revertida na QA). Convite flutuante no mobile = pendência de UX para Growth/CX.

## Pendências reais (não são promessa de release)
- Comparador, calculadora, conteúdos/vídeos, newsletter: sem backend; CTAs desativados.
- Galeria: só uma imagem real por bike; sem galeria.
- Modelos semelhantes, vídeos e artigos no detalhe: omitidos até existir relação/dados reais.
- Divergência de dados observada: strengths da V8 Ultra citam "até 80km" enquanto autonomyKm = 50. Precisa de reconciliação na planilha (não alterado).

## Correções de QA
- Gráfico do destaque do Radar usa `featured.metrics.series` (série com lacunas do cálculo existente), não o `daily` cru.
- Resultado do Quiz: preço atual e selo só quando a bike existe no Radar público (`getHomeCards.search` agora traz id, name, currentPrice, classification de todas as bikes válidas). Sem entrada no Radar, nada é exibido. internalPrice continua oculto.
- Home: o payload de busca ficou um pouco maior (preço e classificação por bike), sem link afiliado.

## Evidências capturadas (commit `82bc781`)
Foram geradas **8 screenshots** da nova composição visual:
- Home: desktop + mobile (preview Lovable)
- Radar (`/acompanhamento`): desktop + mobile (preview Lovable)
- Detalhe da bike V8 Ultra (`/acompanhamento/v8_ultra`): desktop + mobile (preview Lovable)
- Resultado do Quiz: desktop + mobile

As 6 primeiras vieram diretamente do preview Lovable. As 2 do resultado do Quiz foram capturadas em ambiente de desenvolvimento local com uma **fixture temporária e não comitada**: catálogo real/read-only, respostas sintéticas e `leadId` nulo. Não houve submissão de formulário, criação de lead, disparo de alerta, webhook ou qualquer efeito colateral. A fixture foi removida após a captura.

Caminho local das evidências (não incluídas no deploy):
`/Users/palms/.codex/visualizations/2026/09/22/01a0cb61-b3e5-7192-8fda-537ba83b4ed5/vitale-design-review/{home,radar,bike,quiz}-{desktop,mobile}.jpg`

## Validação (commit `82bc781`)
- `pnpm validate` executado e passou: typecheck, 26 testes direcionados e build.

## Status das lentes pós-QA
- **CTO**: Pass
- **Segurança**: Pass
- **IA**: Pass
- **CX**: Pass com ressalva — autonomia V8 Ultra divergente na planilha (`strengths` mencionam até 80 km; campo `autonomyKm` = 50). Reconciliação de dados não alterada no código.
- **Produto/UX/Growth**: ainda **não aprovam release integral**. Catálogo editorial, vídeos, comparador, calculadora e newsletter ainda não estão funcionais, e alguns CTAs permanecem semanticamente desativados.
- **PMO**: Pass da validação visual/documental após atualizar a evidência do resultado do Quiz, mas **No-Go de publicação** enquanto Produto/UX/Growth e os gates de cutover não forem atendidos.

## Escopo implementado vs. pendentes
**Implementado (visual/DS):** header/footer únicos, tokens de cor, Home B2C, Radar, página de bike, resultado do Quiz — tudo usando o mesmo design system e dados reais onde existem.
**Pendente (produtos/futuros, sem backend pronto):** comparador, calculadora, conteúdos/vídeos, newsletter, galeria de bikes, modelos relacionados, alertas de preço funcional.

## Diferenças em relação às referências visuais
As referências de layout/hierarquia foram seguidas, mas sem dados inventados: não há vídeos, artigos, modelos relacionados, thumbnails fictícias, badges de autonomia percentual, scores de economia ou slogans promocionais. O que existe no acervo real (foto, nome, preço, histórico, specs, perfilIndicado) foi usado; o restante foi omitido.
