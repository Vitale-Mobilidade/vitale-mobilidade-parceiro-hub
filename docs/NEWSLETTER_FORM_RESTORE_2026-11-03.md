# Restauração integral da captação da newsletter

O responsável apontou que a captação foi substituída indevidamente pelo cadastro da comunidade em todos os lugares. Correção autorizada: restaurar exatamente NewsletterSignup.tsx e a página /newsletter do baseline operacional 540fc1d, sem CTA, conta, convite ou validação de comunidade nessas áreas. Um único componente restaura Home, rodapés, artigos e popup. A comunidade permanece em /conta, com validação própria para interações.

## Revisão antes da correção — relevante

| Perspectiva | Impacto e risco | Recomendação |
| --- | --- | --- |
| Produto | Recuperar newsletter simples como produto independente; remover associação indevida a conta | Restaurar baseline exato |
| Arquitetura | Componente compartilhado e página existentes; writer/endpoint atuais permanecem | Restaurar sem mexer backend |
| IA | Sem alteração em agentes, cron ou editorial | N/A justificado |
| Segurança | Consentimento anterior da newsletter preservado, sem criar Auth/telefone | Prosseguir |
| UX | Campos nome/email/aceite em todas as superfícies; nenhum botão de cadastro completo | Prosseguir |
| CX | Restabelecer operação conhecida | Prosseguir |
| Growth | Recuperar captação e copy originais; canonical/metadados originais | Prosseguir |
| QA | Verificar identidade dos dois arquivos com baseline, smoke sem Auth e validate | GO para correção dirigida |

Decisão: somente restauração exata dos dois arquivos e adaptação do smoke para o contrato original. Sem DB, migrations, e-mails ou WhatsApp. Rollback seguro deste reparo é manter o formulário original; não republicar a substituição por conta. Newsletter não precisa de conta, confirmação, celular ou verificação de comunidade. A adesão da comunidade pode incluir newsletter por aceite, mas não substitui os formulários existentes.


## Revisão posterior local

Produto, Arquitetura, Segurança, UX, CX, Growth e QA: **Pass**. IA: **N/A**, sem alteração em geração/campanha. `NewsletterSignup.tsx` e `routes/newsletter.tsx` comparados byte a byte com `git show 540fc1d:...`: idênticos. Smoke Chrome: nome/email/consentimento registra newsletter sem signup/Auth/adesão. Formulário sem texto/link de comunidade, canonical original e moderação/gate de identidade continuam funcionando. `pnpm validate` passou (66 regressões, types e SSR build). Sem alteração de banco/backend neste reparo. Publicação da restauração em andamento.
