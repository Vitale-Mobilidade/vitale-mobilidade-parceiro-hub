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


## Continuidade após aceite específico da política

O proprietário respondeu “Sim, aceitar a política e continuar” para Google API Services: User Data Policy. Aceite aplicado e criação confirmada por OAuth configuration created!. Branding salvo com nome, contato, logo oficial existente e os três links acima; domínio autorizado vitalemobilidade.com. Data Access salvo somente com openid, userinfo.email e userinfo.profile; nenhuma permissão sensível/restrita. Audience em In production, sem ativar billing ou serviço pago. Isso publica o aplicativo na plataforma Google; o site ainda usa o provedor gerenciado anterior.

Verificação de branding iniciada. O Google retornou uma pendência específica: a homepage https://vitalemobilidade.com não está registrada como propriedade dessa conta. A instrução oficial da tela é comprovar a propriedade e aguardar 24 horas antes de nova tentativa. Não solicitar revisão afirmando incorretamente que a pendência está resolvida. O Search Console autenticado como gpalmerio@gmail.com lista somente propriedades Hotpipe, sem Vitale; não foi feita alteração nelas.

A adição de propriedade Prefixo do URL está preenchida com https://vitalemobilidade.com e parou antes de CONTINUAR. Essa etapa pode verificar automaticamente a posse e conceder acesso administrativo no Search Console; por isso foi solicitada confirmação específica no chat, conforme política de controle do navegador para criação de acesso sensível. Nenhum DNS, arquivo, meta de produção, sitemap ou indexação foi alterado. Se for necessária publicação de token de comprovação, preparar a alteração local e obter autorização específica antes de publicar.

Cliente web preparado na console, ainda sem clicar Create: Vitale Mobilidade — site; origem https://vitalemobilidade.com; redirect https://vitalemobilidade.com/~oauth/callback. Checkbox AI-powered agent desmarcado. Nenhum Client ID/Secret criado. O formulário Lovable Your own credentials está preparado, campos vazios e somente o callback principal selecionado, sem Save. O provedor efetivo continua Managed by Lovable. A entrada e submissão do novo segredo devem ser feitas diretamente pelo proprietário na tela, por exigência da política do navegador para novas credenciais. Não enviar segredo pelo chat, Git, arquivos ou logs.

### Revisão posterior da preparação, sem liberação do novo provedor

| Perspectiva | Status | Evidência ou justificativa |
|---|---|---|
| Produto | Pass | Projeto dedicado e marca Vitale preparados; método atual preservado. |
| Arquitetura | Pass | Mesmo backend/Auth, callback exato conferido na UI Lovable; sem troca de banco/código. |
| IA | N/A | Sem IA nesta integração; opção AI agent desmarcada. |
| Segurança | Pass | Apenas três escopos básicos, política aceita pelo proprietário, nenhum segredo criado/transmitido; comprovação de domínio aguarda autorização. |
| UX | Fail | Marca ainda não exibida aos usuários: domínio não comprovado e branding não publicado. Bloqueia ativação própria. |
| CX | Pass | Projeto e propriedades Hotpipe preservados; login vigente continua operacional. |
| Growth | Fail | Identidade pública Vitale depende da comprovação do domínio e revisão Google; não declarar concluída. |
| PMO/QA | Fail | Configuração preparada e evidenciada; ativação e OAuth real com cliente próprio ainda não validados. |

Estado: aguardando autorização para propriedade no Search Console; depois comprovação, propagação/revisão Google e entrada final de credenciais pelo proprietário. Os Fail são critérios de release ainda não atendidos e impedem substituir o provedor atual; este registro é continuidade da preparação, não handoff de integração concluída. Nenhuma nova alteração executável: permanecem válidos lint/typecheck, smoke de cadastro/OTP/Google e pnpm validate (66 testes + build) já aprovados na PR #91.

Evidências externas ao Git em outputs/vitale-google-branding-2026-11-05/: google-branding-review.png, google-domain-verification-required.png e search-console-ownership-prepared.png. Tabs preservadas para continuar. Nenhum serviço pago ativado.
