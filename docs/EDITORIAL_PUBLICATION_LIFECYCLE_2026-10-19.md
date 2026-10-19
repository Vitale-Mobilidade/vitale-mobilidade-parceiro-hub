# Publicação encerra pendência da fila — 19/10/2026
Classificação estrutural: Supabase/automação editorial. Caso confirmado zEukqkFQnSM/artigo112e7b66-0dff-4567-8016-b7f919765449 publicado sem erros, fonte needs_review anterior à publicação. A correção pontual anterior não cobriu a transição manual.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / decisão |
|---|---|
| Produto | Artigo publicado encerra geração original; prosseguir. |
| CTO | Trigger transacional ao publicar, reconciliação idempotente de casos anteriores, guarda contra falha tardia; timestamp distingue tentativa posterior; prosseguir condicionado. |
| IA | Não repetir IA/capa nem apagar histórico; prosseguir. |
| Segurança | Funções com search_path fixo, sem permissão de cliente, vínculo artigo/vídeo validado; prosseguir. |
| UX | Alerta corresponde a trabalho pendente real; prosseguir. |
| CX | Recuperação manual e automática convergem; draft/arquivo não fecham pendência; prosseguir. |
| Growth | Conteúdo e SEO público intactos; prosseguir. |
| PMO | PostgreSQL com cenários de estado e rollback188c5dd; validate; prosseguir. |

Decisão: trigger de publicação marca source done atomicamente apenas artigo válido publicado com data e fonte correspondente, sem mudar texto/capa/runs. Trigger source rejeita retorno tardio a estado de pendência se execução é anterior à publicação. Reconciliação alcança cases existentes por timestamp/vínculo. Falha genuinamente posterior à publicação permanece visível. Despublicar/arquivar não reabre geração nem republica. Fora de escopo: completar capa automática no botão manual, retries de IA paga, configuração cron. Critérios: manual/auto fecha, alerta tardio não reabre, erro novo posterior permanece, publicadoinválido/draft/outrovídeo não fecha, repetição idempotente. Correção operacional deste item autorizada pelo pedido; release da regra permanente requer confirmação específica.

## Revisão posterior
Produto Pass (publicação encerra fluxo original); CTO Pass (triggers transacionais idempotentes, timestamp e vínculo; tentativa nova começa em estado ativo e falha posterior permanece); IA Pass (nenhuma geração ou replay); Segurança Pass (funções privadas, search_path fixo); UX Pass (conclusão elimina aviso antigo); CX Pass (draft/arquivo/nova falha não escondidos); Growth Pass (texto/capa/publicação intactos); PMO Pass (10 assertions PostgreSQL17 locais cobrem backfill, manual/auto, draft, late failure, new failure, savepublished, archive, invalid, vínculo diferente; pnpm validate exit0 com61regressões/typecheck/build; diff check).
Correção operacional do item atual aplicada com filtro exato e validação de publicação anterior: zEukqkFQnSM passou needs_review→done. Histórico e artigo não alterados. A migration permanente foi autorizada pelo usuário e aplicada atomicamente em produção, registrada como 20261019210000. Verificação pós-release: dois triggers ativos; fonte zEukqkFQnSM done; zero pendências anteriores a publicações válidas. Sem chamada de IA ou alteração do artigo/capa. Rollback: remover os2triggers e2funções; estados já encerrados podem permanecer pois são publicações válidas. Não reabrir globalmente itens concluídos.
