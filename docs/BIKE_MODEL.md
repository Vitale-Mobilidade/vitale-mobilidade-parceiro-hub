# Modelo de Bike: contrato preparatório (Etapa 6)

Status (23/09/2026): **contrato, código e proposta SQL avançados; banco pendente.** Nenhuma tabela, migration ou escrita no banco vivo foi criada. Ensaio parcial de restauração do schema `public` executado fora do Lovable (`docs/GATE0_RESTORE_REHEARSAL.md`); **Gate 0 não fechado** (backup anterior a escritas vivas; Storage, Edge Functions, secrets, jobs e ACLs não validados). Proposta aditiva não executável automaticamente: `docs/sql/bikes_stage6_proposal.sql` (§11).
Fontes: migrations em `supabase/migrations/`, código do repositório e auditoria **read-only** do schema vivo e da planilha realizada nesta task em 23/09/2026 (§7).

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
