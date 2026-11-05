# Login e cadastro com Google — 05/11/2026

Classificação estrutural: identidade, Supabase e retorno de autenticação. Pedido explícito: integrar Google para facilitar acesso e cadastro. Projeto atual integrado permanece a única base de contas.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e decisão |
|---|---|
| Produto | Acrescentar Google em entrar/cadastrar; preservar conta existente, newsletter e cadastro por senha. Novo membro confirma adesão, nome/celular; não exigir senha nem novo OTP de e-mail Google verificado. Prosseguir. |
| Arquitetura | Provedor Google está desativado. Backend integrado oferece OAuth gerenciado; adaptador isolado e SDK oficial, contexto de retorno permitido/temporário. Não trocar o client global nem quebrar recuperação. Prosseguir condicionado a configuração e prova de fluxo. |
| IA | N/A: nenhum agente ou conteúdo gerado afetado. |
| Segurança | Não confiar em user_metadata para comprovar e-mail. Usar identidade Google registrada pelo Auth, e-mail confirmado correspondente e claims verificados, mantendo telefone, suspensão, propriedade e pagamento. Nunca conceder admin pelo provedor/e-mail. Prosseguir condicionado a testes negativos. |
| UX | Botão Google no login/cadastro, erros/cancelamento claros, nome sugerido editável, retorno à origem. Novo membro conclui apenas dados/aceites faltantes; existente volta sem editar perfil. Prosseguir. |
| CX | Mesma base Supabase e vínculo de identidade por provedor verificado; não criar contas técnicas, redefinir senhas ou manipular sessões reais. Não reativar newsletter cancelada de membro existente. Prosseguir. |
| Growth | Convite e destino preservados com validação de URL. Newsletter simples permanece independente. Escopos básicos de identidade, sem Drive/Gmail/agenda. Prosseguir. |
| QA | Testar botão, cancelamento, retorno, Google novo/existente, consentimento, telefone, prova de e-mail no servidor e regressão senha/recovery. Validar provedor real sem escolher conta pessoal/aceitar permissões pelo usuário. Prosseguir condicionado. |

Decisão: preparar localmente adaptador oficial para Google gerenciado no backend integrado, sem credenciais no frontend; preservar Auth existente e fluxo de senha. Registro novo termina adesão/WhatsApp e volta ao destino. E-mail Google só recebe prova se Auth.identities (privado) confirmar o endereço atual. Sem alteração de privilégios administrativos, preço, billing ou RLS públicos. Não marcar simples auto-confirm de Auth como posse de e-mail.

Dependências: ativação do provedor e configuração de redirecionamento no Lovable/Supabase integrado, SDK compatível com domínio próprio e tela Google real. Usar configuração por UI onde o conector não oferece Auth. Se houver autorização/credenciais externas exigidas pela plataforma, deixar o resultado concreto para aprovação; nenhum segredo será pedido no chat.

Rollback: desabilitar apenas entrada Google e botão; preservar contas/identidades e senhas existentes, provas válidas e sessões. Reverter adaptador/UI caso necessário. Custo: desenvolvimento/testes locais; configuração e deploy no hosting existente, sem mensagens ou criação de conta reais de homologação, sem agente Lovable para editar código.

Fontes primárias: https://docs.lovable.dev/features/google-auth ; https://supabase.com/docs/guides/auth/social-sign-in/auth-google ; pacote oficial @lovable.dev/cloud-auth-js 1.2.3 (tipos e fonte inspecionados).

## Revisão posterior

| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Botão no login/cadastro; adesão nova explícita, sem senha; membro existente retorna à origem. Nenhuma mudança em cobrança/anúncios. |
| Arquitetura | Pass | Adaptador isolado com SDK oficial 1.2.3, callback privado/no-store e sem referrer, retorno sanitizado; build SSR e tipos passam. |
| IA | N/A | Nenhum fluxo de IA afetado. |
| Segurança | Pass | PostgreSQL descarta metadata forjada, identidade Google sem e-mail verificado, e-mail trocado e suspensão; trigger impede união com senha sem prova de posse. Sem acesso Admin ou escrita cliente em Auth.identities. |
| UX | Pass | Mobile 390px; cancelamento com alternativa por e-mail; nome sugerido editável com contador; e-mail Google dispensa novo OTP; WhatsApp continua obrigatório. Evidências locais em outputs/vitale-google-login-2026-11-05. |
| CX | Pass | Senha, recuperação, perfil e OTP anteriores passam no smoke; membro Google existente não recebe novo código nem reativa newsletter cancelada. |
| Growth | Pass | Destino com filtros/hash e convite persistem, adesão newsletter só após aceite; formulário simples de newsletter preservado. |
| QA | Pass | Lint direcionado, typecheck, 20 testes unitários, contratos PostgreSQL incluindo negativos/concorrência, smoke local de senha/recuperação/newsletter e Google, pnpm validate (66 testes + build SSR) passam. OAuth real depende da ativação externa. |

Decisão de código: apto para PR. Condição de produção: aplicar a migration com guard antes de ativar Google, confirmar configuração gerenciada no projeto integrado, então publicar frontend e validar redirecionamento real sem escolher uma conta pessoal pelo usuário. Nenhuma migration, merge, ativação do provedor ou publicação executada nesta tarefa até esta revisão. A prova de login completo com Google real ainda não existe e não será confundida com o smoke simulado.

Testes: `python3 tests/member-community-db.py --google`; `pnpm test -- src/lib/member-google-context.test.ts src/lib/member-identity-delivery.test.ts src/lib/member-auth-return.test.ts`; `tests/member-ui.mjs` com Supabase/broker/OTP falsos e tráfego externo bloqueado (fluxo antigo completo e casos Google direcionados); lint dos arquivos alterados; `pnpm validate`.

Custo externo até aqui: somente leituras/configuração inspecionada; sem agente Lovable, e-mail, WhatsApp ou conta real de teste. SDK oficial sem dependências de runtime; pacote e integridade verificados no registry npm.

Risco residual/trade-off: conta com senha ainda não validada precisa validar/recuperar por e-mail antes de associar Google. Não apagar senha nem revogar sessão para esconder essa condição. Provedor desativado em produção até release autorizado.

## Revisão complementar: união automática de identidade

Descoberta concreta: Auth auto-confirm de senha permanece ativo para acesso imediato, enquanto a posse de e-mail é comprovada na camada de identidade da Vitale. A união automática por e-mail de OAuth não pode promover um cadastro pré-criado sem posse, pois a senha anterior poderia continuar conhecida por terceiro. Fonte primária: https://supabase.com/docs/guides/auth/auth-identity-linking e fluxo do servidor em https://github.com/supabase/auth/blob/master/internal/api/external.go .

Segurança/Arquitetura/QA condicionam o release a um trigger restrito em Auth.identities: Google só pode se unir a conta com senha já existente se houver prova Vitale válida para o endereço atual. Cadastro Google novo sem senha continua normal. Conta de senha legítima ainda não validada usa o fluxo existente de senha/recuperação para validar primeiro. Não redefinir senhas, remover identidades nem encerrar sessões reais. UX apresenta o caminho alternativo em caso de falha; Produto aceita essa fricção só para vinculação não validada, preservando acesso direto dos já validados. Retirar esse guard em rollback somente se o provedor Google estiver desativado primeiro.

A leitura do endpoint oficial de atualização de usuário também confirmou que user_metadata é separado de AppData/identidade do provedor: https://github.com/supabase/auth/blob/master/internal/api/user.go .

## Ativação autorizada

O usuário autorizou explicitamente “Sim, ativar e publicar o Google” na mesma conversa. Em 05/11/2026, a migration 20261105160000 foi aplicada transacionalmente no Supabase integrado e registrada; RPC para authenticated, negada a anon; guard de Auth.identities ativo. Não houve escrita em contas reais.

Google habilitado pela UI Users > Settings > Google, opção Managed by Lovable; a confirmação Auth config updated e Google Enabled foram observadas. Não foi necessário criar/guardar Client Secret próprio. O botão Save acionou uma solicitação automática “Add a Google sign-in button to my app”; geração interrompida imediatamente, sem alteração de commit (Lovable e Git main ainda em af4d95e). Eventual consumo dessa execução automática não foi quantificado; nenhum agente foi solicitado para editar código.

Preview Netlify da PR #89 e regras de headers passaram. Vercel falha também no commit-base af4d95e, fora do hosting ativo Lovable; nenhuma mudança/bypass de hosting foi feita. Build local e preview Netlify comprovaram resolução da nova dependência/lockfile.

Próximo gate: merge normal e publicação autorizados, depois redirecionamento real até Google. O usuário escolhe a própria conta; não escolher conta nem consentir em seu nome.
