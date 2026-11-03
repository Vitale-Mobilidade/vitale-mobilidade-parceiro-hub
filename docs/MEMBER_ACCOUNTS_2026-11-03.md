# Contas de leitores — primeira entrega

> **Registro histórico substituído:** o contrato vigente é o [cadastro único da comunidade com newsletter incluída](COMMUNITY_MEMBERSHIP_2026-11-03.md). A separação de newsletter e confirmação própria descritas abaixo não serão ativadas. Para release, consulte [MEMBER_RELEASE_2026-11-03.md](MEMBER_RELEASE_2026-11-03.md).

> Continuação autorizada: a indicação da newsletter já foi implementada localmente após esta primeira entrega. O estado e os testes desse segundo corte estão em [NEWSLETTER_REFERRALS_2026-11-03.md](NEWSLETTER_REFERRALS_2026-11-03.md). As listas de backlog abaixo descrevem o escopo original deste marco.

Estado: implementação local na branch `codex/member-accounts-2026-11-03`, base operacional `540fc1d`. Não publicado; migration não aplicada ao Supabase integrado ao Lovable.

## Classificação e revisão prévia

Mudança **estrutural**: Supabase Auth, perfis privados, comentários e permissões. Pedido atual prioriza cadastro, login, perfil próprio e comentários. Newsletter, Radar, Quiz, catálogo e writers editoriais existentes permanecem operacionais e preservados.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Conta gratuita do leitor e participação nos artigos | Antecipar marketplace/gamificação | Identidade Auth estável | Prosseguir com escopo reduzido à primeira fase |
| CTO e Arquitetura | Reusar Auth atual; perfis e RPCs aditivos | Duplicar autenticação ou afetar SSR | Artigo editorial por UUID; mesmo banco | Condicionado a permissões isoladas e artigo SSR preservado |
| IA e Agent Engineering | Comentários são conteúdo não confiável | UGC virar grounding/instrução editorial | Nenhum writer deve consumir comentários | Prosseguir; não adicionar comentários aos agentes ou newsletter |
| Segurança | Dados privados e escrita por usuário | Autoelevação, spam, e-mail público, XSS | Confirmação de e-mail, grants/RLS, verificação de ownership | Condicionado a RPCs restritas, moderação, limites e testes de banco |
| UX/UI | Entrar, cadastrar, recuperar senha e editar nome público | Perder contexto do artigo; estados ambíguos | Retorno somente a artigos válidos; mensagens acessíveis | Prosseguir com formulários rotulados e estados explícitos |
| CX e Operação | Fila de moderação por administrador | Comentários sem operação e recuperação de conta | Admin existente e canal de suporte da privacidade | Condicionado à fila, rejeição, retirada e bloqueio de leitor |
| Growth e CRO | Engajamento sem bloquear leitura | Cadastro obrigatório para conteúdo; consentimento implícito | Artigos públicos, CTA afiliado direto | Prosseguir; sem inscrever automaticamente na newsletter |
| PMO e QA | Entrega incremental isolada | Confundir código local com funcionalidade publicada | Testes direcionados, pnpm validate, configuração Auth | GO condicionado; release separado com autorização |

### Conflitos e decisão consolidada

- Growth favorece publicação imediata de comentários; Segurança/CX exigem proteção contra spam. Decisão: comentários entram pendentes e só aparecem publicamente após aprovação de administrador. Leitor vê seu próprio estado e pode remover a própria contribuição.
- Produto deseja preparar ranking e vendas; Arquitetura recomenda evitar infraestrutura especulativa. Decisão: Auth UUID é a identidade reutilizável; não criar pagamentos, pontuação, cupons, anúncios ou novas entidades Bike nesta fase.
- Reusar a sessão Auth atual reduz duplicação; ser autenticado não concede acesso administrativo. Não escrever em `editorial_admin_memberships`, não usar metadata como papel.
- Escopo: `/conta` com cadastro nome/e-mail/senha, confirmação, login/logout, recuperação e alteração de senha; perfil próprio com nome de exibição; comentários em todos os artigos publicados; fila `/admin/comentarios` exclusiva de admin. Perfil não é diretório público; apenas nome e comentário aprovado ficam públicos.
- Dependências: schema aditivo local; confirmação de e-mail e SMTP do projeto integrado, allowlist de retorno `/conta`, testes locais; backup/ensaio e autorização antes de schema/RLS/Auth em produção.
- Aceite: anônimo lê artigo sem login; confirmado cria perfil e comenta apenas em artigo publicado; outro leitor não altera dados alheios; não admin não modera; pending/rejected/removed não vazam; e-mail/UUID do autor não são expostos; HTML de comentário vira texto; limite de escrita concorrente; navegação móvel e recuperação de senha; `pnpm validate`.
- Rollback: desabilitar configuração da comunidade no banco e flag do frontend; reverter apenas este delta de frontend. Preservar tabelas e dados para diagnóstico; não executar DROP/reset nem reverter migrations antigas.

## Roadmap solicitado

1. **Agora:** conta gratuita, confirmação, acesso, perfil próprio e comentários moderados.
2. **Depois:** curtir/descurtir artigos, uma reação por usuário e artigo, sem pontos retroativos inventados.
3. **Depois:** indicação da newsletter por link pessoal, atribuição verificável, adesão confirmada e independente, antifraude e ranking. Reutilizar inscrição/writer existentes; jamais importar contatos ou enviar convites sem ação autorizada.
4. **Depois:** “Venda sua bike aqui”, solicitação de anúncio por **R$ 150**, pagamento confirmado no servidor, autorização de publicação, revisão de anúncio e condições comerciais a definir (prazo, reembolso e quantidade). Anúncios particulares não alteram o catálogo oficial nem o Radar automaticamente.
5. **Futuro:** ações e sorteios, com regras próprias antes de qualquer promessa, cobrança ou campanha.

As fases 2–5 são backlog, não capacidades entregues nesta branch. O pedido atual atualiza a prioridade de engajamento sem reabrir integrações que já funcionam.

## Contrato implementado

- Reutiliza a sessão existente de Supabase Auth. Cadastro salva somente o nome em metadata; metadata nunca define papéis. O perfil é concluído depois da confirmação, com ciência do aviso de privacidade registrada no banco.
- Tabelas `member_profiles`, `member_article_comments`, `member_moderation_audit` e `member_community_settings` são aditivas, com RLS habilitada e sem grants diretos para anon/authenticated. A RPC `member_community` fixa `search_path=''`, valida cada ação e deriva o autor exclusivamente de `auth.uid()`.
- Leitura pública expõe apenas comentário aprovado, nome público revisado no envio, data e identidade do comentário. Não expõe UUID do autor, e-mail, perfil, papel ou metadados de moderação. Trocar o nome no perfil vale para novas contribuições; não substitui nomes já aprovados sem revisão.
- Artigo precisa estar publicado para leitura/escrita de comentários. Um leitor vê também seus próprios pendentes/rejeitados. Remover apaga o texto, deixa um tombstone e mantém os contadores de abuso. Até 20 envios por dia civil de São Paulo, separados por 60 segundos; lock de perfil impede corrida de envios simultâneos.
- Somente membership editorial ativa com `role='admin'` modera, retira contribuições ou suspende/restaura leitores. Suspensão oculta os aprovados e bloqueia escrita, preservando a remoção pelo autor. As ações administrativas ficam auditadas, sem corpo do comentário no log.
- Artigo, oferta e metadata continuam SSR; comentários são uma interação carregada separadamente, sem alimentar compilador, newsletter ou agentes. A área de conta é `noindex`, `private, no-store`, `Referrer-Policy: no-referrer`, sem captura de atribuição, popup ou assistente. O conteúdo de comentários/formulários fica fora do heatmap.
- Sem nova dependência; dependências locais reutilizadas do checkout operacional existente. Nenhum `.env` foi adicionado ou modificado.

## Validação local e evidências

- Lint dos novos módulos, rotas, hook e teste: **Pass**.
- Typecheck: **Pass**.
- Testes direcionados: **19/19** (limites de entrada, retorno seguro, mensagens sem diagnóstico sensível, flag desligada sem chamada ao backend; regressões de acesso admin e artigo independente).
- `python3 tests/member-community-db.py`: **Pass**. Cria PostgreSQL 17 descartável com dados sintéticos, sem TCP, aplica somente a migration nova e exercita permissões reais como anon/authenticated, e-mail confirmado, anonimato, isolamento, moderação, suspensão, nome revisado, remoção, paginação e contagem diária. Duas conexões concorrentes provam que apenas um envio é aceito. Nenhuma fixture veio de produção.
- Smoke UI em Chrome, 390×844 e 1024×800, com API totalmente simulada: **Pass**. Cadastro por teclado, falha/sucesso de login, ciência de privacidade, perfil, recuperação sem sessão e callback simulado de recuperação, nova senha, logout, comentários pendentes/remoção, HTML exibido como texto, fila administrativa, kill switch, ausência de overflow e de chamadas externas.
- `pnpm validate` com a feature ligada e URL/chave falsas locais: **Pass**, incluindo os **66 testes** do gate operacional e build cliente/SSR. Avisos existentes do framework sobre `inputValidator`/code splitting não são falhas novas.
- `git diff --check`: **Pass**.
- Imagens inspecionadas: [conta móvel](../artifacts/member-accounts/account-mobile.png), [conta desktop](../artifacts/member-accounts/account-desktop.png), [comentários móvel](../artifacts/member-accounts/comments-mobile.png). Todos os nomes/e-mails são fictícios.

### Como reproduzir

```sh
python3 tests/member-community-db.py
pnpm exec vitest run --config vitest.config.ts src/lib/member-community.test.ts src/lib/bike-admin-access.test.ts src/lib/article-independent.test.tsx
VITE_MEMBER_ACCOUNTS_ENABLED=true VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=local-test-key pnpm validate
```

O runner de banco aceita `PG_BIN` apontando para binários de PostgreSQL locais. Para o smoke UI, iniciar `pnpm dev --host 127.0.0.1 --port 4318` com as mesmas três variáveis falsas e executar `node tests/member-ui.mjs`, com Chrome e Playwright disponíveis. `PLAYWRIGHT_MODULE` pode apontar para a instalação já disponível do Playwright; não é dependência de produção. O harness em `tests/` é somente de desenvolvimento e não integra as rotas nem o bundle publicado. Nenhum teste dispara e-mail, newsletter, modelo pago ou API real.

## Governança — revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Conta gratuita, perfil e comentários entregues localmente; monetização/indicações/curtidas mantidas no backlog pedido |
| CTO e Arquitetura | Pass | Auth existente, delta aditivo, build SSR e contrato RPC testados; nenhum writer operacional duplicado |
| IA e Agent Engineering | Pass | UGC não entra em prompts, grounding, agentes ou pipeline editorial; nenhum modelo chamado |
| Segurança | Pass | Grants/RLS e checks por ação exercitados em PostgreSQL real local; concorrência/isolamento, e-mail confirmado, projeção pública mínima e texto escapado verificados |
| UX/UI | Pass | Fluxos com erro/loading/sucesso, formulários rotulados, teclado e layout móvel/desktop exercitados; screenshots inspecionadas |
| CX e Operação | Pass | Fila, aprovar/rejeitar/retirar e suspender/restaurar preparados; suporte e exclusão pelo canal já publicado; operação comercial preservada |
| Growth e CRO | Pass | Leitura aberta, CTA afiliado inalterado, newsletter independente e ausência de tracking na conta; não se promete ganho de conversão |
| PMO e QA | Pass | 19 testes direcionados, gate de 66, banco sintético, smoke UI e build; escopo e estado local explícitos |

### Fechamento e condição de release

**GO para revisão do código local. GO condicionado para ativação futura.** Esta conclusão não atesta SMTP, configuração Auth nem entrega de e-mail em produção: esses itens não foram alterados ou exercitados. Nenhum push, merge, deploy, publicação Lovable, migration/RLS de produção, cadastro real ou custo externo foi executado. A feature está desligada por padrão no frontend e no registro inicial do banco.

Antes de ativar, após autorização específica:

1. Identificar HEAD corrente e publicação vigente; reconciliar eventual diff desde `540fc1d`.
2. Conferir no Supabase integrado ao mesmo projeto Lovable se cadastro por e-mail está permitido, confirmação de e-mail obrigatória, política de senhas adequada, remetente/SMTP e limites de Auth prontos para cadastro público. Configurações de proteção contra abuso devem considerar o volume real; os limites de comentários não limitam criação de contas no provedor Auth.
3. Conferir se há template Auth customizado que force `/admin` ou ignore `emailRedirectTo`; preparar retorno para `/conta`, mantendo recuperação administrativa existente. Allowlist com o domínio exato e o caminho de conta; nada de wildcard para domínio externo.
4. Obter backup atual recuperável e ensaio proporcional de schema/Auth/RLS antes de aplicar a única migration nova. Não reaplicar histórico.
5. Aplicar a migration autorizada, inicialmente desabilitada, atualizar tipos gerados do projeto se necessário e configurar `VITE_MEMBER_ACCOUNTS_ENABLED=true` apenas no ambiente autorizado.
6. Com ambiente/configuração autorizados, ativar `member_community_settings.enabled=true`, validar cadastro e recuperação com endereço de teste controlado, moderação/admin e artigo anônimo. Se houver preview, incluir somente a URL exata autorizada nos retornos Auth. Não usar dados/clientes reais.
7. Publicar somente após aprovação específica para publicação, com rollback de frontend identificado. Confirmar ausência de regressão administrativa e de e-mails duplicados no domínio.

Rollback imediato, também sujeito à autorização de alteração do ambiente: `UPDATE public.member_community_settings SET enabled=false WHERE singleton;` bloqueia a comunidade no servidor; desligar a flag de frontend e voltar ao commit anterior remove entradas e componentes. Preservar as tabelas. O rollback de frontend não apaga novas contas de Auth; exclusão de dados exige procedimento próprio e autorização. Falha de SMTP deve manter cadastro/confirmação suspensos até correção; não desabilitar confirmação como atalho.

### Proposta de ativação para aprovação futura

```text
AÇÃO: conferir configuração/backup do projeto Lovable atual, aplicar a migration aditiva de contas e configurar/validar Auth; publicar e ativar somente no escopo aprovado.
MOTIVO: tornar cadastro, perfil e comentários disponíveis aos leitores no site.
IMPACTO: Supabase Auth, quatro tabelas novas, uma RPC, /conta, /admin/comentarios e seção de comentários dos artigos. Sem alterar Radar, Quiz, newsletter, preços ou afiliados.
RISCO: médio; cadastro público, dados pessoais, SMTP e moderação contínua.
CUSTO EXTERNO: nenhum consumido na preparação. A ativação usará a quota existente de Auth/SMTP/banco/hosting; verificar eventual custo adicional antes de contratar ou consumir créditos relevantes. Lovable não é necessário para editar código.
TESTES JÁ FEITOS: lint direcionado, 19 testes direcionados, permissões/concorrência em PostgreSQL descartável, smoke UI com mocks, pnpm validate (66 testes e build SSR).
ROLLBACK: desativar comunidade no banco, desligar flag e reverter frontend; preservar contas e tabelas para tratamento separado.
PERGUNTA: autorizar especificamente configuração/migration e, separadamente, a publicação após validação do ambiente.
```

Essa separação decorre de [EXECUTION_GUARDRAILS.md](EXECUTION_GUARDRAILS.md), que exige autorização explícita antes de “aplicar migration em produção” e “publicar em produção”; e do gate de recuperação de [SQUAD_GOVERNANCE.md](SQUAD_GOVERNANCE.md)/[GATE0_BASELINE.md](GATE0_BASELINE.md). Não há autorização de produção nesta conversa.
