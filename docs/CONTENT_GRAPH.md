# Content Graph mínimo — Etapa 12

Estado: **primeiro corte publicado; migration aplicada em 25/09/2026**
Data: 25/09/2026

## Objetivo deste corte

Conectar artigos publicados às Bikes no detalhe canônico `/radar/$bikeId`, sem duplicar preço, oferta, URL afiliada, conteúdo ou writer.

Vídeos já possuem leitura por Bike e artigos já exibem relações com Bikes, vídeos e outros artigos. Portanto, este corte completa apenas a leitura reversa Article → Bike no Radar.

## Fundação real confirmada

O schema existente já possui:

- `editorial_videos.primary_bike_id` e `editorial_videos.related_bike_ids`;
- `editorial_articles.video_id`, `primary_bike_id`, `related_bike_ids` e `related_article_ids`;
- RLS habilitada e escrita restrita ao fluxo editorial;
- RPCs públicas somente para conteúdo `published`;
- renderização de artigos, vídeos relacionados e artigos relacionados em `/conteudos/$slug`.

Não será criada tabela paralela de relações neste corte.

## Lacuna e implementação preparada

A RPC `get_published_editorial_index()` ainda omitia `relatedBikeIds`. Por isso, uma página de Bike só poderia localizar artigos em que ela fosse a Bike principal.

O corte local:

1. acrescenta `relatedBikeIds` ao JSON público do índice, mantendo o filtro `status = 'published' AND indexable = true`;
2. normaliza o campo no repositório server-side e mantém fallback `[]`, permitindo frontend compatível antes da migration;
3. encapsula a leitura reversa em `fetchPublishedArticlesForBike`, validando o `bike_id` canônico antes da consulta;
4. filtra no loader SSR do Radar artigos em que a Bike seja principal ou relacionada;
5. exibe até seis artigos reais em `/radar/$bikeId` e omite silenciosamente a seção quando não houver conteúdo;
6. não altera Quiz, vídeo, preço, oferta, histórico, links afiliados, writers ou RLS.

## Limite semântico atual

Os arrays existentes representam relação editorial aprovada, mas não distinguem papéis como `comparada`, `alternativa` ou `citada`. Esse refinamento fica para um gate futuro, caso a operação editorial realmente precise dele. A ausência desses papéis não justifica uma nova tabela agora.

## Gate de publicação

A migration substituiu somente a função de leitura `get_published_editorial_index()` e preservou `SECURITY DEFINER`, `search_path`, revogação de `PUBLIC` e grants atuais. A definição anterior foi registrada em `supabase/rollback/20260925193000_editorial_index_related_bikes.sql`.

Antes de aplicar ou publicar:

1. obter autorização específica para a alteração da RPC de produção;
2. registrar snapshot da definição atual da função para rollback;
3. aplicar a migration pelo fluxo oficial;
4. verificar que o índice público continua retornando apenas artigos publicados e indexáveis;
5. verificar uma Bike principal, uma Bike relacionada e uma Bike sem artigos;
6. publicar o frontend somente após a leitura nova estar disponível.

Rollback: restaurar a definição anterior da RPC, que omite `relatedBikeIds`, e reverter o loader/seção do Radar. Nenhum dado precisa ser apagado.

## Revisão multidisciplinar pós-implementação local

| Perspectiva | Resultado | Evidência / ressalva |
| --- | --- | --- |
| Produto e Estratégia | Pass | Entrega a relação conteúdo–Bike sem antecipar CMS, IA ou recomendação automática. |
| CTO e Arquitetura | Pass | Reutiliza schema, writer e RPC existentes; não cria entidade paralela. |
| IA e Agent Engineering | N/A justificado | Nenhuma geração, inferência ou publicação por IA neste corte. |
| Segurança | Pass | RPC continua limitada a `published` + `indexable`; produção retornou 2 artigos no índice, igual ao total elegível. |
| UX/UI | Pass | Seção condicional, no máximo seis cards, SSR e CTA inequívoco para o artigo. Seção com artigo real conferida na página pública da Bike. |
| CX e Operação | Pass | Não cria nova rotina de curadoria; usa relações que o Admin já mantém. |
| Growth e CRO | Pass | Link interno contextual publicado sem alterar o clique afiliado direto; efeito orgânico ainda não mensurado. |
| PMO e QA | Pass | `pnpm validate` passou após autorização: typecheck, 34 testes direcionados e build. Árvore remota idêntica à validada. |

Decisão consolidada: **GO executado mediante autorização específica nesta task**. Migration aplicada e frontend publicado no mesmo projeto Lovable. O relacionamento editorial continua condicionado aos artigos efetivamente publicados.
