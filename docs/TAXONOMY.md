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
