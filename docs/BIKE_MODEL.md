# Modelo de Bike: contrato preparatório (Etapa 6)

Status (23/09/2026): **schema e backfill da entidade Bike concluídos no banco vivo** via migration `supabase/migrations/20260923063339_a73a6a10-69e2-4993-8dbc-d98318850dc1.sql` (promoção da proposta do commit 5689bf7, §13). Etapa 6 **fechada quanto a schema + identidade**; specs estruturadas NULL até fonte validada. Etapa 7 (writer único Sheets→`bikes`) **pendente**. Backup/Gate 0 retirado como impedimento pelo responsável para esta mudança aditiva.
Fontes: migrations em `supabase/migrations/`, código do repositório e auditoria **read-only** do schema vivo e da planilha realizada nesta task em 23/09/2026 (§7).

## 1. Modelo atual (chave comum: `bike_id` texto)

| Estrutura               | Chave              | Papel atual                                                                                                                                                                                     |
| ----------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bike_catalog_snapshot` | `id = 'current'`   | JSONB `data.bikes[]` gravado pelo `sync-bike-catalog` a partir da planilha (Sheets). Traz id, nome, preço, `linkVitale`, specs, `status`, `sheetEligible`, `isNew`. Leitura pública por policy. |
| `bike_admin_overrides`  | `bike_id` PK       | `eligible` espelha o Status oficial da planilha (painel/sync).                                                                                                                                  |
| `bike_assets`           | `bike_id` PK       | Imagem espelhada no Storage (`status`, `public_url`, checksum), gerada pelo worker de imagem.                                                                                                   |
| `bike_profiles`         | `bike_id` PK       | Perfil IA (`data` JSONB, `status` ready/needs_review, `technical_hash`), gerado pelo worker de perfil.                                                                                          |
| `bike_price_history`    | uuid, `bike_id`    | Eventos de preço (`price`, `link_vitale`, `source`, `confidence` observed/reconstructed).                                                                                                       |
| `bike_price_daily`      | (`bike_id`, `day`) | Consolidado diário (close/low/high, `verification`).                                                                                                                                            |

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

## 7. Evidência do schema vivo (read-only, 23/09/2026, auditoria desta task)

- `public.bikes` **não existe**.
- As seis tabelas (`bike_catalog_snapshot`, `bike_admin_overrides`, `bike_assets`, `bike_profiles`, `bike_price_history`, `bike_price_daily`) têm RLS habilitado.
- Snapshot `current`: **30** `bike_id`. União snapshot/overrides/assets/profiles/history/daily: **32**.
- Fora do snapshot: `jflsjdlksjdl` e `v9_max_duas_baterias` — têm override, asset e profile; **não** têm history nem daily.
- Aba `gid=0` (bikes): **30 linhas nomeadas** e **zero valores preenchidos na coluna ID**. Portanto o ajuste de precedência no leitor editorial (`ID explícito → nome → ID gerado`) não altera os slugs/URLs atuais, mas protege a identidade se um ID explícito for introduzido futuramente.

Classificação cautelosa (sem apagar nada, sem decisão tomada):

- `v9_max_duas_baterias` e `jflsjdlksjdl`: **IDs fora do snapshot a investigar**. Não classificar `v9_max_duas_baterias` como alias só porque o nome de um vídeo contém "Duas Baterias"; a correspondência exata de `bike_id` com a planilha ainda não foi confirmada. Não chamar `jflsjdlksjdl` de lixo nem remover. Ambos precisam de decisão explícita antes de serem incluídos em qualquer tabela normalizada.

## 8. Paridade de identidade (código)

- `buildBikeCatalog` (leitura editorial de `/bikes`) agora usa a **mesma precedência** do writer `buildSnapshotFromCsv`: `resolveBikeId(ID)` → `resolveBikeId(Nome)` → `buildStableId(ID bruto, Nome)`. Antes ignorava a coluna ID e podia divergir do banco.
- Teste direcionado: `src/lib/editorial-bikes-id-parity.test.ts` (ID explícito, alias conhecido, nome novo com e sem ID bruto). Writer inalterado.
- Preservados: bikes "Não Elegível", link `meli.la` byte a byte, slug derivado (`_`→`-`), visual e URLs.

## 9. Sequência segura para a tabela normalizada `bikes`

1. **Gate 0:** restauração isolada de banco/Storage validada (parcial: schema `public` ensaiado; pendentes reconciliação de escritas, Storage, Edge Functions, secrets, jobs, ACLs e paridade de RPC).
2. Decisão escrita sobre os 2 IDs fora do snapshot (manter como alias, órfão ou legado; nunca apagar histórico).
3. Proposta de DDL revisada: `bike_id` texto PK imutável (`BIKE_ID_RE`), sem preço/link (ficam em Offer/snapshot); GRANTs explícitos; RLS; leitura pública só via RPC.
4. Migration aditiva (só `CREATE`), sem alterar tabelas/RPCs existentes.
5. Backfill somente cópia a partir do snapshot + IDs auxiliares aprovados.
6. Paridade: `get_quiz_catalog`, `get_price_tracker_catalog` e `get_bike_price_history` com JSON e hrefs idênticos antes/depois.
7. Só depois, em tarefa separada, o writer passa a escrever também em `bikes`.

Critérios de aceite: conjunto de IDs aprovado após investigar os 2 extras (não assumir inclusão automática); todas as linhas aprovadas com IDs iguais à união correspondente; zero diff nas três RPCs; links afiliados idênticos; RLS + GRANTs revisados; Quiz e Radar sem regressão.
Rollback (não destrutivo): manter RPCs e writer antigos como fonte de verdade; desativar/desfazer qualquer novo leitor/writer por flag ou reversão de código; preservar a tabela `public.bikes` e seus dados para análise. Eventual exclusão da tabela só em tarefa separada, com backup e autorizações explícitas.

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

## 11. Proposta de schema `bikes` (não aplicada)

Arquivo: `docs/sql/bikes_stage6_proposal.sql` — fora de `supabase/migrations/`, para teste manual isolado pelo responsável. **Não testado pelo Lovable.**

- Aditiva e **fail-fast**, não idempotente: `CREATE TABLE`, `CREATE FUNCTION` e `CREATE TRIGGER` sem `IF NOT EXISTS`/`OR REPLACE`/`DROP` prévio; reexecução falha em vez de substituir ou ocultar drift.
- `bike_id` texto PK imutável (trigger bloqueia alteração); `slug` editorial explícito `UNIQUE`; `name`; campos estruturados nullable: `autonomy_km`, `max_speed_kmh`, `motor_w`, `battery`, `capacity_people` (smallint, 1 ou 2, alinhado ao snapshot).
- Sem campo JSONB livre de specs: um CHECK de chaves de topo não impediria preço/link aninhados. Demais fatos entram depois, com fonte validada.
- **Sem** preço, link afiliado, elegibilidade/status ou PII.
- RLS ligado, sem policies; `REVOKE` de anon/authenticated; só `service_role`. Leitura pública futura apenas via RPC revisada.
- Backfill (comentado): somente `bike_id`/`slug`/`name` dos 30 IDs do snapshot `current`, slug = `bike_id` com `_`→`-` (igual a `/bikes` hoje), sem `ON CONFLICT`. `jflsjdlksjdl` e `v9_max_duas_baterias` **excluídos** até decisão.
- Paridade: diferença de conjuntos snapshot × `bikes` = 0 nos dois sentidos; contagem 30; slugs iguais aos atuais; md5 do JSON das três RPCs igual antes/depois.
- Rollback não destrutivo: nada lê a tabela; RPCs/writer continuam fonte; preservar tabela e dados; DROP só em tarefa separada com backup e autorização.
- CHECK de `bike_id` espelha `BIKE_ID_RE` (`^[a-z0-9][a-z0-9_-]{0,63}$`, case-insensitive).

**Ensaio da proposta revisada (responsável, PostgreSQL 17 isolado/restaurado, commit 5689bf7):** DDL fail-fast aplicado após limpar somente a tabela/função de ensaio local; backfill manual inseriu **30 bikes**; **0 IDs faltantes**, **0 IDs extras**; **30 slugs únicos**; RLS `true`; `SELECT` para `anon`/`authenticated` `false`, `service_role` `true`. A versão revisada removeu o campo `specs` JSONB livre e trocou `capacity` texto por `capacity_people smallint` (1 ou 2), alinhado ao snapshot. Não testou writer, Storage, Edge Functions, secrets, jobs, ACLs nem paridade das RPCs contra o vivo. **Não libera o Gate 0 nem autoriza aplicação no banco vivo.**

## 12. Revisão compacta (8 perspectivas) — incremento Gate 0 + proposta

- **Produto:** nenhuma mudança visível; entidade Bike ganha forma sem afetar Quiz/Radar.
- **CTO:** proposta aditiva e fail-fast (reexecução falha, sem mascarar drift), fora do fluxo de migrations; nenhuma dependência nova.
- **IA:** `bike_id` estável como âncora; nenhum dado gerado; specs só da planilha.
- **Segurança:** RLS + revoke; sem PII/links; evidência do ensaio sem PII; nada aplicado no vivo.
- **UX:** nenhuma alteração; slugs do backfill iguais aos atuais.
- **CX:** links `meli.la` fora da tabela, intocados.
- **Growth:** URLs `/bikes/{slug}` preservadas; nenhum redirect.
- **PMO/QA:** Gate 0 parcial, Etapa 6 **não** concluída; SQL só será validado pelo responsável em ambiente isolado.

## 13. Aplicação no banco vivo (23/09/2026)

Migration: `supabase/migrations/20260923063339_a73a6a10-69e2-4993-8dbc-d98318850dc1.sql` — aplicada com sucesso, numa única transação.

- Pré-checagem fail-fast: `public.bikes` e `bikes_block_id_change()` inexistentes; snapshot `current` com 30 linhas, 30 IDs, 30 slugs e 30 nomes distintos/não vazios; senão aborta.
- DDL da proposta sem `IF NOT EXISTS`/`OR REPLACE`/`DROP`; backfill `bike_id`/`slug = replace(bike_id,'_','-')`/`name` sem `ON CONFLICT`; asserção final count=30.
- Inclui bikes não elegíveis; exclui `jflsjdlksjdl` e `v9_max_duas_baterias` (seguem a investigar).
- Nenhuma tabela antiga, RPC, writer, sync, Edge Function, Quiz, Radar, página, oferta, afiliado ou analytics alterado. Nada lê `bikes` ainda.

Verificação dirigida (pós-aplicação): count 30; 30 IDs e 30 slugs únicos; 0 slugs fora da regra; 0 faltantes/0 extras vs snapshot; 0 órfãos; RLS true; SELECT anon=false, authenticated=false, service_role=true; REST anon em `bikes` → 42501; RPCs `get_quiz_catalog` e `get_price_tracker_catalog` via API anon → 20 cada.

Linter: avisos existentes (RLS sem policy — intencional, inclui `bikes`; RPCs SECURITY DEFINER públicas do Quiz/Radar — preexistentes, fora do escopo).

Rollback não destrutivo: nada consome a tabela; preservar dados; DROP só em tarefa separada.

Revisão compacta: **Produto** identidade canônica pronta para ligar vídeo/artigo/comparação. **CTO** aditiva, fail-fast, sem segundo writer. **IA** sem fatos inventados; specs NULL. **Segurança** RLS + zero acesso direto público. **UX/CX** sem mudança visível. **Growth** links ML diretos intactos. **PMO/QA** Etapa 6 schema/backfill fechados; Etapa 7 writer pendente.

## 14. Etapa 7 — projeção do sync em `bikes` (23/09/2026)

- Único escritor: `sync-bike-catalog` (e sync-now do `bike-panel`, que reutiliza `runBikeCatalogSync`). Nenhuma função/scheduler nova. Ambas reimplantadas.
- Migration aditiva: RPC `public.project_bikes_from_snapshot(jsonb)` — SECURITY INVOKER, `search_path` fixo, EXECUTE só `service_role`. Um lote = uma chamada = uma transação.
- Código: `_shared/bike-projection.ts` (linhas a partir do snapshot pós-`mergeWithPreserved`), chamado a cada execução bem-sucedida em `_shared/bike-sync.ts`, após overrides e antes do histórico de preço. Resultado em `bike_sync_runs.detail.bikesProjection`.
- Regras: projeta só `bike_id` literal, `name`, `autonomy_km` (autonomyKm > 0) e `capacity_people` (1|2). Spec ausente não sobrescreve valor existente nem vira número. Sem preço, link, elegibilidade, oferta ou PII. Nunca apaga linhas nem muda `bike_id`/`slug` existente. ID novo válido entra com slug `_`→`-`; colisão de slug ou ID/nome inválido → `conflicts` registrado, sem sobrescrever. Update só se algo mudou.
- Falha isolada: erro na RPC é logado; snapshot, overrides, Radar, Quiz, histórico, afiliados e jobs seguem. Próxima execução repara (idempotente).
- Testes dirigidos: `src/lib/bike-projection.test.ts` (3) + `bike-catalog.test.ts` — 35 passaram.
- Pendente: confirmar na próxima execução agendada (HH:07) via `detail.bikesProjection`; sync manual em produção não foi forçado.

## 15. Etapa 8 — Oferta/preço/link separado de Bike (shadow, 23/09/2026)

**Objetivo:** bike mantém `bike_id` estável enquanto anúncio, preço e link mudam; preço e link sempre no mesmo registro.

**Schema + backfill (aplicado):** migration `20260923064500_6637a3c1-…`. Tabela `public.bike_offers` com FK a `bikes`, `id` próprio, `source='sheet'`, `url` exata (sem normalizar), `price>0`, `sheet_status`, `sheet_eligible`, `override_eligible`, `radar_eligible` (renomeada de `quiz_eligible` em 20260923064843; = status eligible ∧ sheetEligible ∧ override ∧ preço/link válidos — elegibilidade comercial do Radar, **não** decisão do Quiz), `is_current`, `first_seen_at`, `synced_at`, `verified_at` (NULL — sem verificação humana inventada), `ended_at`/`end_reason`. Índice único parcial: no máximo 1 oferta atual por bike/fonte. Sem vendedor/listing ID. RLS ligado, sem acesso anon/authenticated; só service_role. Backfill na mesma migration com asserts fail-fast: 30 atuais, 0 divergências de preço/URL vs snapshot, 20 elegíveis = RPC do Radar.

**Writer (implantado):** RPC `project_bike_offers_from_snapshot` (INVOKER, search_path fixo, EXECUTE só service_role), chamada pelo `sync-bike-catalog`/sync-now logo após a projeção de `bikes`. Mesma URL → atualiza preço/flags só se mudou; URL diferente → encerra atual (`link_changed`) e cria nova; preço ou link inválido → encerra atual (`invalid_price`/`invalid_link`) sem criar nova (UI futura: "Link indisponível no momento"). Nunca apaga. Bike ausente de `bikes` é pulada (sem oferta órfã). Falha isolada e logada em `bike_sync_runs.detail.offersProjection`; próxima execução repara.

**Pendente:** primeira execução automática (HH:07) a conferir; **cutover de leitura NÃO realizado** — Quiz, Radar, `/bikes` e CTAs continuam lendo o snapshot (Etapa 9).

**Aceite:** 30/30 atuais, 0 divergências, 20 elegíveis, Quiz/Radar 20, grants fechados — atendido no backfill.
**Rollback não destrutivo:** reverter a chamada no `bike-sync.ts` e reimplantar; tabela e histórico preservados; nenhum leitor depende dela.

**Revisão 8 perspectivas (pré/pós):** Produto — modelo pronto para vitrine sem trocar leitores. CTO — atômico por lote, idempotente, constraint garante 1 atual. IA — N/A. Segurança — RLS fechado, função só service_role. UX/CX — nada visível muda; preço e link nunca de anúncios diferentes. Growth — links meli.la byte a byte, analytics intocado. PMO — Etapa 8 schema+writer feitos; primeira execução e cutover pendentes.

**Riscos residuais:** o Quiz também exige asset+perfil prontos para bikes novas e continua decidido só por `get_quiz_catalog()`; `verified_at` sem processo definido.

### 15.1 Correção pós-auditoria (migration `20260923064843_52c07cc9-…`)

- **URL:** CHECK `^https://meli\.la/[A-Za-z0-9]+$` na tabela (validou os 30 dados existentes) e na função; URL ausente/fora do padrão encerra a oferta atual (`invalid_link`) e nunca cria nova. Bytes preservados, sem normalização.
- **Elegibilidade:** coluna renomeada para `radar_eligible` sem perda de dados. Não usar como decisão do Quiz. Conjunto de IDs comparado com `get_price_tracker_catalog()` dentro da migration: diferença 0/0.
- **`synced_at`:** passa a significar última projeção bem-sucedida — atualizado em todo run, mesmo sem mudança comercial (junto com `updated_at`), sem criar oferta nova nem evento de preço. `verified_at` segue NULL (verificação humana).
- Verificação no vivo: 30 atuais, 0 URLs fora do padrão, 20 `radar_eligible` (0/0 vs Radar), Quiz 20, 0 divergências preço/URL vs snapshot, anon/authenticated sem SELECT/EXECUTE.
- Squad pós-fix: Produto/UX/CX sem mudança visível; CTO contrato mais estrito e nome preciso; Segurança acessos fechados; Growth links byte a byte; IA N/A; PMO primeira execução automática ainda não ocorreu, cutover não feito.

## 16. Campos editoriais em `public.bikes` (23/09/2026)

**Objetivo:** guardar na entidade Bike os fatos editoriais já existentes no snapshot (foto, descrição, descrição curta), sem tocar em preço, link, oferta, elegibilidade ou PII.

**Migration aditiva `20260923125414`:**

- `ALTER TABLE public.bikes` adiciona `image_url`, `description`, `short_description` (todas nullable). CHECK `bikes_image_url_https_chk`: `image_url` NULL ou `^https://[^\s"'<>]+$`.
- `project_bikes_from_snapshot` atualizada (mesma rotina, INVOKER, `search_path` fixo, EXECUTE só `service_role`): projeta os três campos quando presentes e válidos; ausente/inválido **não** sobrescreve valor existente (`coalesce`); update só quando algo mudou.
- Backfill idempotente a partir do snapshot `current` (`image`, `description`, `shortDescription`), com assert final `count = 30`.

**Código:** `buildBikeProjectionRows` passa a emitir `image_url`/`description`/`short_description` a partir de `SnapshotBike.image`, `.description`, `.shortDescription`, com validação https e trim. Nada além disso mudou no writer. Testes dirigidos: `src/lib/bike-projection.test.ts` (4) + `bike-offers-projection.test.ts` (3) — 7 passaram.

**Verificação no vivo:** 30 bikes; 30 com `image_url`, 30 com `description`, 30 com `short_description`; 0 divergências de imagem e descrição vs snapshot; 30 ofertas atuais intactas.

**Não alterado:** Quiz, Radar, RPCs comerciais, `bike_offers`, preço, URLs `meli.la`, analytics, páginas e leitores web (`/bikes` continua lendo a planilha).

**Rollback não destrutivo:** nenhum leitor consome os campos novos; reverter a projeção no código e reimplantar; colunas e dados preservados.

**Revisão compacta:** Produto — entidade Bike passa a ter o conteúdo necessário para o futuro cutover de `/bikes`. CTO — mesma rotina única, idempotente, um lote por transação. IA — nenhum texto gerado; tudo vem do snapshot. Segurança — tabela segue fechada a anon/authenticated; função só `service_role`. UX/CX — nada visível muda. Growth — links e analytics intocados. PMO — cutover de leitura permanece pendente.

## 17. Correção — draft preservado não sustenta oferta comercial (23/09/2026)

**Defeito encontrado:** `mergeWithPreserved` mantém a versão anterior das bikes cuja linha atual da planilha ficou pendente (status `draft`), inclusive `linkVitale` e `price` antigos. Esse array mesclado alimentava `buildBikeOfferRows`, então `v29_pro`, `v35` e `x50_action_pro` seguiam com oferta `is_current = true` mesmo sem **Link Vitale** e **Preço R$** na planilha — contrariando a regra de exibir "Link indisponível no momento".

**Correção (somente projeção de ofertas):** `buildBikeOfferRows(bikes, pending)` e `projectBikeOffers(supabase, bikes, pending)` passam a receber `result.pending` — a fonte de verdade do run — e não derivam nada do link antigo preservado. `commerciallyPendingIds` marca os IDs cuja linha atual tem `Link Vitale` e/ou `Preço R$` em `missingFields`; para esses, `url` e `price` vão **NULL** à RPC existente `project_bike_offers_from_snapshot`, que já encerra a oferta atual sem apagar histórico. Pendência não comercial (ex.: só `Autonomia`) não encerra oferta. `bike-sync.ts` apenas repassa `result.pending`. Nada mudou em `public.bikes`, snapshot de recuperação, Quiz, Radar, RPCs públicos, histórico ou nas URLs das bikes válidas.

**Verificação no vivo (run `f5ad8c04`, forçado apenas por antecipação de `next_run_at`):** 30 bikes preservadas; 3 drafts preservados no snapshot; ofertas: 27 atuais, 3 encerradas com `end_reason = invalid_price` e `ended_at` preenchido, 0 registros apagados; 20 `radar_eligible` conforme a fonte; 0 divergências de preço/URL entre ofertas atuais e snapshot. Testes dirigidos: `bike-offers-projection.test.ts` (5) + `bike-projection.test.ts` (4) — 9 passaram. Edge Functions reimplantadas: `sync-bike-catalog` e `bike-panel` (as únicas que usam o módulo compartilhado).

**Nota de leitura:** `recognized_count` do snapshot (27) é metadado da planilha e **não** o tamanho do array de bikes (30, incluindo os 3 drafts preservados).

## 18. Etapa 10 — cutover de leitura de `/bikes` para Supabase (23/09/2026)

**Campos editoriais restantes.** Migration aditiva incluiu `category`, `autonomy_label` e `capacity_label` em `public.bikes` (nullable, sem dado comercial). `bike-sheet.ts` passou a extrair `Categoria` (coluna opcional) e os rótulos literais de `Autonomia`/`Capacidade` também nas linhas **pendentes** (`PendingRow`), e `mergeWithPreserved` enriquece as bikes preservadas em draft com os rótulos da linha atual sem apagar valores conhecidos. `project_bikes_from_snapshot` projeta os três campos; `NULL` nunca sobrescreve valor existente. Backfill idempotente pelo próprio sync (run `b07d711f`): **30/30** com `category`, `autonomy_label`, `capacity_label`, `image_url`, `description`.

**Leitura pública.** Nova RPC `get_bikes_public_catalog()` (STABLE, SECURITY DEFINER, `search_path = public, pg_temp`, EXECUTE para `anon`/`authenticated`/`service_role`) faz `LATERAL` join de cada bike com **no máximo uma** `bike_offers` `is_current`, `price > 0` e `url ~ '^https://meli\.la/[A-Za-z0-9]+$'`. Preço e link saem sempre do mesmo registro; oferta encerrada não devolve link antigo. Nada de elegibilidade do Quiz, PII ou colunas operacionais.

**Repositório server-side.** `src/lib/bikes-repository.server.ts` lê a RPC com chave publicável, cache 5 min, mantém o último resultado bom em falha, revalida o padrão `meli.la` byte a byte e anula o par preço/link quando um dos dois falta. `editorial-bikes.functions.ts` e `bikes-discovery.functions.ts` passaram a usar esse repositório; `editorial-bikes.server.ts` (CSV) fica no repositório apenas como caminho de rollback.

**Paridade verificada (script read-only, CSV vs RPC):** 30 vs 30 IDs, **0 divergências** em slug, nome, autonomia, capacidade, categoria, imagem, descrição, preço e URL. `/bikes` renderiza 30 cards; `/bikes/v8-ultra` traz `https://meli.la/2keMDer` com o preço da mesma oferta; `/bikes/v35` mostra "Link indisponível no momento"; `/bikes/nao-existe` responde 404. `get_quiz_catalog` = 20 e `get_price_tracker_catalog` = 20, inalterados.

**UI do detalhe.** O bloco de compra usa exclusivamente o par preço+link da oferta atual; sem oferta, "Sem oferta ativa registrada" + "Link indisponível no momento". O Radar aparece como **observação histórica** rotulada, separada do preço comercial, e nunca alimenta o CTA. Nada de "verificado agora" derivado de `synced_at`.

**Ajuste pós-revisão (mesmo dia).** Card, filtro e ordenação de `/bikes` passaram a usar exclusivamente o preço comercial da oferta atual (`sheetPrice`); o preço do Radar aparece só como linha "Radar (histórico)" e o selo de classificação segue informativo. Sem oferta ativa, o card mostra "Sem oferta ativa no momento" e nunca um preço comprável. `mapCatalogRow` virou par atômico: preço e link válidos juntos, ou ambos `null` — assim o CTA do detalhe nunca existe sem o preço da mesma oferta. No topo do detalhe, o selo do Radar só é renderizado quando há oferta ativa. Verificado na prévia: 27 cards com preço de oferta, 3 sem oferta, 20 com linha histórica do Radar.

**Rollback.** Reverter apenas os dois `*.functions.ts` para `fetchBikeCatalog()` (CSV). Nenhuma tabela, RPC, oferta ou histórico precisa ser apagado.

**Publicação.** Publicado em 23/09/2026 (commit `c63c598`, deploy `c8b1f67e-f4dc-4ed6-bccf-440847d0269a`). Verificado no domínio: `/bikes`, `/bikes/v8-ultra`, `/radar` e `/escolherbike` 200; `/bikes/v29-pro` exibe "Sem oferta ativa registrada" e "Link indisponível no momento" no SSR; redirect legado 301 com UTM preservado. Pendências: sem prova de ganho de experiência/conversão até a análise de cliques reais (Etapa 11); descrição da V8 Ultra na planilha contradiz a autonomia estruturada (50 km vs alegação de até 80 km) — correção é editorial, na fonte; imagens ainda grandes.

## 16. Radar público desacoplado da elegibilidade do Quiz (migration 20260923142233)

Substituição apenas das duas funções de LEITURA existentes (`get_price_tracker_catalog`, `get_bike_price_history`). Sem INSERT/UPDATE/DELETE, sem mudança de schema, RLS, grants ou writer; `get_quiz_catalog()` intocada.

Contrato novo, explícito:
- Origem: `public.bikes` + LATERAL para **no máximo uma** `public.bike_offers` com `is_current`, `ended_at IS NULL`, `price > 0` e `url ~ '^https://meli\.la/[A-Za-z0-9]+$'`. Preço e link vêm sempre da MESMA linha; o snapshot não é mais fonte comercial (as 3 drafts guardam preço/link antigos e por isso ficariam erradas).
- Campos editoriais (nome, imagem, textos, specs) continuam vindo de `bikes`/`bike_assets`/`bike_profiles`/snapshot.
- `hasCurrentOffer = false` → `currentPrice` e `link` ausentes (histórico arquivado). `lastObservedPrice` e `lastObservedAt` expõem só o que já foi registrado.
- Entram no catálogo do Radar as bikes com oferta atual válida OU com histórico registrado.

Evidência verificada após a migration (leitura via chave publicável):
- 30 itens: **27 ativos** (oferta atual válida) + **3 arquivados** (`v29_pro`, `v35`, `x50_action_pro`), nenhum deles com preço ou link.
- Paridade dos 20 antes públicos: **0 divergências** de preço/link, nenhum desapareceu; 7 novos no Radar (`f6_pro_s`, `s12`, `s14`, `s8`, `v10_max`, `v20_mini`, `bw02`).
- Todos os 27 links no padrão `meli.la` exato, byte a byte iguais a `bike_offers`.
- `get_quiz_catalog()` continua com **20** itens.
- ID inexistente continua retornando `null` (404 na rota).

Ressalva: o linter do Supabase segue apontando os mesmos avisos pré-existentes (15 tabelas com RLS sem policy; funções SECURITY DEFINER executáveis por anon/authenticated — que é o desenho intencional das RPCs públicas). Nenhum aviso novo foi introduzido.

Rollback: reexecutar as definições anteriores das duas funções (migrations `20260910232458`/`20260910235455`) e reverter o código de leitura; nenhum dado precisa ser tocado.
