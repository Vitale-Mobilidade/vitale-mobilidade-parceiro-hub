# Taxonomia e contrato de rotas — Vitale Mobilidade

> **Status:** contrato inicial da Etapa 4. Slugs, aliases e redirects ainda estão pendentes de reconciliação com 100% dos IDs legados.

## 1. Rotas legadas ativas (até paridade/cutover)

| Rota | Propósito | Observação |
|------|-----------|------------|
| `/escolherbike` | Quiz de recomendação de bike elétrica | Preservada indefinidamente; canonical fixo. |
| `/acompanhamento` | Radar de preços (listagem) | Ativa durante a paridade; futuramente redirecionável para `/radar`. |
| `/acompanhamento/{bikeId}` | Radar de preços (detalhe da bike) | Usa o `bike_id` legado original. Ativa durante a paridade. |

## 2. Rotas futuras reservadas (sem páginas criadas nesta etapa)

| Rota | Propósito | Restrição |
|------|-----------|-----------|
| `/radar` | Listagem do Radar de preços | Somente após contrato Bike/oferta validado. |
| `/radar/{bikeId}` | Detalhe do Radar | Usa **o `bike_id` legado original**, incluindo underscore (`_`), sem conversão automática de formato. |
| `/bikes` | Índice de bikes | Editorial; requer entidade Bike consolidada. |
| `/bikes/{slug}` | Página editorial de uma bike | Usa **slug editorial separado e explícito**, distinto do `bike_id` técnico. Nenhum slug oficial é declarado neste documento. |
| `/conteudos` | Hub de conteúdo | Reservado. |
| `/conteudos/{slug}` | Artigo ou vídeo | Reservado. |
| `/comparar` | Comparador de bikes | Reservado (Etapa 19). |

## 3. Entidade central: Bike

A `Bike` é a raiz do domínio. Ela se relaciona com:

- `Offer` — ofertas/afiliados, preços e links de compra.
- `PriceObservation` — registros históricos de preço (Radar).
- `Article` — conteúdos editoriais que citam a bike.
- `Video` — conteúdos em vídeo.
- `Comparison` — comparações entre bikes.

**Regra importante:** dados de oferta (preço, link afiliado, estoque) nunca são copiados diretamente para o conteúdo editorial. O conteúdo referencia a bike e renderiza a oferta atual via API no momento da exibição.

## 4. IDs legados vs. slugs editoriais

- `bike_id` (legado): identificador técnico usado no catálogo, quiz, painel e Radar. Exemplos reais existentes no banco: `d50_cross`, `v8_pro`.
- `slug` (editorial): identificador amigável da página `/bikes/{slug}`. Pode coincidir com o `bike_id`, mas **não há equivalência automática**. Cada slug deve ser mapeado explicitamente e reconciliado com todos os IDs legados antes de ser declarado oficial.

## 5. Slugs, aliases e redirects

- **Pendentes:** mapeamento de aliases e redirects entre `/acompanhamento/{bikeId}` e `/radar/{bikeId}`, e entre `/bikes/{slug}` e os IDs legados.
- **Não declarar slug oficial de nenhuma bike neste documento.** A reconciliação deve cobrir 100% dos IDs legados antes do cutover.
- Futuros redirects (quando aprovados) devem ser 301 e centralizados em configuração de rota, nunca hardcoded em componentes.

## 6. Sitemap

O sitemap só inclui páginas públicas existentes e elegíveis à indexação. Hoje:

- `/`
- `/escolherbike`
- `/acompanhamento`

Páginas bloqueadas ou ainda não criadas (painel, detalhes de bike, `/bikes`, `/conteudos`, `/comparar`) ficam fora até que cada uma tenha `head()` SSR e regra de indexação definida.

## 7. `/bikes` e `/bikes/{slug}` — implementado em rascunho (23/09/2026)

- Fonte: aba oficial de bikes (gid=0), leitura read-only no servidor com cache; inclui todas as linhas nomeadas, inclusive "Não Elegível" (elegibilidade só afeta o Quiz).
- `bikeId` canônico = mesmo resolvedor do sync (`resolveBikeId`/`normalizeName`); `slug` = `bikeId` com `_` → `-` (ex.: `v9_max_20ah` → `v9-max-20ah`). Colisões de ID/slug descartam a linha repetida, nunca sobrescrevem.
- Link: só `meli.la` válido e idêntico ao da planilha; senão "Link indisponível no momento". Preço exibido como "Preço de referência cadastrado", nunca como preço de hoje.
- Slug inexistente → 404 `noindex`. Ainda fora do sitemap; redirects `/acompanhamento/{bikeId}` ↔ `/bikes/{slug}` seguem pendentes.

### 7.1 `/bikes` — página de descoberta (rascunho, 23/09/2026)

- SSR via `getBikesDiscovery` (`src/lib/bikes-discovery.functions.ts`): catálogo editorial (30 linhas) + junção por `bikeId` com `get_price_tracker_catalog` (preço e classificação vindos de `buildRadarEntries`, sem recálculo) + contagem real de vídeos da aba "Videos Youtube".
- Busca por nome no hero; atalhos: "Para 2 pessoas", "Autonomia de 100 km ou mais", "Com preço no Radar" (só aparecem se os dados existem).
- Filtros combináveis: preço mín./máx. (preço do Radar quando monitorado, senão referência da planilha), autonomia mínima (km extraído de "Até N km"), capacidade (1/2 pessoas). Categoria omitida: todas as linhas têm o mesmo valor ("Bike elétrica").
- Ordenação: nome, menor/maior preço, maior autonomia; dados ausentes sempre por último.
- Card: foto 4:3, status do Radar só quando existe, preço com fonte explícita ("Preço registrado pelo Radar Vitale" ou "Preço de referência cadastrado (não monitorado)"), autonomia/capacidade, nº de vídeos, CTA "Conhecer a bike" → `/bikes/{slug}` e, só para bikes no Radar, "Analisar preço no Radar" → `/acompanhamento/{bikeId}`. Sem link direto ao Mercado Livre.
- Blocos: Quiz (`/escolherbike`), Radar (`/acompanhamento`), vídeos reais, Grupo (`/grupodeofertas`).
- Pendências: `/radar` e `/comparar` não existem (sem links para eles; seleção de comparação não implementada); `/bikes` fora do sitemap; filtros não persistem na URL.

### 7.2 `/bikes/{slug}` — hub de decisão (rascunho, 23/09/2026)

- Loader SSR: catálogo editorial (cache) → bike pelo slug (404 noindex se inexistente) + `getRadarBike` read-only + todos os vídeos associados ao `bikeId` (até 60) + alternativas.
- Hero: foto, nome, autonomia/capacidade; com Radar: `PriceStatus` + último preço registrado e data; sem Radar: "Preço não monitorado pelo Radar" + preço de referência cadastrado (nunca "hoje"). CTA "Ver oferta no Mercado Livre" com meli.la byte-idêntico; sem link: "Link indisponível no momento". Secundário "Análise de preço completa" → `/acompanhamento/{bikeId}` só com Radar.
- Seções (ordem mobile): resumo rápido (só fatos estruturados), Preço no Radar (`dailyMetrics` 30 dias + `PriceRangeBar`, cobertura e última verificação), especificações/descrição, bloco Quiz, vídeos (4 visíveis + disclosure "Ver todos os vídeos" com o restante, sem perda), alternativas (mesma capacidade, menor diferença de preço de referência, até 3, critério exibido), Grupo de Ofertas, CTA final de compra (só com link válido).
- Breadcrumb visível + JSON-LD BreadcrumbList.
- Guias: contrato `BikeGuide`/`BikeGuides` pronto, sem fonte — nada é renderizado.
- Pendências: `/comparar` e `/radar` inexistentes (sem links); sem gráfico temporal nesta página (histórico completo fica em `/acompanhamento/{bikeId}`); sem redirects entre as rotas do Radar e `/bikes`.

### 7.3 Card do catálogo como link único (23/09/2026, prévia)

`BikeCatalogCard` é um único link `bikeId → slug → /bikes/$slug`. A classificação do Radar é selo informativo, sem destino próprio; o CTA secundário "Analisar preço no Radar" saiu do card e o Radar continua acessível pelo detalhe da bike. Preços, fontes ("Preço registrado pelo Radar Vitale" / "Preço de referência cadastrado (não monitorado)" / "Preço não informado") e status inalterados.
