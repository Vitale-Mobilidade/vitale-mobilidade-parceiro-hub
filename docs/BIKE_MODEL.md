# Modelo de Bike: contrato preparatório (Etapa 6)

Status (23/09/2026): **contrato e código avançados; banco pendente.** Nenhuma tabela, migration ou escrita no banco foi criada. Toda escrita segue bloqueada até o Gate 0 (restauração isolada).
Fontes: migrations em `supabase/migrations/`, código do repositório e leitura **read-only** do schema vivo feita pelo responsável em 23/09/2026 (§7).

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

## 7. Evidência do schema vivo (read-only, 23/09/2026, informada pelo responsável)
- `public.bikes` **não existe**.
- As seis tabelas (`bike_catalog_snapshot`, `bike_admin_overrides`, `bike_assets`, `bike_profiles`, `bike_price_history`, `bike_price_daily`) têm RLS habilitado.
- Snapshot `current`: **30** `bike_id`. União snapshot/overrides/assets/profiles/history/daily: **32**.
- Fora do snapshot: `jflsjdlksjdl` e `v9_max_duas_baterias` — têm override, asset e profile; **não** têm history nem daily.

Classificação cautelosa (sem apagar nada, sem decisão tomada):
- `v9_max_duas_baterias`: **provável ID legado/alias** de uma linha canônica da planilha (há mapeamento de vídeo para "V9 Max Ufofast Duas Baterias"). Pendente confirmar com o responsável se corresponde a um `bike_id` atual do snapshot.
- `jflsjdlksjdl`: **ID não reconhecido, possivelmente registro de teste**. Não chamar de lixo nem remover; classificar como "órfão a investigar" até decisão explícita.

## 8. Paridade de identidade (código)
- `buildBikeCatalog` (leitura editorial de `/bikes`) agora usa a **mesma precedência** do writer `buildSnapshotFromCsv`: `resolveBikeId(ID)` → `resolveBikeId(Nome)` → `buildStableId(ID bruto, Nome)`. Antes ignorava a coluna ID e podia divergir do banco.
- Teste direcionado: `src/lib/editorial-bikes-id-parity.test.ts` (ID explícito, alias conhecido, nome novo com e sem ID bruto). Writer inalterado.
- Preservados: bikes "Não Elegível", link `meli.la` byte a byte, slug derivado (`_`→`-`), visual e URLs.

## 9. Sequência segura para a tabela normalizada `bikes`
1. **Gate 0:** restauração isolada de banco/Storage validada (pendente).
2. Decisão escrita sobre os 2 IDs fora do snapshot (manter como alias, órfão ou legado; nunca apagar histórico).
3. Proposta de DDL revisada: `bike_id` texto PK imutável (`BIKE_ID_RE`), sem preço/link (ficam em Offer/snapshot); GRANTs explícitos; RLS; leitura pública só via RPC.
4. Migration aditiva (só `CREATE`), sem alterar tabelas/RPCs existentes.
5. Backfill somente cópia a partir do snapshot + IDs auxiliares aprovados.
6. Paridade: `get_quiz_catalog`, `get_price_tracker_catalog` e `get_bike_price_history` com JSON e hrefs idênticos antes/depois.
7. Só depois, em tarefa separada, o writer passa a escrever também em `bikes`.

Critérios de aceite: 32 (ou número aprovado) linhas com IDs iguais à união; zero diff nas três RPCs; links afiliados idênticos; RLS + GRANTs revisados; Quiz e Radar sem regressão.
Rollback: `DROP TABLE public.bikes` (nada depende dela até o passo 7); como a migration é aditiva, as tabelas atuais permanecem fonte operacional.

## 10. Revisão pelas 8 perspectivas (pré → pós)
- **Produto:** risco de `/bikes` mostrar ID diferente do Radar → mesma identidade em ambos.
- **CTO:** duas regras de ID em paralelo → uma precedência, coberta por teste; writer intocado.
- **IA:** perfis futuros dependem de `bike_id` estável → garantido na leitura editorial; nada gerado.
- **Segurança:** nenhuma DDL/policy/escrita; RLS das seis tabelas mantida.
- **UX:** nenhuma mudança visual; slugs atuais iguais para as linhas existentes (colunas ID coincidem com o nome resolvido).
- **CX:** links afiliados e estados "Link indisponível" preservados.
- **Growth:** URLs `/bikes/{slug}` estáveis; nenhum redirect novo.
- **PMO/QA:** teste direcionado + `pnpm validate`; Etapa 6 **não** concluída (DB e Gate 0 pendentes).

Observação: `docs/SQUAD_GOVERNANCE.md` e `AGENTS.md` não existem neste repositório; a revisão segue `docs/PAGE_INTENT_AND_SYNERGY.md`.
