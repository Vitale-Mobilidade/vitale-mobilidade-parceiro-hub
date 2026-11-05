# Cadastro: aceite único e retorno Google — 05/11/2026

Classificação estrutural por autenticação/integração. Pedido: feedback perceptível ao abrir Google, marca Vitale na autorização, e-mail/celular obrigatórios e apenas um aceite incluindo newsletter.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Cadastro novo tem um aceite para comunidade, newsletter e envio transacional de códigos; contatos obrigatórios nos dois caminhos. Preservar assinatura independente de newsletter e cancelamentos. Prosseguir. |
| Arquitetura | Remover download tardio do SDK no clique; feedback antes da navegação. Preservar broker/Supabase/SSR e retorno sanitizado. Marca Google requer cliente próprio, não troca de base. Prosseguir condicionado à configuração existente. |
| IA | N/A: não há alteração em IA ou conteúdo editorial. |
| Segurança | Um aceite explícito cobre as mesmas finalidades informadas; sem autorização de marketing WhatsApp ou publicação de contato por esse cadastro. E-mail Google verificado permanece só na prova do servidor. Não manipular sessões/credenciais reais nos testes. Prosseguir. |
| UX | Estado de redirecionamento visível com indicador e status acessível; contatos rotulados obrigatórios, e-mail Google preenchido/readonly, um checkbox com finalidade clara. Prosseguir. |
| CX | Senha/recuperação/perfil existentes preservados; novo cadastro incompleto não se confunde com validação concluída. Marca própria depende de Google Cloud, sem pedir segredo no chat. Prosseguir. |
| Growth | Newsletter incluída na comunidade pelo aceite único; formulário simples da newsletter não muda. Remover uma confirmação redundante e clarear espera. Prosseguir. |
| QA | Provar um único aceite, obrigatoriedade/validação de contatos, Google novo/existente, loading acessível e regressão senha/recovery/OTP. Build e validate obrigatórios. Prosseguir condicionado. |

Decisão: corrigir UX/cadastro localmente antes de publicação; inspecionar somente leitura a configuração OAuth para marca própria. Não alterar cadastro real enviado nas capturas nem disparar código de teste. Permissão de anúncios/WhatsApp continua vinculada à prova existente. Não editar tela do Google/Lovable por CSS, simular marca nem criar nova base Auth para resolver branding.

Trade-off: o fluxo gerenciado observado usa marca Lovable no consentimento do Google e uma autorização intermediária. Cliente OAuth próprio permite marca Vitale, mas exige credenciais e branding no Google Cloud e pode depender de verificação do Google. Não prometer que uma alteração no frontend muda isso. Fontes: https://docs.lovable.dev/features/google-auth ; https://supabase.com/docs/guides/auth/social-sign-in/auth-google .

Rollback: reverter somente UX/copy/adaptador; preservar guard, contas, contatos comprovados, preferências e sessões. A configuração Google existente fica ativa até a alternativa própria estar pronta e validada. Custo: testes locais; inspeção da UI sem agente Lovable. Qualquer etapa de credenciais/consentimento é apresentada de forma concreta antes da ação final.

## Revisão posterior

| Perspectiva | Status da correção do cadastro | Evidência |
|---|---|---|
| Produto | Pass | Aceite único inclui newsletter, privacidade e códigos. Cadastro novo e entrada de conta ainda sem adesão exigem contatos; existente não reativa newsletter cancelada. |
| Arquitetura | Pass | SDK carregado com o módulo de conta, sem download tardio no clique. Estado pendente recebe uma pintura antes da navegação. SSR/build/tipos aprovados. |
| IA | N/A | Nenhum fluxo de IA alterado. |
| Segurança | Pass | Prova Google no servidor e guard anteriores preservados; aceite explícito único informa mesmas finalidades. Sem alterações em Auth/RLS/banco/contas reais. |
| UX | Pass | Contador/nome e contatos obrigatórios, e-mail da conta preenchido, um checkbox; status acessível e indicador visível antes do broker. Teste observa DOM antes da navegação. |
| CX | Pass | Smoke de senha, recuperação, perfil, OTP e cadastro antigo passou; nenhum disparo real. |
| Growth | Pass | Newsletter mantida no aceite; captura simples independente preservada; retorno/convite e cancelamento mantidos. |
| QA | Pass | Lint direcionado, typecheck, pnpm validate (66 testes/build), smoke antigo até retorno e casos Google direcionados passaram. Erros iniciais de harness ao observar documento durante navegação foram corrigidos, sem contornar assertions. |

Escopo pronto para release: correção do cadastro/feedback e texto ancorado dos termos. Branding é etapa separada ainda pendente de cliente OAuth próprio; não declarar marca alterada nem bloquear a correção independente esperando credenciais.

## Inspeção de branding

O projeto integrado está em Managed by Lovable, sem Client ID/secret próprios configurados. A UI permite Your own credentials e apresenta callbacks (incluindo https://vitalemobilidade.com/~oauth/callback). A seleção de inspeção foi cancelada, sem salvar mudanças de Auth.

Google Cloud autenticado do proprietário possui Hotpipe SaaS Workspace, cuja marca não deve ser alterada para Vitale. Busca por Vitale não mostrou projeto. Formulário de um projeto dedicado Vitale Mobilidade / vitale-mobilidade-auth preparado, ainda não criado. Etapa posterior exige criar/configurar cliente OAuth com escopos básicos e registrar apenas no backend integrado; credenciais nunca em chat/Git. A marca/consentimento e eventual verificação do Google são dependências externas reais.

Rollback da correção: reverter UI/adaptador/copy desta PR, preservando dados e o login Google vigente. Custo até aqui: testes locais e leitura de configurações, nenhum agente Lovable, nenhuma mensagem real e nenhum recurso Google Cloud criado.

## Publicação da correção

PR #91 incorporada sem bypass, commit e34faf5ead881d92ffacd6e501b8337308c0a2c1, sincronizado no Lovable antes do deploy bae3a707-ec80-40f6-9594-cd1256d9e6a5. GitHub apresentou erro interno transitório no push/GraphQL; retry do push e API REST criaram/mesclaram a PR normalmente, com preview Netlify aprovado. Vercel mantém a falha preexistente fora do hosting ativo, sem alteração ou bypass de regras.

Domínio público exibiu o novo bloco Termos da comunidade e cadastro em /privacidade#termos-comunidade. Prévia da mesma revisão mostrou um único checkbox e contatos obrigatórios. Provas salvas fora do Git em outputs/vitale-signup-ux-2026-11-05. Testes/build já aprovados continuam válidos, sem alteração executável posterior.

Branding próprio ainda pendente: ao ser consultado sobre a criação, o usuário perguntou se haveria custo. A resposta esclareceu custo adicional previsto R$0 para login básico, apoiada pelo guia Google https://codelabs.developers.google.com/codelabs/sign-in-with-google-button (conta e projeto gratuitos). Isso não foi tratado como autorização: novo projeto/cliente não criado, billing não ativado, provedor gerenciado preservado. Formulário preparado e mantido para continuação após autorização explícita.
