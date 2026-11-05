# Aplicativo Google próprio da Vitale — 05/11/2026

Classificação estrutural: configuração externa de autenticação. Autorização recebida nesta conversa: “Sim, seguir sem serviços pagos”, para criar/preparar projeto e aplicativo Google próprios conforme a proposta revisada. Escopos previstos somente openid, email e profile; contato responsável aprovado pelo usuário. Não ativar billing, APIs pagas, novas permissões de dados ou outro backend.

## Revisão prévia complementar

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Identidade Vitale na autorização do Google; mesmo acesso e contas da comunidade. Não retirar o método atual antes da prova da alternativa. Prosseguir condicionado. |
| Arquitetura | Cliente OAuth próprio configurado no projeto integrado atual; callback principal do domínio da Vitale e retorno permitido pelo broker existente. Nenhuma troca de Auth/SSR/banco. Prosseguir condicionado às URLs exatas fornecidas pela UI. |
| IA | N/A: sem uso de IA no produto/integração. |
| Segurança | Segredo só no backend, nunca chat/Git/log. Escopos básicos, redirect exato, guard contra união insegura preservado. Etapas de credenciais/termos seguem política do navegador e podem exigir ação direta do proprietário. Prosseguir condicionado. |
| UX | A tela Google deve mostrar marca real aprovada; não mascarar a tela do provedor nem alegar branding concluído antes da prova. Prosseguir condicionado à configuração/verificação Google. |
| CX | Projeto dedicado preserva o app Hotpipe; documentação e rollback preservam login/sessões. Sem novos usuários/OTP reais para homologação. Prosseguir. |
| Growth | Nome, domínio e política da Vitale coerentes; sem escopos Gmail/Drive/YouTube. Prosseguir. |
| QA | Conferir projeto/brand/audience/scopes/URIs; validar configuração e OAuth real até o limite de consentimento pessoal. Verificação/aceite do proprietário são dependências explícitas. Prosseguir condicionado. |

Decisão: preparar projeto Vitale Mobilidade / vitale-mobilidade-auth e aplicativo web dedicado sem serviço pago. Não reutilizar nem renomear app Hotpipe. Preparar tudo antes da etapa final de segredo/aceite; manter o Google gerenciado até cliente próprio pronto. Rollback: permanecer/voltar ao provedor gerenciado, preservar IDs/contas, guard e sessões. Nenhuma alteração de schema, RLS, código ou dados pessoais é exigida para o branding.

Provas locais da integração atual continuam válidas: lint/typecheck, smoke de cadastro/OTP/Google e pnpm validate (66 testes + build), sem alteração executável desde a publicação da PR #91. Não repetir suíte inalterada apenas por mudança documental/configuração externa.

## Execução

A criação foi confirmada pela notificação oficial Create Project: Vitale Mobilidade / This task has finished e pela linha do recurso no inventário. ID vitale-mobilidade-auth. A console inicialmente não refletiu a operação; nenhuma conta externa ou projeto adicional foi reutilizado. Provedor vigente ainda não alterado.


O acesso ao novo projeto também se propagou: Credentials / APIs & Services exibiu Vitale Mobilidade e nenhuma chave/cliente pré-existente. O assistente inicial foi preenchido com nome Vitale Mobilidade, público External e contato aprovado. A etapa Finish exige aceitar Google API Services: User Data Policy. O checkbox permaneceu desmarcado; confirmação específica solicitada ao proprietário por exigência da política de controle do navegador para acordos legais. O login gerenciado atual permanece ativo.

Configuração preparada para a próxima etapa, após o aceite: aplicação web; origem JavaScript https://vitalemobilidade.com; redirect exato principal fornecido pelo Lovable https://vitalemobilidade.com/~oauth/callback; homepage https://vitalemobilidade.com; política https://vitalemobilidade.com/privacidade; termos https://vitalemobilidade.com/privacidade#termos-comunidade. Não registrar curingas ou domínios de terceiros como autorizados. Acrescentar outro callback somente se exigido para uma superfície efetivamente usada e autorizado na UI do Lovable.

Referências verificadas: https://developers.google.com/terms/api-services-user-data-policy ; https://support.google.com/cloud/answer/15549257 (cliente web e correspondência exata de redirect; propagação pode demorar). Segredo de cliente web é credencial: a entrada final no provedor será feita diretamente pelo proprietário na tela, sem transitar no chat, arquivos ou Git. O logo PNG existente public/vitale-logo-email.png está disponível como ativo oficial se a tela aceitar dimensões; não gerar ou editar a marca para esta configuração.


## Estado para continuidade

Projeto criado e acessível; nome Vitale Mobilidade, público External e contato aprovados preenchidos. O assistente está na etapa Finish com o aceite Google API Services: User Data Policy ainda desmarcado. Nenhum Client Secret foi criado/copiado/gravado e nenhum serviço pago foi ativado. OAuth do site continua Managed by Lovable.

A confirmação de termos permanece pendente no chat. Este é um bloqueio de autorização legal na etapa final do assistente, não uma conclusão da integração nem perda de acesso ao Supabase. A revisão posterior da ativação só será concluída após criar cliente, cadastrar os links/domínio, verificar/publicar marca e validar o novo provedor. Nenhuma promoção do login próprio será feita com essa dependência aberta.

A documentação oficial atual também esclarece que nome/logo exigem verificação e publicação de branding: https://support.google.com/cloud/answer/15549049 . Preparar marca não significa que a tela Google já mudou. Evidência do estágio de aprovação salva fora do Git em outputs/vitale-google-branding-2026-11-05/google-data-policy-approval.png. A tab da console foi preservada para continuação. Sem mudança executável nesta etapa, os testes e pnpm validate aprovados antes do último deploy continuam válidos.
