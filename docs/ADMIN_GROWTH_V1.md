# Admin Growth V1 — desempenho, vídeos e cobertura de dados

Status em 25/09/2026: implementação local na branch `codex/admin-growth-sep25`; sem deploy, publicação, migration, alteração de RLS ou escrita em produção.

## Diagnóstico

- Cada rota montava um novo `AdminShell`, começava em `checking` e fazia `auth.getSession()` mais a chamada protegida `session`. A navegação do menu usava `<a>`, provocava recarga completa e exibia “Verificando acesso…” em todo clique.
- A visão geral chamava de “Vídeos cadastrados” somente as linhas de `editorial_videos`. A biblioteca juntava esse conjunto ao catálogo da aba `Videos Youtube`; por isso 3 e 104 eram números corretos para conjuntos diferentes, apresentados como se fossem iguais.
- O formulário de criação V2 voltou a pedir URL e título manualmente, apesar de ambos já existirem no catálogo de vídeos.
- O projeto persiste funil, leads e cliques de compra do Quiz no Supabase. Pageviews e cliques afiliados gerais são enviados ao GTM, mas o Admin não possui contrato de leitura de GA4/Lovable Analytics. Não há base factual local para declarar “páginas mais acessadas” ou identificar todo visitante do site.

## Governança — revisão pré-implementação

Classificação: **estrutural**, porque toca autenticação administrativa, analytics, dados pessoais, IA editorial, Google Sheets e links afiliados.

### Produto e Estratégia
- Impacto: transforma o Admin em instrumento operacional e de Growth, além de simplificar Vídeo → Artigo.
- Risco: apresentar cobertura parcial como visão completa do negócio.
- Dependências: nomes explícitos para cada fonte e estado de cobertura.
- Recomendação: prosseguir com métricas comprovadas; não inventar pageviews.

### CTO e Arquitetura
- Impacto: cache apenas da apresentação da sessão; toda API continua validando JWT e membership server-side. A Edge Function agrega tabelas existentes.
- Risco: cache esconder revogação na UI ou queries administrativas crescerem demais.
- Dependências: TTL curto, invalidação em sign-out e limites de leitura.
- Recomendação: prosseguir sem schema novo; manter queries limitadas e endpoint protegido.

### IA e Agent Engineering
- Impacto: criação recebe vídeo canônico e transcrição; geração existente permanece igual.
- Risco: vídeo errado ou transcrição antiga alimentar o Compiler.
- Dependências: seleção explícita e revisão humana do rascunho.
- Recomendação: prosseguir; nenhuma chamada paga de IA em testes.

### Segurança
- Impacto: tela Growth lê nome e telefone já existentes em `quiz_leads`.
- Risco: exposição de PII e confiança excessiva no cache cliente.
- Dependências: papel `admin`, service role somente na Edge Function e nenhuma PII em logs/analytics.
- Recomendação: prosseguir condicionado a negar Growth a `content`/`operation`; autenticação real continua em cada request.

### UX/UI
- Impacto: navegação sem recarga, KPIs com nomes coerentes, CTA contextual e seletor de vídeo.
- Risco: estados vazios/indisponíveis parecerem zero.
- Dependências: usar “—” e mensagens de cobertura quando a fonte não estiver disponível.
- Recomendação: prosseguir com estados de loading, vazio e erro.

### CX e Operação
- Impacto: reduz retrabalho e explica planilha versus importação editorial.
- Risco: operador interpretar importação editorial como alteração da planilha.
- Dependências: manter Sheets como fonte e fluxo comercial somente leitura.
- Recomendação: prosseguir; nenhum writer comercial novo.

### Growth e CRO
- Impacto: torna visível funil, cliques identificados, bikes e origens do Quiz.
- Risco: misturar clique identificado do Quiz com clique afiliado sitewide ou receita confirmada.
- Dependências: leitura futura de GA4/Lovable Analytics para pageviews e cobertura global; Mercado Livre para venda/receita.
- Recomendação: prosseguir com rótulos de escopo e lacuna explícita.

### PMO e QA
- Impacto: nova rota, novo contrato da Edge Function e mudanças de navegação.
- Risco: publicar frontend sem função compatível ou declarar painel completo antes da integração externa.
- Dependências: testes direcionados, `pnpm validate`, deploy coordenado da função e frontend somente com autorização.
- Recomendação: prosseguir localmente; NO-GO para release automático.

### Conflitos e trade-offs
- Velocidade pede cache longo; segurança pede revogação imediata. Decisão: cache de UI por 10 minutos, invalidado em sign-out/atualização, enquanto cada chamada protegida revalida JWT e membership no servidor.
- “Painel de tudo” pede números completos; as fontes atuais só sustentam Supabase/Quiz e GTM externo. Decisão: entregar o recorte comprovado e exibir a lacuna, em vez de criar um segundo writer de analytics sem reconciliação.
- Mostrar “quem clicou” ajuda operação, mas envolve PII. Decisão: somente perfil `admin`, apenas leads identificados voluntariamente no Quiz e sem exportação nesta fase.

### Decisão consolidada
- Escopo: navegação client-side e cache de UI; KPIs de vídeos separados; seletor de vídeo na criação; rota Growth com funil, cliques identificados, bikes, origens e cobertura.
- Dependências: tabelas atuais `quiz_leads`, `quiz_events`, `editorial_videos` e `editorial_articles`; Edge Function `editorial-admin` compatível.
- Critérios de aceite: sem tela cheia de verificação em navegação interna; números de vídeo semanticamente distintos; criação preenche metadados do catálogo; Growth nega não-admin e não apresenta pageview inexistente.
- Fora de escopo: conexão GA4/Lovable Analytics, receita/venda do Mercado Livre, nova coleta sitewide, deploy, migration e alteração de produção.
- Rollback: reverter a branch/commit de frontend e Edge Function; nenhum dado ou schema precisa ser revertido.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | **Pass** | O Admin distingue acervo, trabalho editorial e conversão; não antecipa receita nem afirma cobertura inexistente. |
| CTO e Arquitetura | **Pass** | Navegação usa TanStack `Link`; cache afeta só a UI e APIs continuam protegidas; nenhuma migration ou writer novo. Typecheck e build passaram. |
| IA e Agent Engineering | **Pass** | Seleção usa vídeo canônico e o Compiler existente; nenhum modelo foi chamado nos testes e não há publicação automática nova. |
| Segurança | **Pass** | Endpoint Growth exige `admin`; PII não vai a logs nem analytics; JWT e membership continuam validados em cada request da Edge Function. |
| UX/UI | **Pass condicionado** | Estados de loading, erro, vazio e cobertura existem; a experiência autenticada ainda precisa de smoke desktop/mobile antes de release. |
| CX e Operação | **Pass** | Planilha continua fonte de descoberta e catálogo comercial somente leitura; criação elimina URL/título duplicados. |
| Growth e CRO | **Pass condicionado** | Funil e cliques do Quiz são factuais; pageviews e cliques sitewide aguardam conexão de leitura com a fonte externa. |
| PMO e QA | **Pass condicionado** | `pnpm validate` passou com 35 testes, typecheck e build. Deploy coordenado da Edge Function e frontend, smoke autenticado e autorização continuam pendentes. |

### Fechamento

- Validações executadas: typecheck; 29 testes direcionados; `pnpm validate` com 35 testes e build client/SSR/Nitro; `git diff --check`.
- Documentação atualizada: este registro e referência no Admin P0.
- Conflitos, trade-offs e riscos residuais: o cache de UI tem TTL de 10 minutos, mas não concede acesso; agregações ranqueadas leem até 2.000 eventos/leads por período; GA4/Lovable Analytics ainda não está conectado ao Admin.
- Estado da task: implementação local concluída; inspeção autenticada e integração externa permanecem pendentes.
- Condição de release: **NO-GO automático**. Exige deploy compatível da Edge Function antes do frontend, smoke com papéis `admin`/`content`/`operation`, confirmação da leitura real dos dados e autorização explícita para publicar.
