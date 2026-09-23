# Vitale Design System

## Tokens (src/styles.css)

- `ink` #102b29 (header/hero), `vt-dark` #082b29 (footer), `action` #0b7b55 (CTA/preço, AA sobre branco),
  `mint` #39e6a3 (CTA sobre escuro), `surface` #f3f8f5 (fundo de mídia/blocos), `line` #dcebe4 (bordas).
- Tokens shadcn legados (`primary` etc.) continuam intactos.

## Componentes (src/components/site/site-ui.tsx)

- `SiteHeader` único, SEM busca superior (a busca existe só dentro do Radar). Itens futuros apontam para seções reais da Home (`/#bikes`, `/#comparar`, `/#conteudos`, `/#calc`).
- `SiteFooter` B2C único (sem copy de consultoria).
- `Brand`, `SectionHeading`, `BikeMedia` (imagem real, lazy; ícone quando falta), `PriceStatus` (selo da classificação já calculada; não recalcula), `DisabledCta` (visível, `disabled`/`aria-disabled`, opacidade reduzida).

## Home v2 — revisão visual da página inicial

A Home foi redesenhada no rascunho para aproximar a composição da referência visual aprovada. (Texto original dizia "ainda não publicada"; **publicada em 23/09/2026**.)

### Layout e superfície

- **Hero full-bleed** com a foto original do ciclista, ocupando a largura total. Uso de `min-h-[560px]` mobile / `min-h-[640px]` desktop, conteúdo alinhado à esquerda e ancorado na base no mobile.
- Gradiente sobreposto partindo de `ink` para transparente (`bg-gradient-to-r from-ink via-ink/75 to-transparent`), garantindo legibilidade sem escurecer a imagem toda. No mobile o gradiente muda para `to-t` para manter o contraste quando o texto fica sobre a parte inferior da foto.
- Tipografia de impacto no H1: `text-[2.6rem]` → `sm:text-6xl` → `lg:text-7xl`, `font-black leading-[1.02] tracking-tight`, com destaque em `text-mint` ("certa para você").
- **Barra de atalhos** (`Shortcuts`) com 5 produtos, grid 2 colunas no mobile e 5 no desktop, sobreposta negativamente (`-mt-16`) ao hero; ícone em cápsula `bg-mint/25 text-action`, bordas `ring-1 ring-line`, sombra `shadow-xl`.
- **Bikes em destaque**: até 5 cards em grade `sm:grid-cols-2 lg:grid-cols-5`, cada um com `BikeMedia`, nome, preço atual (`text-action`, `font-black text-2xl`) e link real para `/acompanhamento/$bikeId`.
- **Radar + Calculadora**: grid de duas colunas. Radar usa fundo `vt-dark` (`#082b29`) e card interno com mini-barras de preço atual vs. típico. Calculadora é card claro (`bg-card`) com ícones de transporte e CTA inativo.
- **Comparar bikes**: card `bg-surface` com preview de duas bikes reais lado a lado e selo "VS"; CTA inativo.
- **Conteúdos e testes**: três cards usando fotos reais do catálogo como thumbnails; sem artigos/vídeos inventados.
- **Grupo de ofertas + Newsletter**: bloco duplo. Grupo usa `vt-dark` e link ativo para `/grupodeofertas`; newsletter usa input desabilitado e botão inativo.

### Uso da foto original

- A imagem original foi processada em três versões otimizadas:
  - `public/vitale-hero-v2.webp` (1672×941)
  - `public/vitale-hero-v2-1280.webp` (1280×720)
  - `public/vitale-hero-v2-mobile.webp` (600×909)
- Marcação `<picture>` com `source` mobile e 1280, e `<img>` default com `fetchPriority="high"`, `decoding="async"` e `alt` descritivo: "Ciclista em bike elétrica na orla da cidade ao pôr do sol".
- `object-cover object-[70%_center]` mantém o ciclista visível e o texto do lado esquerdo, onde o gradiente escuro oferece contraste.
- Não há sobreposição de texto sobre rosto/pessoa; a foto é usada como contexto de mobilidade, não como decoração genérica.

### Regras de dados reais e CTAs inativos

- Todos os cards de bikes vêm exclusivamente de `getHomeCards` (`src/lib/home-cards.functions.ts`): `id`, `name`, `currentPrice`, `classification` e `image` do Radar público read-only. Se o Radar falhar ou retornar vazio, a seção mostra apenas o título e um link para `/acompanhamento` — **nenhum card é inventado**.
- O painel do Radar exibe o primeiro item real; quando inexistente, aparece apenas o texto introdutório e o botão ativo para o Radar.
- Produtos sem backend (comparador, calculadora, conteúdos editoriais, newsletter) são **arquitetura de UI apenas**. Seus CTAs usam os componentes `InactiveButton` e `ProductLink` (`src/components/home/home-products.tsx`) com `disabled` / `aria-disabled="true"`, cursor `not-allowed` e opacidade reduzida (`opacity-50`).
- A newsletter não usa `<form>`, não tem `name`/`type="submit"` e o campo de email está `disabled`; a copy "Nenhum email é coletado nesta página" deixa o estado explícito.
- O único CTA ativo além do Quiz/Radar é o **Grupo de ofertas**, que leva para `/grupodeofertas` (redirecionamento ao WhatsApp).

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

## Home v2.1 — painéis (rascunho, não publicado)

- Painéis com eyebrow em caixa alta, título-pergunta `font-black` 3xl/4xl, CTA ativo largura total no mobile.
- Radar: `bg-vt-dark`, até 3 mini-cards reais (`BikeMedia`, `formatBRL`, `PriceStatus`), contagem `search.length`; decoração só SVG abstrato `aria-hidden`.
- Calculadora: sequência de modais → bike (`role="img"` com rótulo), sem campos/resultados; CTA para `/escolherbike`.
- Comparador: `bg-ink`, duas fotos reais com selo VS `mint`, sem specs/vencedor; CTA para `/acompanhamento`.
- Assistente global com `manualOnly`: sem convite/autoabertura; só clique.
