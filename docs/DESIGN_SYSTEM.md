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
- Resultado do Quiz não foi capturado em tela: não há harness isolado sem disparar lead/eventos.

## Correções de QA
- Gráfico do destaque do Radar usa `featured.metrics.series` (série com lacunas do cálculo existente), não o `daily` cru.
- Resultado do Quiz: preço atual e selo só quando a bike existe no Radar público (`getHomeCards.search` agora traz id, name, currentPrice, classification de todas as bikes válidas). Sem entrada no Radar, nada é exibido. internalPrice continua oculto.
- Home: o payload de busca ficou um pouco maior (preço e classificação por bike), sem link afiliado.
- `bun run validate`: typecheck + testes direcionados (routes, quiz-radar-regression, radar-rankings) + build.
- Sem harness seguro para capturar o resultado do Quiz sem criar lead; evidência visual pendente.
