# Paridade entre KPI e gestão de bikes

Cenário local, sintético, sem banco/Storage reais ou chamadas externas. A API de lista retorna um placeholder vazio preservado; a API de métricas representa a agregação corrigida, comprovada separadamente em PostgreSQL descartável.

- `zero-created-desktop.png`: criação zero para a reserva vazia.
- `empty-channel-mobile.png`: lista de canal permanece vazia em 390 px; editor disponível.

Teste: `tests/empty-drafts-ui.mjs`. SQL: `tests/empty-listing-drafts.sql`.
