# Gate 0 — Ensaio de restauração (evidência parcial)

Status (23/09/2026): **ensaio parcial de banco executado; Gate 0 NÃO fechado.** Este registro não declara backup completo nem restauração validada de todo o ambiente.

## 1. Escopo executado (informado pelo responsável, fora do Lovable)
- Ambiente: PostgreSQL 17.11 local, cluster isolado, socket restrito, rede outbound bloqueada.
- Integridade: SHA256 do ZIP do backup conferido.
- Formato: dump custom (v1.16).
- Restauração do schema `public` em três fases: pre-data, data e post-data.
- Nenhuma ação executada pelo Lovable no banco vivo ou no ambiente de ensaio.

## 2. Evidência estrutural (ensaio)
| Item | Restaurado |
|---|---|
| Tabelas em `public` | 22 |
| Policies | 16 |
| Triggers não internos | 11 |
| Funções públicas | 6 |

## 3. Contagens de dados (sem PII)
| Tabela | Backup restaurado | Vivo read-only (23/09/2026) | Situação |
|---|---|---|---|
| `bike_catalog_snapshot` | 1 | — | não comparado aqui |
| `bike_admin_overrides` / `bike_assets` / `bike_profiles` | 32 cada | — | não comparado aqui |
| `bike_price_history` | 169 | — | não comparado aqui |
| `bike_price_daily` | 588 | 615 | vivo à frente (+27) |
| `quiz_leads` | 6828 | 6835 | vivo à frente (+7) |
| `quiz_events` | 95146 | 95254 | vivo à frente (+108) |
| `integration_logs` | 9317 | 9330 | vivo à frente (+13) |

Vivo também tem 22 tabelas. As diferenças indicam **escritas posteriores ao backup**, que precisam de reconciliação/novo backup antes de qualquer cutover. Nenhum dado pessoal foi copiado para este documento.

## 4. RPCs executadas no ensaio
- `get_quiz_catalog()`: 20 itens.
- `get_price_tracker_catalog()`: 20 itens.
- `get_bike_price_history('v8_ultra', 90)`: executou e retornou objeto.
Paridade byte a byte do JSON com o vivo **não** foi medida.

## 5. Ensaio da proposta SQL revisada (commit 5689bf7)

Testado pelo responsável no PostgreSQL 17 isolado/restaurado, **após limpar SOMENTE a tabela/função de ensaio local**; nenhum objeto do banco de produção foi alterado.

- DDL aplicado: tabela `bikes`, função e trigger imutáveis, sem `IF NOT EXISTS`/`OR REPLACE` (fail-fast).
- Backfill manual inseriu **30 bikes**.
- Paridade de identidade: **0 IDs faltantes**, **0 IDs extras**, **30 slugs únicos**.
- RLS: habilitado (`true`).
- Leitura direta: `anon` e `authenticated` sem `SELECT`; `service_role` com acesso.
- A proposta revisada removeu o campo `specs` JSONB livre e ajustou `capacity` para `capacity_people smallint` (1 ou 2), alinhado ao snapshot.
- Não foi testado writer, Storage, Edge Functions, secrets, jobs, ACLs nem paridade das RPCs contra o vivo.

**Este ensaio não fecha o Gate 0 nem autoriza aplicação da proposta no Supabase vivo.**

## 6. NÃO restaurado / NÃO validado
- Storage (imagens espelhadas em `bike_assets`).
- Edge Functions e seus deploys.
- Secrets.
- Jobs/cron (pg_cron e agendamentos).
- ACLs/GRANTs completos e roles fora de `public`; schemas `auth`, `storage` etc.
- Tempo de restauração (RTO) e perda aceitável (RPO) formalizados.
- Paridade de RPC contra o vivo.

## 6. Para fechar o Gate 0
1. Backup novo (ou incremental reconciliado) cobrindo as escritas posteriores.
2. Restauração isolada de Storage, Edge Functions (código), jobs e ACLs, ou decisão escrita que os exclua com plano alternativo.
3. Paridade das três RPCs contra o vivo (JSON e hrefs idênticos).
4. RTO/RPO registrados e aceitos pelo responsável.
