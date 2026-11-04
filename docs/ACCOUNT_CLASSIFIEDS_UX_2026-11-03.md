# Ajustes de acesso e anúncios — 03/11/2026

Classificação: estrutural, pela jornada de autenticação, retorno seguro e apresentação pública. Correção do piloto existente, sem nova funcionalidade de pagamento, banco, integração ou abertura a outros anunciantes.

## Revisão prévia das oito perspectivas

| Perspectiva | Impacto | Risco | Dependência | Decisão |
| --- | --- | --- | --- | --- |
| Produto | Login retorna à origem; perfil é uma ação explícita; taxa só ao anunciante | Confundir cadastro com assinatura adicional | Adesão existente já inclui newsletter | Prosseguir: remover banners repetidos; preservar aceite único e descadastros |
| CTO | Separar modos entrar/perfil/senha, retorno interno e prévia viva | Redirecionamento prematuro, recovery loop, campos perdidos por upload | Sessão/RPCs atuais; referência visual do Radar | Prosseguir sem alterar backend ou modelos do Radar |
| IA | Sem alteração de agentes | Anúncio privado ir para IA/telemetria | Isolamento privado existente | Preservar integrações; nenhuma chamada de IA |
| Segurança | Retorno seguro e consentimento de cadastro | Open redirect, tokens em URLs/retorno, adesão forjada | Allowlist de rotas e higienização; identidade existente | Prosseguir com validação a cada leitura; não alterar provas ou RLS |
| UX | Avatar sem texto, menu 16px, recuperação enxuta, fotos primeiro | Overflow, foco, prévia sem salvar, imagem apagando campos | Componentes Radar e states locais | Verificar 320–1440px, teclado e ida/volta após login |
| CX | Vendedor vai do CTA ao editor depois de autenticar | Cobrança parecer ativa ou etapa extra de newsletter | Piloto e isenção preservados em privado | Prosseguir; sem envios reais ou cadastro de anúncio pelo operador |
| Growth | Comprador vê convite, sem preço do espaço | Alterar formulário newsletter ou CTR de ofertas | SSR e captação atual | Preservar formulário byte a byte e Radar/afiliados; noindex piloto intacto |
| PMO/QA | Correção dirigida de frontend | Regredir cadastro/recovery ou chamar serviços reais no teste | Mocks, navegação real local, validate e rollback | Gate direcionado; não repetir migrações ou gastar créditos Lovable |

## Decisão consolidada

Escopo: menu e CTA 16px, avatar clicável sem “Minha conta”; edição em modo explícito; login/cadastro/redefinição bem-sucedidos retornam ao destino interno seguro, incluindo busca/fragmento não sensíveis. Recuperação só com seu formulário, sem avisos gerais, link repetido “esqueci” ou explorar artigos. Remover banners de status da newsletter; o cadastro continua informando sua inclusão no aceite único, sem pedir assinatura de novo a membros existentes. Nunca desfazer opt-out.

Vitrine e Home convidam “Quer vender sua bike aqui?” e direcionam ao login com retorno ao editor. Taxa e restrições do piloto só no ambiente privado do anunciante. Fotos antes dos campos; upload/capa/remoção não descartam alterações; prévia antes de salvar com a composição visual dos cards/detalhes do Radar, sem inventar métricas, ofertas ou histórico.

Sem migrations, alteração de grants/RLS/Auth, email/WhatsApp real, pagamento, anúncio inventado, mudança de catálogo ou reconstrução das integrações. Conservar SSR público e privacidade das rotas de conta. Retorno da recuperação por outro dispositivo usa destino seguro padrão; no mesmo navegador preservar a origem temporariamente, sem tokens ou credenciais.

Conflitos: retirar toda referência à newsletter também do aceite impediria informar a adesão combinada já definida. Remover os avisos repetidos e manter apenas o aceite no cadastro. A identificação exigida para publicar continua, mas não deve obrigar visitas ao perfil em todo login. Sem flexibilizar gates de identidade ou piloto.

Aceite: retorno automático à página de origem e ao editor via CTA; perfil explícito não redireciona; senha não redireciona antes de salvar; recovery enxuto; avatar só; menu 16px; nenhuma taxa no hub público; fotos são primeiro passo e prévia usa dados atuais; sem perda em upload; newsletter original preservada.

Rollback: revert do commit de frontend. Banco, sessões, anúncios e assinaturas permanecem no projeto existente. Publicação segue a autorização da correção do piloto nesta conversa, após checks proporcionais e informação de impacto/testes/rollback.

Estado: revisão concluída; implementação local em andamento.


## Resultado e validação local

- Login/cadastro retornam à origem interna após carregar/concluir a adesão do usuário atual; `location.replace` evita prender o botão Voltar na tela de autenticação. Edição é explícita em `modo=perfil`; links de perfil/validação em comentários e anúncios foram ajustados. Recuperação aguarda salvar a senha antes do retorno. Nome/foto e convites continuam na edição explícita.
- Recuperação não exibe os banners da comunidade/newsletter, “Explorar artigos” ou o link duplicado “Esqueci minha senha”. O cadastro mantém somente o aceite combinado já existente; membros não recebem uma nova solicitação de assinatura ou novo opt-in. Descadastros são preservados.
- Contexto de recuperação no mesmo navegador guarda apenas destino seguro por 30 minutos, sem senha/token. Retorno aceita rotas conhecidas, filtros de UI e fragmentos simples; remove credenciais e parâmetros de redirecionamento. Outro navegador/dispositivo usa destino padrão seguro. URLs e callbacks de Resend/Supabase permanecem iguais.
- Header com links/Quiz/Entrar em 16px; usuário autenticado vê só o avatar/letra com menu acessível. O caminho real do navegador é capturado no clique, incluindo fragmentos que o servidor não recebe.
- Vitrine pública: “Quer vender sua bike aqui?”, seguida de login com retorno ao editor. Preço do espaço e detalhes do piloto ficaram na área privada do anunciante; privacidade pública também não informa taxa. Nenhum preço da bicicleta à venda é escondido.
- Fotos primeiro, com seletor em português; informações em segundo. Upload/capa/remoção preservam campos ainda não salvos. Prévia viva mostra card e detalhe com o enquadramento, tipografia, chips, preço e composição do Radar, sem alterar o Radar ou inventar suas métricas.

### Evidências

1. 45 testes direcionados passaram: limites de destinos, tokens fora do retorno, TTL/storage indisponível, schemas e projeções públicas existentes.
2. Playwright local passou: cadastro com uma adesão/newsletter, login normal voltando a Radar com query/fragmento, voltar/avançar sem loop de Auth, edição explícita, recuperação limpa, callback só retorna após salvar, CTA público → login → editor. Regressão de perfil, convites, opt-out, newsletter avulsa, identidade, comentários e moderação preservada. Zero runtime errors; todas as chamadas externas bloqueadas/mocks.
3. Playwright de anúncios passou: fotos antes do primeiro campo, cinco uploads reencodados, quinto upload enquanto dados estão não salvos sem perda, prévia antes de salvar com os dados atuais, capa/galeria, publicação condicionada à identidade, estados de anúncio e piloto, SSR/vitrine/Home e menu de 16px. Layout conferido em 320/390/1024/1280/1440px.
4. Lint direcionado e `pnpm validate`: Pass (66 testes do gate e build SSR). Comparação de NewsletterSignup e `/newsletter` com 540fc1d: byte a byte sem diferença. Nenhuma migration, configuração ou dado produtivo alterado.

Capturas locais em `artifacts/account-classifieds-ux/` são sintéticas e não representam anúncios reais. Nenhum envio de e-mail/WhatsApp, pagamento ou crédito de IA usado nesta correção.

## Revisão posterior das oito perspectivas

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Aceite único inclui newsletter; sem banners repetidos; perfil intencional e taxa só ao vendedor |
| CTO | Pass | SSR preservado; navegação segura e retorno após sessão/adesão corretas; upload não sobrescreve formulário |
| IA | Pass | Nenhum agente, contexto editorial ou integração de IA alterado |
| Segurança | Pass | Allowlist/remoção de credenciais/TTL testados; RLS, gates de identidade/piloto e consentimentos existentes preservados |
| UX | Pass | Menu 16px e avatar só; recovery limpo; origem, fotos primeiro e prévia viva testados/inspecionados |
| CX | Pass | CTA encaminha ao editor após login; sem nova adesão de membros existentes ou cobrança ativa |
| Growth | Pass | Vitrine do comprador sem taxa, estilo do Radar e captação original preservados |
| PMO/QA | Pass | Testes proporcionais, validate e rollback; sem crédito Lovable ou migração |

Parecer local: GO para a correção do piloto já autorizado; publicação/verificação públicas ainda pendentes. Escopo de release: componentes de conta, comentários (destino de edição), header, navegação segura e classificados; retorno de recuperação só no frontend. Rollback por revert do commit, sem tocar dados ou integrações.


## Registro de release

PR #67 integrada em `59fef035f1eb743708b0f8148b823acfa08d486c`. Prévia Netlify e checks de headers passaram; status Vercel falha também no baseline e não é o hosting ativo, sem alteração de infraestrutura nesta correção. Código validado e commit conferido no Lovable antes de publicar. Deployment `3e16fb82-54ed-4927-93dc-22cd451c066e` solicitado pelo conector, sem agente/consumo de créditos de IA. Verificado no domínio público: novo CTA, login com retorno e avatar sem texto. Em 04/11 o responsável suspendeu a divulgação de Entrar/Venda, preservando sessão e acesso por URL; ver registro ACCOUNT_CLASSIFIEDS_LAUNCH_HOLD_2026-11-04.md.
