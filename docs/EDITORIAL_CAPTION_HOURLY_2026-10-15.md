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
