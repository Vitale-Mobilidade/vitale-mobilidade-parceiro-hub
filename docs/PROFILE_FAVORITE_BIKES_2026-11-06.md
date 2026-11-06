# Bikes favoritas no menu do perfil — 06/11/2026

> **Publicado:** menu do perfil → “Bikes favoritas”. [Acesso direto](https://vitalemobilidade.com/radar?favoritos=1#todas). PR #103, código `782e91bc2812047a037b3ca86371d8b402e0e230`, deployment `256b7db7-1408-4686-9693-883789ae73cb`.

Objetivo: dar acesso persistente às bikes salvas a partir do avatar, conforme correção solicitada pelo responsável após o release de favoritos. Base operacional `a07e55e`; branch `codex/profile-favorite-bikes-2026-11-06`.

Classificação **estrutural** por envolver navegação do Radar. Delta apenas de frontend: reaproveitar o filtro e a RPC de favoritos já publicados, sem migration, alteração de dados, autenticação ou envio de alertas. Refinamento da mesma funcionalidade cuja implementação/publicação foram autorizadas nesta conversa.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Entrada “Bikes favoritas” no perfil, disponível em todo o site | Lista ficar escondida ou divergir do Radar | Favoritos existentes | Prosseguir reutilizando catálogo filtrado |
| CTO e Arquitetura | Filtro de leitura na URL, preservado ao recarregar/voltar | Estado local ignorar link; carregamento exibir catálogo inteiro | Router atual e hook compartilhado | Condicionado a URL como fonte do filtro e SSR sem dados privados |
| IA e Agent Engineering | Sem agente alterado | Custo externo sem necessidade | Nenhuma dependência de IA | Prosseguir sem geração |
| Segurança | Retorno ao login preserva só flag pública do filtro | Open redirect ou dados pessoais na URL | Sanitizador de retorno existente | Condicionado a aceitar somente favoritos=1 no Radar; sem IDs privados na URL |
| UX/UI | Atalho visível no avatar e título contextual | Falso estado vazio antes de carregar; perder posição | Âncora do catálogo, estados de carga/erro/vazio/login | Prosseguir com menu, teclado e mobile |
| CX e Operação | Usuário reencontra o que salvou | Recriar favorito, alerta ou contato por navegação | RPC atual de leitura | Prosseguir; URL nunca dispara escrita |
| Growth e CRO | Retorno a bikes de interesse com oferta/alerta disponíveis | Criar página duplicada e tirar pessoa da decisão | Canonical Radar existente | Prosseguir com /radar?favoritos=1#todas, sem nova rota SEO |
| PMO e QA | Correção controlada do release anterior | Publicar link que não aplica filtro | Smoke do menu até lista, reload/back, login e gate | Prosseguir após testes locais; rollback de frontend |

## Decisão consolidada e trade-offs

- Escopo: item “Bikes favoritas” após “Editar meu perfil”, link para Radar filtrado, título “Bikes favoritas”, filtro persistente ao atualizar/voltar e estados de carga/erro/vazio/login. Manter “Meus favoritos” como controle local do catálogo, sincronizado com URL.
- Trade-off: reutilizar a experiência canônica preserva oferta/histórico/alerta na mesma Bike e reduz manutenção. A âncora posiciona o usuário no catálogo; nenhum novo diretório/perfil público ou página duplicada é criado.
- Critérios: menu desktop/mobile e teclado chegam apenas aos favoritos da conta; URL/reload preservam filtro; desmarcar/ver todas remove filtro; visitante direto tem chamada de login com retorno correto; não exibir “sem favoritos” enquanto carregando/falhando; SSR não consulta preferências privadas; pnpm validate.
- Fora de escopo: nova tabela/RPC, modificar favoritos existentes, inscrever alertas, mudar consentimento, comentários, anúncios, regras do catálogo ou indexação.
- Rollback: reverter este delta de frontend para `a07e55e`. Favoritos e schema publicados permanecem intactos. Sem custo externo adicional ou agente Lovable.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | “Bikes favoritas” no perfil, mesma lista privada e mesmos cards de decisão. |
| CTO e Arquitetura | Pass | URL é fonte do filtro; reload/back sincronizados. SSR da vista privada mostra carregamento, sem RPC/sessão nem catálogo falsamente apresentado como favorito. |
| IA e Agent Engineering | N/A | Nenhum agente/prompt/modelo alterado ou chamado. |
| Segurança | Pass | Apenas flag pública `favoritos=1` aceita no retorno do Radar; credenciais/redirects continuam descartados. Nenhuma escrita privada decorre do link. |
| UX/UI | Pass | Menu desktop/celular e teclado aprovados; título contextual, carregamento/erro/vazio/login distintos; âncora respeita header fixo. |
| CX e Operação | Pass | URL leva à leitura de favoritos existentes; não duplica dados nem inscrições; retry preservado. |
| Growth e CRO | Pass | Radar e canonical existentes; sem nova página indexável, oferta e alerta presentes nos mesmos cards. |
| PMO e QA | Pass | 23 testes direcionados, smoke local com Auth/RPC simulados e pnpm validate aprovados. Nenhum backend produtivo alterado. |

### Evidências

- 23 testes: `src/pages/Acompanhamento.ssr.test.tsx`, `src/lib/member-community.test.ts`, `src/lib/radar-favorites.test.ts`.
- `tests/radar-favorites-ui.mjs`: menu → URL filtrada → favoritos corretos, reload, voltar, carga atrasada sem cards incorretos, erro sem falso vazio, retorno após login, teclado e menu mobile. Regressores de favoritos, troca de conta e alerta existentes preservados; todas as chamadas externas bloqueadas.
- O smoke detectou serialização incorreta do valor numérico por navegação baseada em string; corrigido usando navegação nativa do router com `favoritos: 1`. O teste de ida/volta assegura URL e filtro consistentes.
- Lint dos módulos/testes alterados aprovado; regras funcionais de Acompanhamento aprovadas, preservando formatação herdada.
- `pnpm validate`: typecheck, 66 testes do gate e build cliente/SSR/Nitro aprovados. Nenhuma suíte extensa.
- Capturas de testes locais: [menu desktop](../artifacts/radar-favorites/profile-menu-local.png), [menu mobile](../artifacts/radar-favorites/profile-menu-mobile.png). Conta/preferências sintéticas, sem dados pessoais.
- Rollback apenas de frontend para `a07e55e`; nenhuma migration ou ação de recuperação de banco necessária.

Decisão: **GO local**. Publicação é refinamento do acesso aos favoritos no mesmo release autorizado nesta conversa; código, testes e rollback preparados antes de integrar/publicar.


## Release e fechamento

- Refinamento publicado sob a autorização de implementação/publicação dos favoritos nesta conversa; sem novo banco, writer, contato ou custo de geração.
- PR [#103](https://github.com/Vitale-Mobilidade/vitale-mobilidade-parceiro-hub/pull/103) integrada em `782e91bc2812047a037b3ca86371d8b402e0e230`; árvore igual ao código local validado. Netlify aprovado. Vercel mantém falha preexistente fora do Lovable; sem bypass de regras.
- Mesmo SHA reconhecido no Lovable, preview conferido antes do deploy. Deployment `256b7db7-1408-4686-9693-883789ae73cb` solicitado; domínio público confirmado depois da propagação.
- Público anônimo em `/radar?favoritos=1#todas`: título “Bikes favoritas”, zero cards apresentados como salvos, mensagem de acesso e link `/conta?retorno=%2Fradar%3Ffavoritos%3D1%23todas`. Sem falso estado vazio; âncora a 96px, abaixo do header. [Captura do domínio](../artifacts/radar-favorites/profile-favorites-production.jpg).
- Navegar pelo header para `/radar` removeu a flag, restaurou “Todas as bikes monitoradas (27)” e 12 cards iniciais. Menu autenticado, lista realista por conta, desktop/mobile/teclado, reload/back e retorno pós-login exercitados no smoke local com Auth/RPC simulados. Sessão pessoal do Chrome não foi usada nem alterada.
- Nenhuma escrita produtiva de preferências ou teste de alerta foi realizada nesta correção. Dados e permissões dos favoritos anteriores permanecem.
- Oito perspectivas mantêm os status da matriz pós-implementação: **Pass**, com **N/A** para IA. Critérios cumpridos, nenhuma pendência de release.

Decisão final: **GO — publicado**. Rollback de frontend para `a07e55e1cdaec9dcea1c2c06972003ddfb85a73e`, mantendo favoritos e alertas existentes. Custo externo adicional: nenhum previsto/consumido por geração.
