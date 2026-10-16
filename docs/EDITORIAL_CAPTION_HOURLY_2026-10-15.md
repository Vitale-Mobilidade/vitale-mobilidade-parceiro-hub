# Espera horária por legendas — 15/10/2026
Classificação estrutural, integração Supabase/YouTube/IA. Usuário autorizou implementar e publicar, incluindo espera automática até disponibilidade da legenda.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Vídeo sem legenda volta sozinho; prosseguir. |
| CTO | Agenda persistida de captura+IDs manuais; worker existente consulta vencidos; CAS existente impede concorrência; prosseguir. |
| IA | Repetir só captura sem saída; texto/capa/checkpoints existentes não repetidos; prosseguir. |
| Segurança | Campos privados com RLS existente; IDs validados no gerador; nenhuma nova permissão; prosseguir. |
| UX | Espera aparece separada de falha e tem retomada manual; prosseguir. |
| CX | Pending não envia emails; erros reais continuam alertando; prosseguir. |
| Growth | Publicação segue pipeline e QA existente; sem SEO alterado; prosseguir. |
| PMO | Migration aditiva, testes de agenda/seleção/exclusão, validate e evidência real; rollback desativar agenda e reverter código; prosseguir. |

Decisão: pending de legenda agenda nova captura em 1h; worker horário/drain consulta vencidos sem artigos/captura. Apenas captura pode repetir e a reserva atômica atual continua sendo a autoridade; seleção manual armazenada para tentativa automática. Ao obter captura, limpar agenda e seguir pipeline normal. Sem email de espera ou em tentativas pending. Outros erros retiram agenda e continuam alerta normal. Cadência depende do tick existente (até alguns minutos após vencimento). Fora de escopo: transcrever áudio por serviço pago, repetir etapas pagas ou apagar reservas. Migração2campos privados. Critérios: não tentar antes de1h, não repetir saída existente, preservar bikes e não enviar email pending. Rollback: limpar caption_retry_at onde não capture/artigo e reverter código; campos podem permanecer.

## Revisão posterior
Produto Pass (geração automática após espera); CTO Pass (2campos/índice aditivos, agenda privada, CAS preservado); IA Pass (repetição somente pré-captura, checkpoints existentes intactos); Segurança Pass (RLS/permissões inalterados, catálogo validado); UX Pass (espera informativa separada de erro); CX Pass (pending não chama helper de email, erros reais continuam); Growth Pass (QA/publicação intactos); PMO Pass (89 testes direcionados, PostgreSQL17 isolado validou migration e exclusões/vencimento/IDs, pnpm validate exit0 com61regressões/tipos/build, diff check limpo).

Não se afirma publicação de vídeo sem fonte. A migração não ativa cron novo; usa tick existente com worker habilitado. A espera atual será cadastrada pontualmente apenas se vídeo ainda sem saída. Consentimento para release e execução automática consta no pedido desta task.

## Revisão adicional do dispatcher
Teste real mostrou agenda vencida sem wake do drain: SQL existente só acordava por etapas pagas ou vídeos novos. Segunda migration20261015231500 adiciona waits vencidos ao dispatcher existente. Mesmas oito perspectivas: Pass, escopo sem cron/permissão nova, só wake por agenda vencida sem captura/artigo. PostgreSQL17isolado passou teste completo do watchdog anterior e4assertions adicionais: due acorda, future/capture/artigo não. Rollback dispatcher à migration20261013180000. Migration aplicada atomicamente comparando definição esperada e registrada. Nenhum segredo lido/exibido. Agora due será atendido no próximo tick de minuto, e pending reagenda1h; evita limitar vários vídeos a1tentativa total/hora.

## Release e evidência produtiva
Migration20261015230000 e20261015231500 aplicadas/registradas; índice e campos confirmados. Worker enabled=true, cron hourly12* ativo e drain de minuto ativo, sem criar cron novo. editorial-admin ae98936 implantado, deno check aprovado; SHA566aa28bcc8e6eac82df9d91ef79f2de41950e2fc50e8db1b1f643dfd0f3b55d. Painel confirmou “Seu site foi atualizado”. Main integrada ao types.ts gerado por Lovable; validate final exit0.
Backfill autorizado somente vídeo70IK3e8TtUc sem capture/artigo, com IDs v29_pro,v20_ultra,v9_max_s, primeira agenda00:02:17UTC. Drain executou automaticamente00:06:03UTC (21:06BRT15/10), respondeu portuguese_captions_pending e reagendou01:06:03UTC (22:06BRT). Consulta audit desde inclusão na agenda retornou somente editorial_generation_failed/código pending; nenhum editorial_alert_sent/failed. IDs preservados, capture=false, article_id=null. Prova de execução automática e ausência de email/IA nesta espera. Quando captura servir, gerador existente persiste fonte e segue checkpoints de artigo/capa/QA/publicação. Não afirmar que artigo já foi criado; fonte ainda pendente.
