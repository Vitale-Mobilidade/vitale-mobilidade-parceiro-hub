# Navegação pública em espera — 04/11/2026

> Superada pela liberação explícita de 05/11/2026. Ver [abertura pública e Admin do canal](PUBLIC_ACCOUNTS_CLASSIFIEDS_2026-11-05.md). Este registro preserva o histórico do período de espera.

Decisão do responsável: não divulgar Entrar nem Venda sua bike antes de finalizar. Correção explícita posterior: manter a sessão de gpalmerio@gmail.com e acesso aos testes; apenas não mostrar no menu. Esta decisão substitui o bloqueio total inicialmente interpretado.

Classificação: relevante; revisão pelas oito perspectivas. Sem alteração de schema, RLS, Auth ou integrações.

## Revisão prévia e decisão consolidada

| Perspectiva | Impacto, risco e dependência | Recomendação |
| --- | --- | --- |
| Produto | Descoberta suspensa, uso direto preservado para testar; bloquear tudo impediria o objetivo | Separar navegação de disponibilidade |
| CTO | Reutilizar recursos existentes; não desconectar sessão nem bloquear rotas | Flag de navegação independente da flag de contas |
| IA | Nenhum fluxo editorial ou agente afetado | Preservar |
| Segurança | Ocultar menu não é controle de acesso; gates reais de identidade/propriedade/piloto seguem no servidor | Preservar regras atuais, sem ampliar privilégios |
| UX | Sem Entrar para visitante nem Venda no header/Home; avatar logado continua acessível | Nenhum redirect/404 novo |
| CX | Responsável precisa testar perfil e anúncios existentes | Manter sessão, dados, links diretos e backend ativos |
| Growth | Captação simples independente e páginas atuais continuam públicas | Não alterar newsletter, Radar, Quiz ou afiliados |
| PMO/QA | A suspensão total foi corrigida por instrução posterior | Testar visitante e usuário logado separadamente |

Escopo: `memberPublicNavigationEnabled=false` controla venda no menu, seção da Home e Entrar para visitante. `memberAccountsEnabled` permanece como antes, assim como rotas diretas, comentários e permissões existentes. O avatar de usuários já logados continua com Editar perfil e Anuncie sua bike quando permitido. Não há logout, revogação, reset de senha, alteração de tokens nem nova autorização de anunciantes.

Conflito/trade-off: a instrução inicial foi interpretada como suspensão de toda a disponibilidade. As duas flags de backend foram temporariamente desligadas. Após esclarecimento do responsável, ambas foram restauradas e conferidas como true; conta convidada e único rascunho preservados. A mudança de bloqueio de rotas ficou somente local e foi retirada antes de qualquer commit/deploy. Ocultar descoberta não impede acesso por URL; este é o comportamento explicitamente solicitado, com segurança/piloto existentes preservados.

Critérios: header desktop/mobile sem Venda e sem Entrar anônimo; sessão válida mantém avatar/menu; perfil e editor acessíveis diretamente; newsletter original; Home sem divulgação de anúncios. Reabrir a divulgação exige autorização explícita futura. Rollback visual: revert do commit, sem tocar dados/sessão/flags do servidor.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Navegação oculta; perfil/editor disponíveis diretamente conforme esclarecimento |
| CTO | Pass | Flag separada, SSR/build e typecheck passaram; sem guard novo nem migration |
| IA | N/A | Sem alteração de agentes, modelos ou fluxos editoriais |
| Segurança | Pass | Gates originais preservados; teste com conta não convidada nega criação; nenhuma sessão real manipulada |
| UX | Pass | Avatar logado após Quiz; header sem Venda/Entrar anônimo e Home sem classificados; responsivo 320–1440 |
| CX | Pass | Perfil, fotos, rascunho, editor e login direto testados com fixture local; flags reais true verificadas |
| Growth | Pass | NewsletterSignup e rota newsletter sem diff frente ao baseline; Radar/Quiz/afiliados preservados |
| PMO/QA | Pass | `pnpm validate` (66 testes + SSR/build), smoke local de classificados/perfil/avatar/login, diff-check; rollback registrado |

Validação exclusivamente local com Auth/Storage/RPC sintéticos e cinco fotos canvas. Sem mensagens, pagamentos ou anúncios reais. O preview por `vite preview` não funcionou neste ambiente devido à referência esperada `dist/server/server.js`; não é evidência sobre funcionamento do deploy Lovable. Build SSR passou e smoke Vite passou. A sessão real de gpalmerio não foi inspecionada ou substituída: não há logout, token editado, senha redefinida ou usuário removido. O responsável mantém a sessão em seu Chrome.

Lint: regras funcionais dos cinco módulos alterados verificadas. O lint padrão encontrou formatação Prettier já extensa em HomeB2C; os trechos novos foram ajustados sem reformatar a página inteira.

Estado: GO para ocultar somente a descoberta pública, autorizado pela instrução atual; verificação no domínio pendente. Nenhum bloqueio total será publicado.


## Registro final

PR #68 integrada em `52f8021a12b956129b510d26095675c1c3d95a51`; código conferido no Lovable antes do deploy `c39a3201-684d-4886-8fda-ee45a8f6d69c`. Domínio público verificado: Home sem Venda/Entrar, seção de classificados omitida e newsletter preservada. `/conta?modo=entrar` mostra formulário funcional por URL e `/conta/anuncios` mantém o fluxo Entrar na minha conta. Inspeção pública sem credenciais; não houve login, logout ou alteração da sessão real do responsável. Smoke completo de membros também passou após ajuste da navegação (signup, retorno, recovery, perfil, identidade, comentários e indicação com mocks).

Flags de backend restauradas true; piloto e rascunho preservados. Nenhuma migration, envio real ou crédito de IA. Evidência visual em `outputs/vitale-navigation-hold-2026-11-04/public-home.png`. Estado final: descoberta pública suspensa, acesso direto e sessão preservados conforme esclarecimento; reabrir divulgação depende de instrução futura.
