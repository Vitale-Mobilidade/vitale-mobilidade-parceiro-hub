# Vitale Design System

> Contrato de intenção de página e sinergia: ver [docs/PAGE_INTENT_AND_SYNERGY.md](./PAGE_INTENT_AND_SYNERGY.md) (governança; não autoriza implementação nem publicação).

## Tokens (src/styles.css)

- `ink` #102b29 (header/hero), `vt-dark` #082b29 (footer), `action` #0b7b55 (CTA/preço, AA sobre branco),
  `mint` #39e6a3 (CTA sobre escuro), `surface` #f3f8f5 (fundo de mídia/blocos), `line` #dcebe4 (bordas).
- Tokens shadcn legados (`primary` etc.) continuam intactos.

## Componentes (src/components/site/site-ui.tsx)

- `SiteHeader` único, SEM busca superior (a busca existe só dentro do Radar). Itens futuros apontam para seções reais da Home (`/#bikes`, `/#comparar`, `/#conteudos`, `/#calc`).
- `SiteFooter` B2C único (sem copy de consultoria).
- `Brand`, `SectionHeading`, `BikeMedia` (imagem real, lazy; ícone quando falta), `PriceStatus` (selo da classificação já calculada; não recalcula), `DisabledCta` (visível, `disabled`/`aria-disabled`, opacidade reduzida).

## Home v2 — revisão visual da página inicial (publicada em 23/09/2026)

A Home foi redesenhada para aproximar a composição da referência visual aprovada e publicada no domínio existente em 23/09/2026.

### Layout e superfície

- **Hero full-bleed** com a foto original do ciclista, ocupando a largura total. Na Home v2 usava `min-h-[560px]` mobile / `min-h-[640px]` desktop como baseline histórica; o padrão atual das páginas estruturais é **640px a partir de 390px**, com crescimento natural da Home em 320px (~704px) por quebra de linha do H1/lead.
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
- Produtos sem backend (comparador, calculadora, conteúdos editoriais, newsletter) são **arquitetura de UI apenas**. Seus CTAs usam os componentes `InactiveButton` e `ProductLink` (`src/components/home/home-products.tsx`) com `disabled` / `aria-disabled="true"`, cursor `not-allowed` e opacidade reduzida (`opacity-50`).
- A newsletter não usa `<form>`, não tem `name`/`type="submit"` e o campo de email está `disabled`; a copy "Nenhum email é coletado nesta página" deixa o estado explícito.
- O único CTA ativo além do Quiz/Radar é o **Grupo de ofertas**, que leva para `/grupodeofertas` (redirecionamento ao WhatsApp).

## Home v2.1 — painéis e assistente manual (publicada em 23/09/2026)

Evolução da Home v2 publicada no mesmo domínio em 23/09/2026, por autorização do responsável. Verificação no domínio público confirmou o H2 "O preço de hoje está bom?" e o fechamento contínuo do Assistente Vitale após 25 segundos sem interação (apenas o botão flutuante visível).

### Painéis principais

- **Radar**: `bg-vt-dark`, eyebrow "RADAR DE PREÇOS", título `font-black` "O preço de hoje está bom?", CTA ativo "Explorar Radar de preços" → `/acompanhamento`.
  - Vitrine com até 3 mini-cards reais do array `radar` (`BikeMedia`, `formatBRL`, `PriceStatus`).
  - Contagem real `search.length` bikes monitoradas.
  - Decoração SVG abstrato `aria-hidden`; nenhum gráfico temporal, queda ou economia simulada.
- **Calculadora**: card claro, eyebrow "CALCULADORA", título "Quanto você economiza com bike elétrica?", sequência visual carro → Uber → ônibus → bike (`role="img"` com rótulo acessível), sem campos/resultados; CTA ativo "Escolher minha bike" → `/escolherbike`. Funcionalidade real depende da etapa 23.
- **Comparador**: `bg-ink`, eyebrow "COMPARADOR", título "Compare duas bikes lado a lado", preview de duas fotos reais com selo "VS" em `mint`; CTA ativo "Explorar modelos no Radar" → `/acompanhamento`. Rota `/comparar` ainda não existe.

### Assistente Vitale — `manualOnly` em produção

- A prop `manualOnly` foi aplicada ao `LucasSDRWidget` usado pelo `RadarAssistant` global (`src/routes/__root.tsx`).
- Comportamento: remove convite flutuante e autoabertura temporizada; o painel só abre quando o usuário clica no botão flutuante.
- Widget do Quiz (`QuizSDRWidget`) mantém `manualOnly={false}` (default), pois o contexto de quiz já exige interação prévia.
- O botão flutuante global não abre sozinho após carregamento da página.

## Superfícies

- Home, Radar (`/acompanhamento`), detalhe (`/acompanhamento/$bikeId`) e resultado do Quiz usam header/footer do DS.
- Detalhe: descrições legadas (slogans) não são exibidas; só perfilIndicado, specs e strengths.
- Alertas: modal, legenda ("Condição do alerta"), consentimento e confirmação falam em registro de interesse, sem envio ativo (delivery desativado). Campos, condição e envio à função de backend inalterados. UI diz "Registrar alerta de preço" e explicita que o envio automático ainda não está ativo.

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

## Status das lentes pós-QA (pré-v2.1)

- **CTO**: Pass
- **Segurança**: Pass
- **IA**: Pass
- **CX**: Pass com ressalva — autonomia V8 Ultra divergente na planilha (`strengths` mencionam até 80 km; campo `autonomyKm` = 50). Reconciliação de dados não alterada no código.
- **Produto/UX/Growth**: ainda **não aprovam release integral**. Catálogo editorial, vídeos, comparador, calculadora e newsletter ainda não estão funcionais, e alguns CTAs permanecem semanticamente desativados.
- **PMO**: Pass da validação visual/documental após atualizar a evidência do resultado do Quiz, mas **No-Go de publicação** enquanto Produto/UX/Growth e os gates de cutover não fossem atendidos.

> **Atualização pós-publicação v2.1:** a Home v2.1 foi publicada em 23/09/2026 por decisão explícita do responsável, apesar dos gates de cutover e aprovações de Produto/UX/Growth ainda não estarem completos. O status das lentes acima reflete a situação pré-publicação.

## Escopo implementado vs. pendentes

**Implementado (visual/DS):** header/footer únicos, tokens de cor, Home B2C v2 e v2.1, Radar, página de bike, resultado do Quiz — tudo usando o mesmo design system e dados reais onde existem.
**Pendente (produtos/futuros, sem backend pronto):** comparador funcional, calculadora funcional, conteúdos/vídeos, newsletter, galeria de bikes, modelos relacionados, alertas de preço funcionais.

## Diferenças em relação às referências visuais

As referências de layout/hierarquia foram seguidas, mas sem dados inventados: não há vídeos, artigos, modelos relacionados, thumbnails fictícias, badges de autonomia percentual, scores de economia ou slogans promocionais. O que existe no acervo real (foto, nome, preço, histórico, specs, perfilIndicado) foi usado; o restante foi omitido.

## Heróis das páginas de entrada e card de catálogo — 23/09/2026 (prévia, não publicado)

- Utilitários compartilhados em `src/styles.css`: `entry-hero` (fundo ink, isolate/overflow), `entry-hero-inner` (min-height 640px a partir de 390px; texto na base no mobile e centralizado no desktop), `entry-eyebrow`, `entry-h1` (2.6rem → 3.75rem ≥640px → 4.5rem ≥1024px), `entry-lead` e `section-h2` (1.875rem → 2.25rem). O hero pode crescer naturalmente quando o conteúdo exige (ex.: Home a ~704px em 320px por quebra de linha do H1/lead).
- Aplicados em Home `/`, `/bikes` e `/acompanhamento`; cada página mantém pergunta, copy e um único H1. Quiz e detalhe de bike não foram alterados.
- Imagens temáticas próprias por página (imagens editoriais geradas, não fotos de modelos reais; nunca identificar como modelo/preço/oferta): Home usa `vitale-hero-v2*`; `/bikes` usa `vitale-hero-bikes-2026*`; `/acompanhamento` usa `vitale-hero-radar-2026*`. Todas via `<picture>` com gradiente `ink` para legibilidade.
- `/bikes`: a busca permanece dentro do hero; os atalhos de perfil (“Para 2 pessoas”, “Autonomia de 100 km ou mais”, “Com preço no Radar”) ficam num painel de transição sobreposto à base do hero (`-mt-16/-mt-20`).
- `/acompanhamento`: a busca e os indicadores reais (monitoradas, menor preço, maior queda) ficam num painel de transição sobreposto à base do hero (`-mt-16/-mt-20`), sem comprimir o texto do hero.
- Alturas medidas: desktop 1280px — Home 640, Bikes 640, Radar 640; mobile 390px — Home 640, Bikes 640, Radar 640; mobile 320px — Home ~704 (crescimento natural), Bikes 640, Radar 640.
- `BikeCatalogCard`: o card inteiro é um único `<Link to="/bikes/$slug">` (foto, nome, selo Radar, preço, fonte, vídeos e CTA visual "Conhecer a bike"). Sem link separado para o Radar dentro do card; o acesso ao Radar fica no detalhe da bike. Hover/foco responde no card todo (`focus-visible:ring-4`), sem links aninhados nem `onClick` em div.

## Página canônica da bike (`/bikes/{slug}`) — selo comercial

Ajuste de escopo do responsável: **selos comerciais são bem-vindos aqui** (e só aqui; o painel `/radar/{bikeId}` continua sem selo de avaliação).

- Componente `CommercialPriceBadge` (`src/components/site/CommercialPriceBadge.tsx`) sobre a lógica pura `commercialBadge` (`src/lib/commercial-badge.ts`); substitui o `PriceStatus` genérico no bloco de preço do hero.
- Estados (derivados da `classification` já calculada por `dailyMetrics` sobre preços validados manualmente): `Menor preço registrado` (`lowest`, `bg-action`), `Oportunidade` (`good`, `bg-mint`), `Na faixa habitual` (`typical`, neutro), `Acima do habitual` (`above`, `bg-destructive`, sem alarmismo), `Preço registrado` (`forming`/sem histórico — neutro, nunca bom/mau), `Oferta indisponível` (sem link válido).
- Cada selo traz uma frase curta factual abaixo; a cor é apoio, o texto sozinho comunica o estado.
- **"Imperdível" nunca é automático**: fica reservado a decisão editorial humana futura — preço baixo isolado não comprova urgência nem estoque. Nenhum percentual de desconto é fabricado.
- Sem oferta válida: nenhum CTA do Mercado Livre; o valor exibido é o **último preço registrado** com data ("Pode não ser o preço de hoje") e a seção "Preço no Radar" troca a faixa de preço por nota factual, para não posicionar um "preço atual" inexistente.

## Radar — listagem (`/radar`): sem selos automáticos de classificação

Regra do responsável (23/09/2026): selos comerciais valem **somente** na página canônica `/bikes/{slug}`. A listagem do Radar é leitura factual.

- `RadarBikeCard` não exibe mais o `Badge` de `CLASSIFICATION_LABEL`/`CLASSIFICATION_COLOR`; mantém foto, nome, preço atual, comparação numérica com o preço típico, `shortDiagnosis`, CTA do Mercado Livre (link afiliado byte a byte), "Ver análise" e alerta.
- `BikeSearchCombobox` também perdeu o selo; cada sugestão mostra foto, nome e preço.
- Destaque: o título é fixo **"Destaque do Radar"** (era "Oportunidade em destaque"/"Bike em destaque") — é seção, não selo — e o bloco não renderiza mais `PriceStatus`.
- Rodapé da listagem: a explicação de "menor preço registrado" virou texto corrido, sem `Badge`.
- `shortDiagnosis` (`src/lib/radar-rankings.ts`) nunca escreve "R$ 0 abaixo do típico": diferença zero vira "Hoje está igual ao preço típico do período."; com histórico curto (`forming`) o texto é "É o menor preço registrado por nós até agora." quando verdadeiro, senão "Preço registrado no histórico da Vitale." — sem mencionar "histórico em formação" e sem insinuar que o preço é inválido.
- Cálculo, `classification`, thresholds, rankings, preços, datas e links permanecem inalterados; a mudança é de apresentação.

## Radar — detalhe da bike (`/radar/{bikeId}`): painel compacto de inteligência de preço

Referência de **hierarquia/densidade** (padrão "price insights"), não de branding.

- Header compacto: foto `h-[260px]` mobile / `md:h-[340px]` desktop (antes 300/440), `gap-6`. Preço, CTA "Ver oferta no Mercado Livre" (link afiliado direto) e alerta permanecem acima da dobra.
- Um único painel contínuo `PriceIntelPanel` (`src/components/radar/PriceIntelPanel.tsx`) substitui as duas caixas ("O preço atual está bom?" + "Resumo do período") e a seção separada de histórico. Estrutura em três faixas separadas por `border-line`, sem card dentro de card:
  1. cabeçalho (H2 + janela vigente), sem selo de estado;
  2. texto factual, régua farol segmentada, referências e cobertura;
  3. seletor 7/30/90/Tudo, gráfico compacto e `<details>` nativo "Como lemos esses números".
- **Farol**: verde `action/70` (min→P25), âmbar `amber-400/80` (faixa habitual, P25→P75), vermelho `destructive/70` (P75→max); marcador do preço atual com `ring-2 ring-card`. É referência gráfica sobre os registros reais, sem selo nem recomendação automática de compra. Cor nunca comunica sozinha: há texto factual e `role="img"` com `aria-label` descrevendo preço e faixa.
- **Sem selos de avaliação de preço (regra final do responsável)**: o detalhe do Radar não exibe nenhum selo/badge de avaliação ("Bom preço", "Menor preço observado", "Oportunidade", "Na faixa típica", "Acima do histórico", "Histórico em formação") — nem no topo (`PriceStatus` não é usado nesta página) nem no painel, mesmo com cobertura conclusiva. O texto é sempre factual e neutro: comparação numérica com o preço típico ("Está R$ X abaixo/acima do preço típico do período"), "É o menor valor registrado por nós para esta bike no período acompanhado" quando aplicável, e rótulos factuais "Menor registrado / Faixa habitual (P25–P75) / Maior registrado". Com histórico curto/descontínuo (`classification === "forming"`) o texto é "Comparação baseada nos registros disponíveis até agora para esta bike", com marcador neutro (`bg-ink`) e rótulo central "Mediana dos registros". Com um único preço (`distinctPrices < 2`) nenhuma faixa ou posição é renderizada. Os registros existentes são a base operacional validada manualmente pelo time: a cobertura mede continuidade do monitoramento, não a validade dos preços.
- Para histórico suficiente, o veredito corresponde estritamente a `lowest`/`good`/`typical`/`above` já calculados por `dailyMetrics`; o painel não recalcula nem cria valores.
- Gráfico: `DailyPriceChart` ganhou a prop `compact` (180px mobile / 200px desktop) usada só pelo Radar; sem `compact` o componente mantém a altura original em `/bikes/$slug`. Lacunas, proveniência (ponto cheio = verificado, vazado = reconstruído) e tooltips inalterados.
- `PriceRangeBar` permanece em uso apenas por `/bikes/$slug`.

### Radar sem oferta no momento (oferta indisponível; histórico preservado)

As bikes sem link não são "arquivadas" como entidade: apenas não há oferta ativa no Mercado Livre agora, e o preço validado continua no histórico. Os rótulos públicos refletem isso ("Sem oferta no momento"), nunca "arquivado"; nomes internos de variáveis/DB não mudam.

- Lista `/radar`: seção "Sem oferta no momento (N)" no fim do catálogo, fora dos rankings e do destaque. O indicador do hero é "Modelos com histórico" e conta todos (27 com oferta + 3 sem oferta = 30). Cada item é um link para o detalhe, com marcador vermelho + "Sem oferta no Mercado Livre", `Último preço verificado: [valor]` e `Confirmado em [data] · pode não ser o preço de hoje` (fallback "Última alteração em [data]"). Sem farol, sem CTA do Mercado Livre e sem alerta de preço.
- Detalhe `/radar/{bikeId}` sem oferta atual: selo neutro "Sem oferta no momento", bloco "Último preço verificado" com o valor real e a data da última confirmação (nunca zerado, nunca fictício), e painel "Histórico registrado" (gráfico `compact`) com contagem real de dias confirmados/reconstruídos e data inicial. Nunca há preço atual, farol, CTA de compra ou alerta.
- Indisponibilidade no gráfico: `DailyPriceChart` recebe `markLastUnavailable` e pinta em `--destructive` o ponto mais recente com preço real (`lastRealIndex`). O vermelho significa **oferta indisponível**, nunca avaliação de preço alto. A legenda textual (`UNAVAILABLE_LEGEND`) fica sempre visível ao lado do gráfico, para não depender de cor.
- `UnavailableExplainer` (`button` + popover Radix): abre por hover/foco no desktop e por toque/clique no mobile, fecha com Esc, alvo ≥44px. Mensagem única de `unavailableMessage(date)`: "Sem oferta disponível no Mercado Livre no momento. Este é o último preço registrado pela Vitale em DD/MM/AAAA; pode não ser o preço de hoje." Sem data real, a frase omite a data em vez de inventar uma. O mesmo texto aparece no tooltip do ponto vermelho.
- `PriceIntelPanel` passa a declarar a evidência da janela: "Dados usados nesta janela: X dia(s) confirmados e Y reconstruído(s), em Z dia(s) do período · a partir de [data]". Em `forming`, uma linha adicional explica o critério (14 dias confirmados, 80% de cobertura, mais de um preço distinto) e aponta o período "Tudo". A regra de `dailyMetrics` não mudou.
