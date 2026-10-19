# Newsletter única Geral — 19/10/2026

Mudança estrutural: integração e formação de campanhas Supabase. Pedido: uma edição Geral para todos os inscritos elegíveis, sem divisão por interesse.

## Revisão prévia e decisão

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Unificar distribuição; preservar histórico real. Prosseguir com Geral única. |
| Arquitetura | Worker e RPC devem concordar; impedir duplicação por dia e concorrência. Prosseguir com bloqueio transacional. |
| IA | Conteúdo editorial permanece; apenas renderização Geral. Prosseguir sem alterar geração. |
| Segurança | Manter consentimento v2, supressão e descadastro. Prosseguir sem reescrever assinaturas. |
| UX | Próximas edições únicas; não ocultar dois disparos históricos. Prosseguir preservando histórico. |
| CX | Recuperação de envio incerto não pode reenviar. Prosseguir mantendo reconciliação e bloqueando novos envios legados. |
| Growth | Todos elegíveis recebem versão Geral; manter limites e cooldown. Prosseguir. |
| PMO/QA | Testar formação, filtros, idempotência e regressão; publicar apenas após gates. Prosseguir condicionado aos testes. |

Decisão consolidada: uma campanha Geral por dia, todos os interesses elegíveis. Não reenviar #4. Trade-off: perde-se ordenação por interesse, conforme decisão expressa do usuário. Histórico mantém registros verdadeiros. Sem alteração em RLS, DNS ou consentimento.

## Release e rollback

Autorização na mesma conversa: implementar e publicar; direcionamento final para versão Geral única. Publicar worker e substituir RPC, sem disparo de newsletter. Custo externo: publicação e consulta operacional, sem agente pago ou envio. Risco: seleção de audiência; mitigado por testes e preservação dos filtros. Rollback: reverter commit e restaurar função da migration 20261018170000. Nenhum dado histórico será alterado.

## Validação e revisão posterior

37 testes direcionados passaram; `pnpm validate`: typecheck, 64 testes e build passaram. PostgreSQL 17 local executou a migration e `tests/sql/newsletter-general-only.sql`: audiência de todos os interesses, filtros de consentimento/entrega/supressão, idempotência, bloqueio de Radar, preservação da edição histórica e cooldown global passaram.

Revisão posterior: Produto Pass (Geral única); Arquitetura Pass (worker/RPC e bloqueio transacional); IA Pass (conteúdo preservado); Segurança Pass (filtros preservados); UX Pass (histórico fiel); CX Pass (sem reenvio); Growth Pass (elegíveis reunidos); PMO/QA Pass (gates completos). Sem conflito material pendente. Produção não tem campanhas pendentes; os dois registros de 19/10 já estão enviados.

Publicação concluída: commit `1965857`, migration `20261019160000` registrada e RPC conferida em produção (audiência unificada, bloqueio transacional, dois registros históricos e zero pendências). Deploy `3d860bb9-eb7a-45ef-a367-6a9cce8bd2ab` confirmado pelo cabeçalho HTTP `x-deployment-id` do domínio público às 15:46 de São Paulo; painel HTTP 200, API administrativa anônima 401. Nenhum e-mail disparado. Assets de cliente permaneceram estáveis, pois a alteração é no servidor.
