# Snapshot proporcional antes da migration

Base restaurável: `4477a20a6a6bb3443be8c32ac62a8efb80800fd7`. Leitura oficial em 22/11/2026, antes de qualquer DDL desta etapa.

- `links_journey_events`, `record_links_journey(uuid,integer,text,text,text,text)` e `admin_links_journeys(date,date,integer)` ausentes.
- `/links`: 21 pageviews em 2026-11-22, nenhuma outra linha desse path.
- `site_analytics_daily`: 4.739 linhas / 24.467 eventos; `site_analytics_hourly`: 213 linhas / 6.935 visualizações. Contagens globais podem crescer com tráfego normal; nenhum backfill ou gravação de teste autorizado.
- Ambas tabelas anteriores com RLS ativo; ACL `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,sandbox_exec=ar/postgres}`. Nenhuma política/permissão anterior será modificada.
- As quatro funções anteriores mantêm ACL `{postgres=X/postgres,service_role=X/postgres}`. MD5s: `admin_public_traffic` = `6f5c777fbaf81b6865ea6d4bcf94b4bc`; `admin_site_analytics_range` = `b3c883b2b7cf490587349af698562da6`; `record_public_traffic_hour` = `70fbf4fe402d746309a218d69197347e`; `record_site_analytics` = `0bd54e626ac6892cfa665a70023df67a`.
- Definições restauráveis dos três primeiros objetos: `docs/sql/links-campaign-release/forward.sql` e migration oficial `drizzle/migrations/0022_links_campaign.sql` no commit base. Definição do coletor/DDL anterior permanece no histórico aplicado do mesmo commit; definição viva completa das quatro funções foi lida, sem PII ou secrets. A nova migration não substitui esses objetos.
- Rollback desta etapa: flags desligadas e frontend/Edges da base; preservar nova tabela/eventos e todo histórico. Não executar DROP/DELETE ou editar migrations passadas.
- Gate `LINKS_JOURNEY_ENABLED` ausente na listagem oficial de secrets; `SITE_ANALYTICS_ENABLED` existente, preservado sem gravação.

Adaptação mecânica obrigatória: apenas o GRANT da nova tabela foi antecipado para depois de CREATE TABLE, antes de RLS, conforme a regra do projeto; privilégios/políticas/SQL lógico permanecem iguais. O arquivo forward integrado, com essa única mudança de ordem, será enviado byte a byte à ferramenta oficial.