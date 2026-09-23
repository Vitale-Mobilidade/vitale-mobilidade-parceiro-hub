# Modelo de Bike: contrato preparatório (Etapa 6)

Status: **só documento.** Nenhuma tabela, migration ou escrita no banco foi criada. Toda escrita segue bloqueada até o ensaio de restauração e a leitura do schema vivo.
Fonte deste mapa: migrations versionadas em `supabase/migrations/` e código do repositório. O schema vivo **não** foi consultado, então pode divergir.

## 1. Modelo atual (chave comum: `bike_id` texto)

| Estrutura | Chave | Papel atual |
|---|---|---|
| `bike_catalog_snapshot` | `id = 'current'` | JSONB `data.bikes[]` gravado pelo `sync-bike-catalog` a partir da planilha (Sheets). Traz id, nome, preço, `linkVitale`, specs, `status`, `sheetEligible`, `isNew`. Leitura pública por policy. |
| `bike_admin_overrides` | `bike_id` PK | `eligible` espelha o Status oficial da planilha (painel/sync). |
| `bike_assets` | `bike_id` PK | Imagem espelhada no Storage (`status`, `public_url`, checksum), gerada pelo worker de imagem. |
| `bike_profiles` | `bike_id` PK | Perfil IA (`data` JSONB, `status` ready/needs_review, `technical_hash`), gerado pelo worker de perfil. |
| `bike_price_history` | uuid, `bike_id` | Eventos de preço (`price`, `link_vitale`, `source`, `confidence` observed/reconstructed). |
| `bike_price_daily` | (`bike_id`, `day`) | Consolidado diário (close/low/high, `verification`). |

RPCs públicas (SECURITY DEFINER, somente leitura; RLS fecha a leitura direta das tabelas de preço):
- `get_quiz_catalog()`: lê o snapshot com `status = eligible` e `overrides.eligible = true`. Bikes novas só entram com imagem e perfil prontos. O perfil `ready` tem prioridade sobre o dado da planilha.
- `get_price_tracker_catalog()`: mesma base, mais `sheetEligible = true`, `price > 0` e `linkVitale` https, com agregados de histórico/diário.
- `get_bike_price_history(p_bike_id, p_days)`: detalhe de uma bike.

## 2. Fontes de autoridade (hoje)
- **Identidade, nome, specs, preço e link:** planilha → `sync-bike-catalog` → snapshot. O snapshot é a cópia operacional, não a origem.
- **Elegibilidade:** Status da planilha, espelhado em `bike_admin_overrides`, somado aos filtros das RPCs. Quiz e Radar têm regras **diferentes**.
- **Preço/link observados ao longo do tempo:** `bike_price_history` / `bike_price_daily`.
- **Imagem e perfil:** `bike_assets` / `bike_profiles` (derivados, não autoritativos para preço).

## 3. Entidades alvo (conceituais, sem tabela)
- **Bike** (raiz): `bike_id` legado imutável, nome, specs.
- **Offer**: loja, URL afiliada (byte a byte), preço atual, elegibilidade.
- **PriceObservation**: evento/dia ligado a Bike + Offer.
- **Media**: imagens/vídeos ligados a Bike.
- **ContentRelations**: Article/Video/Comparison → Bike, **sem copiar** preço, link ou estoque (ver `docs/TAXONOMY.md`).

## 4. `bike_id` vs slug
- `bike_id` é a chave técnica atual (`BIKE_ID_RE`, pode ter underscore). Nunca é convertido nem renomeado.
- `slug` é editorial, separado e explícito, e mapeado para `bike_id`. **Nenhum slug oficial foi declarado.** Aliases e redirects ficam pendentes.

## 5. Sequência de reconciliação (antes de qualquer tabela nova)
1. Ensaio de restauração de banco/Storage concluído.
2. Leitura read-only do schema vivo e comparação com as migrations.
3. Inventário de 100% dos `bike_id` em snapshot, overrides, assets, profiles, history e daily, classificando cada um: ativo, inelegível, órfão ou duplicado.
4. Decisão explícita sobre órfãos e aliases, sem apagar histórico.
5. Proposta de schema com RLS, GRANTs e leitura só por RPC, com revisão antes da migration.
6. Backfill só leitura/cópia, com checagem de paridade das RPCs atuais (mesmo JSON, mesmos hrefs).

## 6. Riscos
- **20 elegíveis vs 32 registros auxiliares** observados na auditoria: há `bike_id` em estruturas auxiliares sem bike elegível correspondente. Não presumir que sejam lixo nem aliases.
- **RLS:** as tabelas de preço/alertas negam acesso direto. Uma tabela nova sem policies e GRANTs corretos quebra a leitura ou expõe dados.
- **Aliases:** renomear ou normalizar id quebra URLs `/acompanhamento/{bikeId}`, alertas e histórico.
- **Histórico:** eventos reconstruídos e observados precisam manter `source`/`confidence`. O mínimo histórico não pode sumir (já houve regressão com a janela de 120 dias).
- **URLs afiliadas:** devem ser preservadas byte a byte. Não reescrever, normalizar nem copiar para conteúdo.
- **Divergência Quiz × Radar:** as regras de elegibilidade diferem, e um modelo único não pode mudar silenciosamente nenhuma das duas.
