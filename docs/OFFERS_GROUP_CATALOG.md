# Catálogo de grupos de ofertas

Classificação: estrutural (Supabase e integração WhatsApp).
Objetivo: cadastrar e editar grupos e selecionar destino ativo em `/admin/grupo-de-ofertas`.

## Revisão prévia

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Dois grupos iniciais, adicionar/editar/ativar | Escopo além do solicitado | Não incluir exclusão/rodízio | Prosseguir |
| CTO | Catálogo privado dentro da configuração singleton | Divergência entre ativo e URL pública | RPC transacional; manter contrato público URL/revisão | Prosseguir com compatibilidade da RPC antiga |
| IA | SDR continua usando entrada interna | Convite divergente | Preservar `/grupodeofertas` | Prosseguir |
| Segurança | Apenas admin ativo lê catálogo e escreve | Open redirect, leitura de convites inativos | Grants por coluna, validação e auditoria | Prosseguir com ensaio SQL |
| UX/UI | Lista com badge ativo, botões e formulário | Ativação involuntária ao adicionar | Adicionar não ativa; Editar ativo informa efeito | Prosseguir |
| CX | Troca rápida sem copiar convites | Conflito entre operadores | Revisão compartilhada; recarregar explícito | Prosseguir |
| Growth | Mantém 302/no-store e grupo #1 atual | Mudar destino durante migration | Preservar URL atual mesmo se não corresponder aos seeds | Prosseguir |
| PMO/QA | Migration aditiva, UI e regressão | Rollback para formulário anterior divergir | Adaptar RPC antiga, testes SQL e validate | Prosseguir localmente |

## Decisão consolidada

Escopo: Grupo #1 e Grupo #2, nomes editáveis, novos convites, botão Usar no redirecionamento e edição. Sem exclusão ou automação de distribuição. URL pública é mantida na mesma coluna; catálogo só acessível por RPC admin. Cadastro não altera ativo. Editar ativo atualiza destino imediatamente ao salvar, com aviso. Revision compartilhada impede perda de alterações.
Critérios: seeds exatos, preservar ativo atual, alternar/inserir/editar com autorização e auditoria, nenhuma exposição pública de inativos, SSR preservado e validação.
Trade-off: JSON singleton simplifica operação de uma lista pequena e mantém seleção/URL atômicas; gravação seriada protege concorrência. Não adicionar infraestrutura genérica de configurações.
Rollback: reverter frontend; RPC antiga passa a editar o grupo ativo, mantendo catálogo coerente. Preservar colunas e histórico.
Release: autorização específica para migration/merge/publicação; nenhum custo Lovable na preparação.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Cadastro, edição e seleção atendem escopo; sem exclusão ou rodízio |
| CTO | Pass | Migration aditiva; ensaio confirma URL pública coerente e RPC antiga compatível |
| IA | Pass | Nenhuma alteração no SDR; entrada interna preservada |
| Segurança | Pass | Ensaio PGlite bloqueia anon e perfis não admin; inativos privados; validação, revisão e auditoria |
| UX/UI | Pass | Testes de renderização conferem dois grupos, links, badge e ações nomeadas; formulário com labels e aviso de ativo |
| CX | Pass | Cadastro/inativo não muda destino; edição captura revisão ao abrir; recarregar descarta rascunho e recupera conflitos |
| Growth | Pass | Seeds corretos, migration preserva ativo #1/#2 ou convite desconhecido; contrato SSR intacto |
| PMO/QA | Pass | 29 testes dirigidos, ensaio PostgreSQL local, lint, diff check e pnpm validate (61 regressões/typecheck/build) |

## Operação e release

Preparado localmente; produção continua com editor de convite único até autorização específica desta evolução.
Migration `20261014210000_offers_group_catalog.sql` e espelho Drizzle `0010_offers_group_catalog.sql` não devem ser executados duas vezes. Antes de aplicar, guardar URL/revisão atuais e registrar a execução no histórico ativo do projeto.
Ordem: aplicar migration autorizada, integrar PR, sincronizar preview e publicar Lovable. Conferir 302 público e testar adicionar/editar/ativar com sessão admin real. A conta de teste deve evitar trocar convites produtivos durante smoke sem necessidade.
Ensaio: `node scripts/check-offers-group-catalog-sql.mjs /caminho/para/pglite/dist/index.js`; módulo instalado temporariamente, sem nova dependência do app.
Rollback: reverter frontend; formulário antigo edita o grupo ativo através da RPC compatível. Manter catálogo e auditoria. URL e revisão pública permanecem no contrato original.
Risco residual: formulário autenticado em produção depende de sessão admin para smoke. Não houve publicação, alteração produtiva nem créditos Lovable nesta preparação.

## Publicação autorizada — 14/10/2026

Usuário autorizou migration, merge e publicação da evolução nesta conversa.
- Backup lógico prévio: URL do grupo #1, revisão 1. Migration aplicada em transação e registrada como `20261014210000` em `supabase_migrations.schema_migrations`.
- Banco conferido após migration: grupos #1 e #2 com os convites informados; `active_group_id=1`, URL e revisão preservadas.
- Permissões em produção: anon lê URL, não lê catálogo nem executa manage; authenticated não possui UPDATE direto.
- PR #47 integrada pelo merge `c2f6ee2b5aa9953f987ad863f948c9e366f78957`, sincronizado no Lovable; preview atualizado e publicação solicitada com deployment `c0f2cb82-1bf8-401c-a058-40810d0a8579`.
- Smoke público às 16:17 (America/Sao_Paulo): asset administrativo `/assets/grupo-de-ofertas-PafiyzKO.js` publicado contém Adicionar grupo, Usar no redirecionamento, Salvar grupo e chamada manage_offers_groups.
- HEAD `/grupodeofertas` retorna 302 para grupo #1 com Cache-Control no-store.
- Teste de cliques com sessão admin real permanece pendente: navegador usado não tem sessão autenticada de produção. Contratos, permissões e operações foram ensaiados localmente; não houve troca de destino para testes em produção.
- Nenhum crédito de agente Lovable consumido, nenhuma mensagem ou envio WhatsApp, nenhuma alteração em dados de clientes.

Estado: catálogo publicado, dois grupos cadastrados, grupo #1 ativo, disponibilidade do frontend e redirecionamento verificados.
