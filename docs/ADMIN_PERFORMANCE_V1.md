# Admin Performance V1 — navegação e leitura

Status em 25/09/2026: implementação local concluída e validada; publicação pendente do deploy coordenado da função e do frontend.

## Objetivo e diagnóstico

Reduzir o tempo percebido de carregamento do Admin sem relaxar autenticação, persistir dados pessoais no navegador ou alterar writers, schema, RLS e integrações. A inspeção do código encontrou três custos repetidos:

- dados de leitura são descartados quando a rota desmonta, então voltar para uma seção repete rede, autenticação da Edge Function e consultas;
- Vídeos abre duas requisições protegidas (`videos` e `articles`) além da leitura pública da planilha, fazendo a função validar usuário e membership duas vezes;
- a troca de período do Growth apaga o conteúdo antes da resposta, aumentando a lentidão percebida mesmo quando já existe um resultado válido.

O catálogo público de vídeos já possui cache server-side de dez minutos. O cache de acesso do `AdminShell` já evita a tela cheia de verificação na navegação interna e cada chamada protegida continua validando JWT e membership no servidor.

## Governança — revisão pré-implementação

Classificação: **estrutural**, porque altera o caminho de leitura de uma Edge Function protegida e o tratamento em memória de dados administrativos com PII.

### Produto e Estratégia
- Impacto: menor tempo até informação e menos espera repetida entre seções.
- Risco: otimizar métricas pouco usadas sem melhorar a operação principal.
- Dependências: priorizar Visão geral, Growth, Bikes, Vídeos e Artigos.
- Recomendação: prosseguir com o menor corte que remove round-trips e reaproveita leituras.

### CTO e Arquitetura
- Impacto: cache efêmero por usuário no React Query, deduplicação de requisições e endpoint agregado somente leitura para o workspace editorial.
- Risco: dados obsoletos após mutações ou mistura de cache entre sessões.
- Dependências: chaves sob namespace `admin`, TTL curto, invalidação após escrita e limpeza no logout/troca de autenticação.
- Recomendação: prosseguir; nenhuma persistência em storage e nenhuma mudança de contrato público.

### IA e Agent Engineering
- Impacto: nenhum contrato de geração muda; somente a carga que precede a escolha do vídeo/artigo.
- Risco: cache mostrar estado anterior após uma geração.
- Dependências: invalidar workspace editorial depois de salvar ou gerar.
- Recomendação: prosseguir sem invocar IA nos testes.

### Segurança
- Impacto: dados administrativos, inclusive PII do Growth, podem permanecer brevemente apenas na memória da aba.
- Risco: sessão seguinte reutilizar dados da anterior.
- Dependências: chave por usuário, limpeza de todas as queries `admin` no logout e eventos de autenticação; servidor segue autorizando cada cache miss.
- Recomendação: prosseguir condicionado a não usar `localStorage`, `sessionStorage`, service key ou cache público.

### UX/UI
- Impacto: retorno instantâneo a telas visitadas, conteúdo anterior preservado durante atualização e menos estados vazios de carregamento.
- Risco: parecer que dados antigos são definitivos.
- Dependências: stale time curto para Growth e indicador discreto de atualização quando necessário.
- Recomendação: prosseguir mantendo estados de erro, vazio e loading inicial acessíveis.

### CX e Operação
- Impacto: reduz espera para alternar entre acervo, artigos, catálogo e indicadores.
- Risco: operador salvar e não enxergar a mudança.
- Dependências: invalidação após mutações e botão/fluxo existente preservado.
- Recomendação: prosseguir; Sheets, sync e painel operacional permanecem intocados.

### Growth e CRO
- Impacto: leitura do funil fica mais rápida; coleta e significado dos números não mudam.
- Risco: cache curto mascarar evento recém-chegado.
- Dependências: TTL de 60 segundos para Growth e atualização ao alterar período.
- Recomendação: prosseguir; não mudar tracking, links ou atribuição.

### PMO e QA
- Impacto: frontend e uma ação read-only da Edge Function mudam e precisam de deploy coordenado.
- Risco: frontend pedir o endpoint agregado antes de a função compatível estar implantada.
- Dependências: implantar `editorial-admin` antes do frontend; testes direcionados, `pnpm validate` e smoke autenticado.
- Recomendação: prosseguir com rollback independente de função e frontend.

### Conflitos e trade-offs
- Velocidade favorece TTL longo; atualização operacional favorece leitura imediata. Decisão: cinco minutos para catálogo/editorial, um minuto para Growth e invalidação explícita após mutações.
- Uma API agregada reduz latência, mas amplia o payload. Decisão: agregar apenas vídeos e a lista compacta de artigos, que já eram carregados juntos na mesma tela.
- Prefetch agressivo aquece telas, mas consome Edge Function e banco sem intenção real. Decisão: deduplicar e reusar apenas leituras solicitadas; prefetch de rota fica limitado à intenção de navegação.

### Decisão consolidada
- Escopo: cache efêmero por usuário via React Query; limpeza de cache no logout/auth; ação `editorial-workspace`; reaproveitamento de Visão geral, Growth, Bikes, Vídeos, Artigos e criação; preservação do resultado do Growth durante troca de período.
- Dependências: código mais recente do mesmo projeto Lovable; Edge Function implantada antes do frontend.
- Critérios de aceite: voltar a uma tela dentro do TTL não repete leitura; Vídeos usa uma única chamada protegida; nenhum `Verificando acesso…` na navegação interna; mutações invalidam o cache; `pnpm validate` passa; smoke autenticado passa.
- Fora de escopo: migration, índices, schema/RLS, alteração de dados, GA4/Lovable Analytics, imagens públicas, reescrita ampla do Admin e testes de carga.
- Rollback: reverter o commit de performance e reimplantar a versão anterior de `editorial-admin`; nenhum dado exige restauração.

## Implementação

- Visão geral, Growth, Bikes, catálogo de vídeos e workspace editorial usam React Query com deduplicação e cache apenas em memória.
- O stale time é de cinco minutos para leituras operacionais/editoriais e de um minuto para Growth. A troca de período mantém o resultado anterior visível enquanto a nova leitura ocorre.
- O cache `admin` é removido no logout, recuperação de senha e troca efetiva de usuário. Nenhum dado é persistido em storage.
- A nova ação protegida `editorial-workspace` lê vídeos e o índice compacto de artigos em paralelo após uma única validação de JWT/membership.
- Vídeos, Artigos e Criar artigo compartilham o mesmo workspace; a planilha pública também é deduplicada pelo mesmo cliente.
- Salvar vídeo, gerar, editar, mudar status, arquivar ou excluir artigo invalida o workspace antes da próxima leitura.
- Links do menu usam preload por intenção para antecipar o chunk da rota sem consultar a Edge Function antes do clique.

## Governança — revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | **Pass** | O corte prioriza as telas operacionais solicitadas e não adiciona produto ou infraestrutura futura. |
| CTO e Arquitetura | **Pass** | Leituras são deduplicadas; o endpoint agregado é read-only; SSR público, repositories, writers e contratos públicos permanecem intactos. |
| IA e Agent Engineering | **Pass** | Geração não mudou nem foi acionada; invalidação ocorre depois de uma geração concluída. |
| Segurança | **Pass** | Cache somente em memória, limpo na saída/troca de usuário; Edge Function continua validando JWT, membership e papel em todo cache miss; sem PII em storage. |
| UX/UI | **Pass** | Loading inicial e erros permanecem acessíveis; Growth não fica em branco ao trocar o período; navegação interna recebe preload por intenção. |
| CX e Operação | **Pass** | Sheets, sync e painel operacional não foram alterados; mutações invalidam as listas relacionadas. |
| Growth e CRO | **Pass** | Métricas, tracking e links não mudaram; somente a leitura do painel ganhou TTL curto. |
| PMO e QA | **Pass condicionado** | Teste direcionado de rotas, typecheck e `pnpm validate` passaram. Falta implantar função antes do frontend e executar smoke autenticado em produção. |

### Fechamento local

- Validações: `git diff --check`; 25 testes direcionados de rotas; typecheck; `pnpm validate` com 47 testes, build client/SSR/Nitro.
- Baseline HTTP do domínio antes do release: HTML de `/admin`, `/admin/growth` e `/admin/videos` respondeu em aproximadamente 80–90 ms nesta amostra; a espera percebida está depois do HTML, nas leituras autenticadas, que são o alvo deste corte.
- Risco residual: a primeira visita ainda depende de uma inicialização da Edge Function e de consultas reais; este corte melhora principalmente navegação repetida, concorrência e espera percebida, sem prometer eliminar latência de rede/cold start.
- Condição de release: **GO condicionado** a deploy de `editorial-admin` antes do frontend e smoke autenticado das cinco telas principais.
