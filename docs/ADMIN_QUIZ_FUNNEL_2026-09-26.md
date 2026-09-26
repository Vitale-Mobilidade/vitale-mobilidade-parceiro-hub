# Funil real do Quiz no Admin Growth — 26/09/2026

## Diagnóstico
O `/admin/growth` calculava "iniciaram" e "concluíram" a partir de `quiz_leads`, que só existe depois do formulário de nome/telefone. Isso mostrava conclusão próxima de 100% e não media visitas, início nem abandono por pergunta. Não havia pageviews no Admin (GA4 não conectado).

## Decisão
- Tabela `public.quiz_funnel_sessions` (anônima, sem PII): `session_id` aleatório por aba (sessionStorage), primeira/última atividade, `page_viewed_at`, `started_at`, `highest_answered_step` 0..7 monotônico, `lead_form_reached_at`, `completed_at`, pathname, domínio do referrer, UTMs, device. RLS ativa, sem políticas; acesso só `service_role`. Índices: primeira atividade, última atividade, conclusão.
- RPC `track_quiz_funnel_session` (service_role): UPSERT idempotente; estágios só avançam; estágios posteriores implicam os anteriores; valida evento e passo.
- RPC `admin_quiz_funnel_metrics(p_since)` (service_role): coorte por primeira visita; visitantes, iniciados, alcance/avanço/abandono por pergunta (abandono só após 30 min sem atividade), formulário, concluídos, taxas; leads únicos por telefone; cliques de compra; pessoas identificadas que clicaram.
- Front (`src/lib/quiz-funnel.ts`): fire-and-forget (`fetch` keepalive, erros engolidos) + `dataLayer` `quiz_funnel_*`. Eventos: `page_view` (entrada), `quiz_started` (clique real), `question_answered` 1..7, `lead_form_reached`, `quiz_completed` (só com recomendação final exibida). Nunca envia nome, telefone, respostas ou leadId; path sem query e referrer só hostname.
- `quiz-track`: nova ação `track_funnel`; ações existentes intactas. `editorial-admin`: `growth` usa a RPC e devolve cobertura.
- `/admin/growth`: cartões separados (Visitantes da página do Quiz, Iniciaram, Formulário alcançado, Concluíram, Leads únicos, Cliques de compra, Pessoas identificadas que clicaram), tabela por pergunta e aviso de cobertura/sem GA4. Taxas sem base mostram "—".

## Cobertura
Sem dados antes da implantação (26/09/2026); nada é estimado retroativamente. Leads/cliques continuam vindo de `quiz_leads` (histórico completo).

## Revisão pré (8 perspectivas)
- Produto: responde "onde as pessoas saem do Quiz". CTO: sem mudar scoring/lead/afiliados; RPC isolada. IA: não aplicável. Segurança: sem PII, service_role only, validação dupla (Zod + SQL). UX: Quiz não espera analytics. CX: nada visível ao visitante. Growth: métricas honestas, sem 100% falso. PMO: ordem de release definida, rollback simples.

## Revisão pós
- Validação: `pnpm validate` OK; `src/lib/quiz-funnel.test.ts` 5/5.
- Migration aplicada; linter: 1 INFO "RLS sem política" intencional (acesso só service_role).
- `quiz-track` implantada: rejeita passo inválido (`invalid_funnel`); ação antiga responde como antes.
- `editorial-admin` implantada.
- Smoke público local sem nome/telefone: page_view, quiz_started, question_answered 1..7, lead_form_reached enviados; linha gravada com passo 7 e formulário alcançado; nenhum lead criado. `page_view` duplicado no dev é idempotente.
- RPCs negadas a usuários não service_role (confirmado).
- Pendente: conferência autenticada do `/admin/growth` e publicação do site.

## Rollout
1. validar código → 2. migration → 3. `quiz-track` → 4. `editorial-admin` → 5. publicar frontend.

## Rollback
Reverter o commit do frontend e republicar (Quiz volta a não medir; nada mais depende). `editorial-admin` anterior pode ser reimplantado. A tabela/RPCs podem ficar (inertes) ou ser removidas por migration aprovada.
