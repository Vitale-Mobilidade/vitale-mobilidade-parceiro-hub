# Analytics do Admin v2 — 08/10/2026

## Decisão consolidada antes da implementação

Classificação: **estrutural**. A entrega altera Quiz/Admin, instrumentação pública e Supabase. O mapa de sinergia é uma direção visual, não um contrato definitivo. O projeto real e os dados que já existem são a referência.

| Perspectiva | Decisão prévia                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Organizar o Growth em três perguntas de negócio: onde o Quiz perde pessoas, quais bikes recomenda e quais bikes recebem interesse no site. Não reabrir Quiz, CRM ou sync, que já funcionam.                                                                                                                                                                                       |
| CTO         | Reutilizar `quiz_leads` para recomendações históricas. Para o site, criar somente contadores diários first-party por evento, página e bike, atrás de repositório/Edge Function. Coleta desligada por padrão em cliente e servidor.                                                                                                                                                |
| IA          | Nenhum modelo, prompt, grounding ou automação muda. Recomendações são lidas do resultado já gravado pelo motor atual; não são recalculadas.                                                                                                                                                                                                                                       |
| Segurança   | Sem cookie, sessão, fingerprint, user-agent, referrer, UTM, query string ou PII. O IP recebido pela infraestrutura é transformado imediatamente em chave HMAC efêmera apenas para limite antiabuso; o IP bruto não é armazenado nem entra nas métricas. Tabela com RLS e grants apenas para `service_role`; escrita por RPC validada; leitura continua na action Admin existente. |
| UX          | Funil vertical com barras proporcionais, quantidade, avanço contra a etapa anterior, perda e conversão global. Tabelas com cabeçalhos, estados vazios e drill-down acessível por botão.                                                                                                                                                                                           |
| CX          | Explicar que contagens não são pessoas únicas, vendas ou histórico retroativo. Falha de analytics nunca interrompe navegação nem o link afiliado.                                                                                                                                                                                                                                 |
| Growth      | Separar recomendações, aberturas de detalhe e cliques em oferta. O detalhamento por bike mostra as páginas de origem sem bloquear/redirecionar Mercado Livre.                                                                                                                                                                                                                     |
| PMO/QA      | Testes de contrato, minimização, funil, agregação, navegação e regressão; `pnpm validate` antes do handoff. Migration/deploy/publicação ficam bloqueados até autorização específica.                                                                                                                                                                                              |

Decisão: **prosseguir localmente, condicionado aos controles e testes acima**.

## Escopo e definições

- `Conversão global do Quiz`: resultados exibidos / visitas à página do Quiz no período.
- `Avanço da etapa`: total da etapa seguinte / total da etapa atual.
- `Recomendação`: bike principal ou alternativa já persistida em `quiz_leads` para um Quiz concluído.
- `Abertura da bike`: clique em link interno canônico `/radar/{bike_id}`.
- `Clique em oferta`: acionamento de link afiliado, mantido direto e não bloqueante; não confirma compra.
- `Origem do clique`: pathname público da página onde ocorreu a ação; query e hash nunca são armazenados.
- `Página visualizada`: renderização/navegação para um pathname público. Não representa pessoa ou sessão única.

O histórico de recomendações pode ser consultado imediatamente porque os campos já existem. Pageviews e cliques sitewide só passam a existir depois da ativação; não serão inventados retroativamente.

## Dados e privacidade

A tabela agregada diária guarda somente `day`, `event_name`, `source_path`, `target_path`, `bike_id`, `position` e `event_count`. Não há linha por visitante. A Edge Function pública aceita apenas payload fechado, origem de produção, rotas canônicas, até 512 bytes e rate limit por chave HMAC transitória; o IP bruto não é colocado no mapa, log ou banco. O cliente fica ativo por padrão apenas em build de produção e pode ser explicitamente desligado com `VITE_SITE_ANALYTICS_ENABLED=false`; preview e desenvolvimento não gravam porque o cliente aceita somente o domínio público. A gravação continua condicionada a `SITE_ANALYTICS_ENABLED=true` no servidor, que é o kill switch operacional imediato.

Trade-off aceito: sem identificador não há usuários únicos, deduplicação entre recargas nem jornada individual. O endpoint público também está sujeito a bloqueadores, bots e requisições forjadas; portanto os totais são direcionais, não prova de pessoa ou venda. Isso reduz precisão de atribuição, mas atende às perguntas pedidas sem criar perfil de visitante.

## Critérios de aceite

1. O funil mostra todas as sete perguntas, avanço por etapa, perdas e conversão global sem divisão por zero.
2. O ranking de recomendações distingue principal e alternativa e usa apenas Quiz concluído.
3. O ranking sitewide distingue abertura de detalhe e clique em oferta; ao expandir uma bike, mostra páginas de origem.
4. Pageviews têm ranking próprio e cobertura explícita a partir da ativação.
5. Nenhum payload ou retorno novo contém PII, URL completa, query, hash ou identificador de visitante.
6. Links afiliados mantêm `href` direto e a coleta é fire-and-forget.
7. Cliente inerte fora dos hosts públicos e servidor fail-closed enquanto `SITE_ANALYTICS_ENABLED` não for exatamente `true`; Admin indisponível de forma parcial quando a migration ainda não existe, sem derrubar métricas do Quiz.
8. Testes direcionados e `pnpm validate` aprovados.

## Release e rollback

Ordem de ativação: aplicar a migration aditiva, implantar `site-analytics` e `editorial-admin` com o servidor desligado, publicar o cliente e só então configurar `SITE_ANALYTICS_ENABLED=true`. O cliente em build de produção emite apenas nos hosts canônicos; o servidor desligado responde `204` antes de HMAC, rate limit ou RPC. Rollback imediato: desligar `SITE_ANALYTICS_ENABLED`; para também remover os POSTs no-op, publicar o cliente com `VITE_SITE_ANALYTICS_ENABLED=false` quando o ambiente suportar essa variável ou reverter o cliente. A tabela privada deve ser preservada para não destruir histórico. Não é necessário alterar Quiz, CRM, sync, Radar, links afiliados ou dados existentes.

## Revisão posterior

| Perspectiva | Veredito | Evidência e risco residual |
| ----------- | -------- | ------------------------- |
| Produto | **Pass** | As três perguntas de negócio estão separadas e nenhuma funcionalidade existente de Quiz, CRM ou sync foi reaberta. |
| CTO | **Pass** | Mudança aditiva, writer único, leitura agregada, falha parcial e kill switch autoritativo no servidor. O cliente só emite nos hosts canônicos; desligá-lo também exige novo build quando o ambiente não fornece a variável pública. O rate limit continua local por instância e a allowlist deve acompanhar novas rotas. |
| IA | **Pass** (não regressão); modelos/prompts/grounding **N/A** | A tela lê recomendações persistidas; não recalcula nem altera IA, Lucas SDR ou automações. |
| Segurança | **Pass** | Allowlist canônica, payload fechado, RLS/grants privados, HMAC efêmero e ausência de PII. Como todo endpoint público, eventos forjados ainda podem gerar ruído direcional. |
| UX | **Pass** | Smoke em desktop e 390×844; funil legível, troca de período anunciada, tabela com caption e drill-down por botão com `aria-expanded`. |
| CX | **Pass** | Erro, ausência de cobertura e zero observado são estados diferentes; falha de métricas não interrompe Quiz ou navegação. |
| Growth | **Pass** | Recomendação, abertura de detalhe, clique em oferta e origem interna estão separados; clique não é tratado como compra. |
| PMO/QA | **Pass local** | 25 testes direcionados, 59 testes do gate, typecheck, builds cliente/SSR/Nitro, SQL isolado e `git diff --check` aprovados. Produção permanece **NO-GO** sem autorização. |

Não há `Fail` nem risco material aberto para o handoff local. Métricas sitewide são eventos agregados direcionais, não pessoas ou sessões; podem variar por recarga, bloqueadores, rede, robôs e abuso. O funil usa coorte de primeira entrada, enquanto recomendações e cliques usam o momento do evento. A UI explicita essa diferença e não cruza as fontes como se fossem o mesmo universo.

Evidências de validação:

- migration verificada em PostgreSQL isolado, incluindo schema, agregações, validações, RLS e grants;
- endpoint coberto para flag desligada, sucesso, origem/método/content-type, JSON e campos inválidos, limites de corpo, rate limit e falha do RPC;
- smoke visual local em desktop e viewport 390×844, incluindo expansão de uma bike e leitura das páginas de origem;
- na etapa de validação local, nenhuma migration, função, flag, publicação ou deploy havia sido executado em produção e nenhum crédito do Lovable havia sido consumido.

## Liberação em produção — 08/10/2026

Publicação autorizada e concluída no mesmo projeto Lovable e no domínio `vitalemobilidade.com`, a partir do merge `4217d9e93feee01e9d941fb7aad050542703d9a9`. O backup diário restaurável mais recente antes da mudança era de 08/10/2026 às 04:52:07 UTC.

- aplicada somente a migration `20261008160000_admin_analytics_v2.sql`; o ledger Cloud correspondente ficou em `drizzle/migrations/0005_admin_analytics_v2.sql`;
- confirmados RLS ativo, ausência de policies públicas e grants das tabela/RPCs apenas para `service_role`;
- implantadas somente as funções `site-analytics` e `editorial-admin`;
- com `SITE_ANALYTICS_ENABLED` desligada, quatro requests de smoke retornaram `204` e a tabela permaneceu com zero linhas;
- as rotas `/`, `/radar`, `/quiz`, `/privacidade` e `/admin/growth` responderam `200` no domínio publicado;
- `SITE_ANALYTICS_ENABLED=true` foi configurada somente depois desses controles;
- o smoke ativo gerou exatamente duas linhas agregadas em 08/10/2026: uma `page_view` de `/` e um `bike_click` interno de `/` para `/radar/v9_pro`, ambas com `event_count = 1`; nenhum link afiliado foi acionado;
- inspeção confirmou ausência de IP, e-mail, identificador de visitante, query, hash ou referrer nas linhas agregadas;
- a atualização automática e fora de escopo das dependências TanStack feita durante a operação foi revertida antes da publicação pela PR #16; a versão publicada preserva as dependências anteriores;
- a matriz da ativação cliente, 12 testes direcionados, 59 testes do gate, typecheck e build passaram antes do merge final;
- não houve sync, lead, CRM, e-mail, WhatsApp ou geração de conteúdo/IA.

O Lovable confirmou a publicação, mas não expôs identificador do deployment. O smoke autenticado visual do conteúdo de `/admin/growth` permanece como aceite operacional do responsável, porque a sessão disponível para automação não tinha credenciais da equipe. A rota respondeu `200`, o backend agregado está ativo e o build contém os três blocos novos. Rollback imediato continua sendo `SITE_ANALYTICS_ENABLED=false`; a tabela deve ser preservada.
