# Ensaio sintético de newsletter

Somente PostgreSQL17 descartável, sem listener TCP, sem secrets e sem dados reais. **Nunca executar stubs/assertions em Supabase produtivo.**

Em cluster de teste novo: criar database vazio; aplicar stubs.sql, migration histórica 20260925200500_newsletter_interest.sql, migration nova 20261007195000_newsletter_resend.sql e assertions.sql com psql -v ON_ERROR_STOP=1. Stubs criam roles globais de teste; se o cluster já tem essas roles, omitir apenas a primeira linha de stubs.sql. cron e net são mocks: não enviam HTTP.

Casos: estado OFF e cron OFF por migration; V2 ativo e V1 excluído; lock global; janela segunda/sexta; coorte congelada e consentimento revisado; 72h de respiro; fingerprint idêntico excluído; webhook replay/optout; pause cron; transação rollback e bloqueio anon. Não comprova infraestrutura produtiva/gateway/webhook/entrega.
