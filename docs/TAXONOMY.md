# Taxonomia e contrato de rotas — Vitale Mobilidade

> **Status (23/09/2026):** rotas canônicas vigentes abaixo. `/radar` e `/ferramentas` são rotas reais; `/acompanhamento` e `/calc` são aliases 301. Reconciliação de slugs `/bikes/{slug}` ↔ IDs legados segue pendente.

## 1. Rotas públicas vigentes

| Rota                | Propósito                             | Observação                                                                        |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `/`                 | Home B2C (orientação)                 | Âncoras internas `#bikes`, `#comparar`, `#ferramentas`, `#conteudos`.             |
| `/escolherbike`     | Quiz de recomendação de bike elétrica | Landing de conversão terminal; sem header/links exploratórios; canonical fixo.    |
| `/radar`            | Radar de preços (listagem)            | **Canônica.** Publicada e verificada.                                             |
| `/radar/{bikeId}`   | Radar de preços (detalhe)             | Usa o `bike_id` legado literal, incluindo `_`, sem conversão de formato.          |
| `/bikes`            | Catálogo/descoberta de bikes          | Lê `get_bikes_public_catalog` (Supabase).                                         |
| `/bikes/{slug}`     | Página de decisão de uma bike         | `slug` = `bike_id` com `_` → `-`.                                                 |
| `/ferramentas`      | Hub de ferramentas de decisão         | **Canônica.** Lista só Quiz, Radar e catálogo; comparador/calculadora sem CTA.    |
| `/grupodeofertas`   | Grupo de ofertas (WhatsApp)           | Retenção.                                                                         |
| `/painel-bikes`     | Painel operacional                    | `Disallow` no robots.txt.                                                         |

### 1.1 Aliases 301 (compatibilidade)

| Alias                      | Destino               | Regra                                                                     |
| -------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `/acompanhamento`          | `/radar`              | 301 server-side, query/UTM preservados.                                   |
| `/acompanhamento/{bikeId}` | `/radar/{bikeId}`     | 301, `bikeId` literal (sem decodificar/normalizar) + query.               |
| `/calc`, `/calc/`          | `/ferramentas`        | 301, query/UTM preservados. Não captura `/calculadoras/*`.                |
| `/#calc` (fragmento)       | bloco da calculadora  | Âncora alias mantida na Home; o ID canônico do bloco é `#ferramentas`.    |

Implementação única em `src/lib/legacy-redirects.ts`, avaliada em `src/server.ts` antes do SSR. Rollback = remover o bloco de redirect e reverter os links de navegação; nada no banco muda.

## 2. Rotas futuras reservadas (sem páginas criadas)

| Rota                | Propósito                    | Restrição                                                                                                                    |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/conteudos`        | Hub de conteúdo              | Reservado. Sem links internos até existir.                                                                                   |
| `/conteudos/{slug}` | Artigo ou vídeo              | Reservado.                                                                                                                   |
| `/comparar`         | Comparador de bikes          | Reservado (Etapa 19). Sem links internos até existir.                                                                        |
| `/calculadoras/*`   | Calculadoras futuras         | Reservado; o redirect de `/calc` não interfere neste prefixo.                                                                |

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

- **Feito:** `/acompanhamento[/{bikeId}]` → `/radar[/{bikeId}]` (301 real, publicado e verificado no domínio); `/calc` e `/calc/` → `/ferramentas` (301, em prévia).
- **Pendente:** mapeamento explícito entre `/bikes/{slug}` e IDs legados em redirects (hoje o slug é derivado por `_` → `-`, sem tabela de aliases).
- Redirects são 301 centralizados em `src/lib/legacy-redirects.ts` + `src/server.ts`, nunca hardcoded em componentes.

## 6. Sitemap

O sitemap só inclui páginas públicas existentes e elegíveis à indexação. Hoje:

- `/`
- `/escolherbike`
- `/radar`
- `/bikes`
- `/ferramentas`

Fora do sitemap: painel (bloqueado no robots.txt), aliases 301 (`/acompanhamento`, `/calc`), rotas inexistentes (`/conteudos`, `/comparar`) e páginas de detalhe (`/radar/{bikeId}`, `/bikes/{slug}`) — estas dependem de geração dinâmica do sitemap, para não fixar uma lista que envelhece.

## 7. `/bikes` e `/bikes/{slug}` (histórico do rascunho de 23/09/2026 — links de `/acompanhamento` já migrados para `/radar`)

- Fonte: aba oficial de bikes (gid=0), leitura read-only no servidor com cache; inclui todas as linhas nomeadas, inclusive "Não Elegível" (elegibilidade só afeta o Quiz).
- `bikeId` canônico = mesmo resolvedor do sync (`resolveBikeId`/`normalizeName`); `slug` = `bikeId` com `_` → `-` (ex.: `v9_max_20ah` → `v9-max-20ah`). Colisões de ID/slug descartam a linha repetida, nunca sobrescrevem.
- Link: só `meli.la` válido e idêntico ao da planilha; senão "Link indisponível no momento". Preço exibido como "Preço de referência cadastrado", nunca como preço de hoje.
- Slug inexistente → 404 `noindex`. Ainda fora do sitemap; redirects `/acompanhamento/{bikeId}` ↔ `/bikes/{slug}` seguem pendentes.

### 7.1 `/bikes` — página de descoberta (rascunho, 23/09/2026)

- SSR via `getBikesDiscovery` (`src/lib/bikes-discovery.functions.ts`): catálogo editorial (30 linhas) + junção por `bikeId` com `get_price_tracker_catalog` (preço e classificação vindos de `buildRadarEntries`, sem recálculo) + contagem real de vídeos da aba "Videos Youtube".
- Busca por nome no hero; atalhos: "Para 2 pessoas", "Autonomia de 100 km ou mais", "Com preço no Radar" (só aparecem se os dados existem).
- Filtros combináveis: preço mín./máx. (preço do Radar quando monitorado, senão referência da planilha), autonomia mínima (km extraído de "Até N km"), capacidade (1/2 pessoas). Categoria omitida: todas as linhas têm o mesmo valor ("Bike elétrica").
- Ordenação: nome, menor/maior preço, maior autonomia; dados ausentes sempre por último.
- Card: o card inteiro é um único link para `/bikes/{slug}` (foto 4:3, nome, status do Radar quando existe, preço com fonte explícita, autonomia/capacidade, nº de vídeos e CTA visual "Conhecer a bike"). Selo/preço/fonte são informativos e não têm destino próprio. Acesso ao Radar fica na página de detalhe da bike. Sem link direto ao Mercado Livre.
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

### 7.4 Heróis temáticos das páginas estruturais (23/09/2026, prévia)

Apenas Home, `/bikes` e o Radar (`/radar`) usam hero fotográfico com tema próprio (imagens editoriais geradas, sem identificar modelo/preço/oferta). Quiz, `/ferramentas`, detalhe de bike e páginas internas não seguem esse padrão.

## 8. Radar canônico em `/radar` (Etapa 9 — publicada)

`/radar` e `/radar/{bikeId}` são as rotas canônicas do Radar, com canonical próprio. `/acompanhamento[/{bikeId}]` responde 301 antes do SSR, preservando `bikeId` literal e query/UTM. Menu, rodapé, Home, `/bikes`, cards, busca, assistente e sitemap apontam para `/radar`.

## 9. `/ferramentas` (23/09/2026, prévia)

Página estrutural SSR com H1 único, `head()` próprio e canonical `/ferramentas`. Lista com CTA apenas fluxos funcionais: Quiz (`/escolherbike`), Radar (`/radar`) e catálogo (`/bikes`). Comparador e calculadora aparecem em bloco "Em construção", sem CTA, sem número ou resultado. Nenhuma lógica de Radar é duplicada. Nav "Ferramentas" (header, menu mobile, rodapé, atalhos da Home) aponta para `/ferramentas`; o atalho "Calculadora de economia" rola para `/#ferramentas`, com `#calc` mantido como âncora alias (sem H2 duplicado).
