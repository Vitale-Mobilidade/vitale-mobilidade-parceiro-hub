# Grupo de ofertas — revisão e operação

Classificação: estrutural (Supabase, controle de redirecionamento e integração WhatsApp).
Objetivo: configurar o convite público de `/grupodeofertas` pelo Admin, com destino inicial informado pelo usuário.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Autonomia para trocar convite | Ampliar escopo | Apenas um convite | Prosseguir |
| CTO | Leitura SSR e RPC transacional | Falha de banco ou cache | Migration antes do app | Prosseguir com fallback seguro e 302 |
| IA | CTA existente do SDR usa mesma entrada | Convite divergente | Constante compartilhada | Prosseguir; não altera prompts |
| Segurança | Escrita administrativa | Open redirect e acesso indevido | Validação SQL e role ativa | Prosseguir com whitelist e auditoria |
| UX/UI | Campo, destino atual e feedback | Salvar sem perceber efeito | Estados de erro/sucesso | Prosseguir |
| CX | Troca sem edição de código | Sobrescrita concorrente | Revisão otimista | Prosseguir |
| Growth | Uma entrada para convites | Cache permanente do destino | 302 temporário | Prosseguir; manter noindex |
| PMO/QA | Release app + migration | Ordem incorreta | Testes e validate | Prosseguir localmente; publicação depende de autorização |

## Decisão consolidada

Escopo: configuração singleton pública (URL, revisão), RPC exclusiva de admin ativo, auditoria com antes/depois, interface no admin e redirecionamento SSR. Todos os CTAs apontam à entrada `/grupodeofertas` para acompanhar futuras mudanças.
Critérios: novo convite inicial, validação estrita HTTPS/chat.whatsapp.com/token de 22 caracteres com mode=gi_t opcional, leitura sem secrets, sem escrita pública, proteção contra conflito, feedback e teste do contrato.
Trade-off: CTAs passam pela entrada interna para seguir o convite configurado. São convites comunitários, não links afiliados. Falha de leitura usa o novo convite padrão; admin não apresenta fallback como configuração salva.
Fora de escopo: disparos de WhatsApp, alterações em afiliados, deploy ou migrations produtivas.
Rollback: restaurar URL anterior pelo admin (ou reverter app); preservar tabela e histórico. Antes da migration, guardar o convite atual. Não remover tabela durante rollback.
Dependências: aplicar migration aprovada antes de publicar o app; sem custo externo na preparação local.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Convite solicitado e edição em `/admin/grupo-de-ofertas` no menu Sistema |
| CTO | Pass | GET/HEAD 302 antes do SSR; navegação cliente também redireciona; no-store, timeout e fallback seguro |
| IA | Pass | CTA SDR usa entrada compartilhada; prompts e processamento preservados |
| Segurança | Pass | Ensaio PostgreSQL local (PGlite): RLS, grants, admin ativo, rejeição de content/operation/inativo/sem vínculo, URL estrita e auditoria atômica |
| UX/UI | Pass | Testes de renderização: campo rotulado, destino salvo, mensagens, estados de erro e formulário restrito |
| CX | Pass | Revisão otimista impede sobrescrita; Recarregar permite recuperar conflito |
| Growth | Pass | Convite centralizado, 302 sem cache e noindex; afiliados preservados |
| PMO/QA | Pass | 19 testes direcionados, 61 regressões, typecheck, build e `pnpm validate`; lint dos novos arquivos e diff check |

### Fechamento e condição de release

Preparação local concluída. Produção ainda não alterada. Não foram consumidos créditos Lovable.
A migration foi ensaiada em PostgreSQL embarcado com tabelas de autorização e auditoria mínimas; o banco produtivo e a sessão real admin precisam de smoke após aplicação autorizada.
As migrations Supabase e Drizzle contêm o mesmo SQL: executar apenas pelo mecanismo usado no projeto, nunca ambas manualmente.
Ensaio reproduzível: instalar `@electric-sql/pglite` em diretório temporário e executar `node scripts/check-offers-group-sql.mjs /caminho/para/pglite/dist/index.js`.
Ordem de release: registrar convite anterior, aplicar migration, integrar branch, publicar app no Lovable, conferir 302/Location e salvar/reabrir configuração com conta admin.
Risco residual: indisponibilidade do banco usa o convite padrão solicitado nesta task; se esse convite for revogado no futuro, publicar novo fallback. Não há cache do destino nesta implementação.
Rollback: trocar convite no admin; se houver falha no app, reverter commit e republicar versão anterior, mantendo tabela e auditoria.
