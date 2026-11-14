# Incidente: roteiro Gemini reprovado sem artes (rascunho 0ff04355…, r1)

## Causa
O Gemini devolveu roteiro completo com diferenças de apresentação (evidências como objeto, `scene` ausente,
`concept.module` fora do enum, `emphasis` > 45). A validação estrita reprovou, mas `script_attempted` ficou `true`;
o Retomar seguinte tratou como resultado incerto (`instagram_script_uncertain_no_replay`). O erro original era JSON cru do Zod.

## Correção (somente Hub; funciona com o Edge atual)
- `normalize.ts`: normalização determinística SÓ do roteiro novo (nunca de roteiros salvos v1–v4):
  objeto de evidência completo → array de 1; `scene` ausente → `null`; `emphasis` > 45 descartado (título/corpo intactos);
  módulo desconhecido em artVersion 4 → `cover` (capa) / `decision` (o renderer v4 só distingue `beam`, arte idêntica).
  Não cria texto, fato, número nem evidência; evidência inválida continua reprovada.
- Reprovação confirmada → `blocked`, `instagram_script_rejected`, `script_attempted=false`, mensagem curta; nova tentativa só por Retomar
  sob o lease do claim e apenas sem arte/cenário/publicação. Se a gravação falhar, permanece incerto.
- Timeout/transporte/retorno incompleto do Edge: `script_attempted=true`, sem replay e sem botão Retomar.
- UI: mensagens em português, sem JSON; "Concluir sem cenário" só com roteiro e cenário tentado.

## Testes
`bunx vitest run src/lib/instagram` — 99/99 (inclui `script-recovery.test.ts` com fixture no formato do screenshot). `deno check` do editorial-admin OK.

## Produção (passos mínimos)
1. Revisar diff e publicar o Hub (sem deploy Edge, migration ou flags).
2. Executar `docs/sql/instagram-recovery/0ff04355_script_rejected_retry.sql` após revisão (1 linha esperada).
3. Abrir o rascunho e clicar Retomar uma vez (uma chamada paga de roteiro).
Rollback: republicar o Hub anterior; SQL de rollback no arquivo (antes do Retomar).

## Deploy futuro separado (opcional)
`supabase/functions/_shared/instagram-gateway.ts` ganhou contrato explícito no prompt (arrays, scene null, enums, emphasis ≤45 literal).
Mantém `response_format: json_object`; schema estruturado estrito para Gemini nesse caminho não foi verificado e não foi ativado.
Requer deploy isolado de `editorial-admin`. Custo deste build: zero IA.
