# Ciclo horário unificado — 07/10/2026

Diagnóstico: bikes eram sincronizadas em HH:07, enquanto descoberta editorial ocorria apenas em HH:12. Às 17:09 o vídeo estava na Sheets mas ainda não importado. Cron às 17:12 importou gXA5yTUx4Vw e iniciou geração sem ação manual.

Classificação estrutural: integração Sheets/Supabase/IA. Revisão prévia:

| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Cumprir ciclo único solicitado; geração e publicação seguem assíncronas. Prosseguir. |
| CTO | Trigger após sucesso confirmado do writer atual; pg_net só despacha após commit. Preservar fallback horário. |
| IA | Mesmo worker assinado, transcrição, prompt e QA; sem geração manual ou mudança de modelos. |
| Segurança | Função definer sem permissão pública; sem leitura de segredos pelo cliente. |
| UX | Último sucesso das bikes passa a iniciar descoberta editorial. Não prometer publicação instantânea. |
| CX | Sem botão; trigger não dispara em início, falha ou tentativa ignorada. Fallback HH:12 preservado. |
| Growth | Mesmos controles de duplicidade/publicação; SEO e afiliados intactos. |
| PMO | Teste PostgreSQL isolado: sucesso aciona, falha/início/mesmo timestamp não acionam; erro de dispatch preserva bikes. |

Conflito: falha editorial não deve reverter catálogo comercial. Decisão: exception isolada no trigger; warning e fallback HH:12. Escopo: ligação de sucesso em bike_catalog_sync_state a dispatch_youtube_editorial_tick('youtube-hourly'). Sem alteração de artigos, cron de bikes, RLS ou botão. Rollback: remover trigger e função; fallback HH:12 continua ativo. Aceite: trigger ativo com testes de estados, cron preservado; observar artigo atual pelo cron existente, sem sync/dispatch manual.

Revisão posterior local: Produto Pass (mesmo ciclo); CTO Pass (PostgreSQL real isolado, despacho após commit); IA Pass (worker intacto); Segurança Pass (definer/revoke); UX Pass (sem prometer publicação imediata); CX Pass (falhas não acionam, catálogo preservado); Growth Pass (nenhuma alteração SEO/links); PMO Pass (asserts SQL e pnpm validate aprovados). Validação do próximo ciclo produtivo HH:07 ainda pendente, sem disparo artificial.

## Implantação e evidências
- Migration aplicada diretamente no Supabase integrado, sem disparar sync, dispatch ou publicação. Trigger habilitado; anon sem execute; três jobs existentes continuam ativos.
- gXA5yTUx4Vw foi descoberto pelo cron HH:12 anterior à implantação desta ligação, gerado e publicado sozinho às 17:16:09 BRT. QA pass=true, issues=[], transcrição8009 caracteres, diversidade94. Estado done. Rascunho às17:13 era checkpoint intermediário de texto/capa/QA, sem aprovação humana.
- URL pública: https://vitalemobilidade.com/conteudos/zurbe-s20-pro-ou-v9-max-bateria-banco-e-bagageiros-mudam-a-escolha
- Próximo ciclo HH:07 ainda não ocorreu no encerramento; não declarado como exercitado em produção. Trigger real verificado e comportamento testado em PostgreSQL local isolado. Fallback HH:12 segue disponível.
- Mudanças paralelas do usuário em main foram integradas sem alterações. Validação final pnpm validate após merge.
