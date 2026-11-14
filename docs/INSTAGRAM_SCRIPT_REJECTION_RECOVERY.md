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
Correção de 14/11: `bunx vitest run src/lib/instagram` — 112/112 (12 arquivos; 22 testes de recuperação).
Build automático da prévia OK; `git diff --check` sem erros. Sem execução manual de build/typecheck,
teste pago, deploy Edge ou alteração no prompt Edge. Verificação Deno do release anterior não foi repetida (Edge intocado).

## Produção (passos mínimos)
### Correção estreita de 14/11, 00:18:42 BRT
Estado relatado pelo proprietário: `blocked`, `script_attempted=false`, zero artes,
`instagram_script_rejected` com detalhe `instagram_ending_question_invalid`. Payload não preservado;
ausência/erro de versão e convite externo são causas condicionais cobertas, não diagnóstico comprovado do payload perdido.
Somente resposta nova: versão ausente ou string exata `"4"` recebe 4 se todos os slides têm masters A–E
(4–6 slides) e existe bloco de veredito; versão explícita diferente permanece intocada.
Em v4, pergunta interna segura permanece; ausente/vazia/>100 caracteres ou CTA externo recebe
`Qual é a sua dúvida?`, sem afirmação factual/URL. O detector é o mesmo do contrato;
títulos, corpos, números, evidências, CTAs restantes e scripts salvos não são alterados.
Razões allowlisted são exibidas em português, inclusive ao ler o erro antigo; nenhum JSON de provedor é exibido.
Retomar continua disponível na rejeição confirmada; Concluir sem cenário exige roteiro com scene e etapa tentada.

Para ESTA nova rejeição: Codex revisa o commit e faz release somente do Hub; depois conferir o estado
atual e clicar Retomar uma vez, se ainda rejeição confirmada sem roteiro/arte/cenário/publicação.
**Não executar o SQL de recuperação antigo novamente**: `script_attempted=false` já permite retomada.
Nenhum deploy Edge, SQL, flag ou chamada paga foi executado nesta correção.
Rollback: release do Hub anterior (137cc19), sem alteração de dados; perguntas de roteiros já salvos não são reescritas.
Cobertura mock: fixture do screenshot sem versão/com string 4 e CTA, pergunta segura/ausente/longa,
estrutura ambígua/legados, evidência inválida/outros CTAs, save falho e transporte incerto.
Verificação do roteiro/render ocorre com Studio mock: geração real, revisão autenticada hospedada e release ficam com o proprietário/Codex.

### Recuperação original (somente se ainda aplicável ao estado anterior)
1. Revisar diff e publicar o Hub (sem deploy Edge, migration ou flags).
2. Executar `docs/sql/instagram-recovery/0ff04355_script_rejected_retry.sql` após revisão (1 linha esperada).
3. Abrir o rascunho e clicar Retomar uma vez (uma chamada paga de roteiro).
Rollback: republicar o Hub anterior; SQL de rollback no arquivo (antes do Retomar).

## Deploy futuro separado (opcional)
`supabase/functions/_shared/instagram-gateway.ts` ganhou contrato explícito no prompt (arrays, scene null, enums, emphasis ≤45 literal).
Mantém `response_format: json_object`; schema estruturado estrito para Gemini nesse caminho não foi verificado e não foi ativado.
Requer deploy isolado de `editorial-admin`. Custo deste build: zero IA.
