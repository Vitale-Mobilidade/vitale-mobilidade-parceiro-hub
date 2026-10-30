# Relevância do Radar por cliques para ofertas — 30/10/2026

## Decisão e classificação

Pedido aprovado pelo responsável nesta conversa: “Mais relevantes” passa a ordenar por cliques para ofertas nos últimos 30 dias. Classificação **estrutural**, por envolver Radar, leitura agregada do Supabase e métricas de afiliados. Base operacional: `ce301e8`, no repositório conectado ao mesmo projeto Lovable. Implementação local; esta decisão não autoriza aplicar migration, merge ou publicação.

## Revisão pré-implementação — oito perspectivas

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Relevância passa a representar intenção de acessar ofertas. | Confundir popularidade com preço bom ou venda. | Definição aprovada de clique; manter classificações de preço separadas. | Prosseguir com a regra solicitada e desempate alfabético. |
| CTO e Arquitetura | RPC agregada e composição server-side para Radar/Home. | Consulta pesada ou dependência de analytics derrubar catálogo. | Índices existentes; RPC fixa, sem parâmetros; falha isolada. | Prosseguir sem alterar RPCs do catálogo, sitemap ou writers. |
| IA e Agent Engineering | Destaques passam a derivar de eventos reais. | Somar eventos antigos do chat/popup sobrepostos. | Mesmo contrato usado na simulação aceita pelo responsável. | Prosseguir sem alterar IA; excluir contagens adicionais do chat/popup. |
| Segurança | Nova leitura pública de prioridade. | Expor eventos pessoais ou abrir tabelas de leads. | SECURITY DEFINER com search_path vazio e saída mínima. | Prosseguir: publicar apenas bike_id/rank, nunca eventos, leads ou contagens privadas. |
| UX/UI | Ordem inicial e destaque refletem cliques recentes. | Rótulo ambíguo ou fallback silencioso para outro critério. | Explicação visível de 30 dias e estado de indisponibilidade. | Prosseguir; empate/ausência de cliques em A–Z. |
| CX e Operação | Mudança automática a cada leitura, sem planilha nova. | Supor cobertura anterior ao início da coleta. | Site agregado desde 08/10; Quiz disponível antes disso. | Prosseguir sem backfill inventado, sync ou edição de dados. |
| Growth e CRO | Mesma definição no catálogo, destaque e cards da Home. | Duplicar Quiz ou tornar clique dependente de analytics. | Usar eventos históricos do Quiz e excluir os espelhos do site. | Prosseguir; preservar destinos e eventos de afiliados. |
| PMO e QA | Mudança verificável com SQL e fixtures offline. | Publicar frontend antes da RPC ou chamar build de deploy. | Testes direcionados, gate pnpm validate e aprovação de release. | Prosseguir localmente; aplicar RPC antes do frontend quando autorizado. |

## Conflitos, trade-offs e decisão consolidada

- A relevância anterior favorecia preço/histórico; a decisão do responsável substitui esse critério por cliques. As ordenações de preço, queda e oportunidade permanecem próprias.
- Histórico acumulado favorece modelos antigos; o responsável escolheu uma janela móvel de **30 dias civis, incluindo hoje**, em `America/Sao_Paulo` (hoje menos 29 dias, desde 00h local até a consulta).
- Soma: `quiz_events` com `buy_button_clicked`/`secondary_option_clicked`, por `field_value`, mais `site_analytics_daily.affiliate_click` fora de `/quiz` e `/escolherbike` e fora das posições `quiz_primary`/`quiz_secondary`. Não somar novamente popup/chat. São eventos, não pessoas únicas ou vendas.
- A coleta do site começou em 08/10/2026. A janela não inventa os dias anteriores, não normaliza exposição e não usa procura como substituto de clique de oferta.
- Segurança versus transparência: contagens ficam no banco; a RPC pública retorna apenas identidade e posição por volume. Empates têm o mesmo rank e são resolvidos pelo nome no app.
- Escopo: nova RPC somente leitura; ranking SSR compartilhado por catálogo, destaque e cards da Home; explicação no Radar; testes e documentação. Não alterar tabela, RLS existente, preço, link, tracking, Quiz, newsletter, sitemap ou rotas.
- Falha de ranking: manter catálogo navegável, usar A–Z e explicar a indisponibilidade; nunca voltar silenciosamente à relevância de preço. Sem cliques, usar A–Z.
- Critérios de aceite: janela em fuso local, sem duplicidade, somente ofertas atuais na saída pública; contagem maior antes de menor independentemente de desconto; empates A–Z; nada pessoal serializado; falha isolada; outras ordenações preservadas; pnpm validate aprovado.
- Rollback: reverter o commit de frontend; a RPC nova pode permanecer inerte. Removê-la somente depois do rollback de frontend e com autorização. Nenhum dado precisa de reversão.

## Implementação e evidências

- Migration aditiva `20261030170000_radar_offer_click_relevance.sql`: única função `get_radar_offer_click_ranks_30d()`, estável, sem parâmetros, `SECURITY DEFINER`, `search_path=''`. Concessões somente de EXECUTE para anon/authenticated/service_role; nenhuma permissão de tabela modificada. Somente `bike_id` e `relevance_rank` são públicos.
- A saída filtra ofertas atuais pelo mesmo critério da RPC do catálogo: `is_current`, sem `ended_at`, preço positivo, link válido `meli.la`. Elegibilidade exclusiva do Quiz não restringe o Radar.
- `fetchRankedTrackerSplit` combina as duas leituras em paralelo e valida todos os ranks. Resposta inválida, parcial ou indisponível desativa o ranking inteiro; o catálogo segue disponível. Leitores de sitemap, newsletter e ferramentas continuam usando o catálogo sem analytics.
- `sortEntries('relevance')` usa o rank e nome. Preço, queda e oportunidade não foram alterados. Home e Radar consomem o mesmo contrato. Falha oculta o destaque e explica A–Z no catálogo.
- 35 testes direcionados aprovados: ranking, repositório, arquivos históricos, composição dos loaders Home/Radar e HTML SSR. O HTML já chega ordenado, com texto acessível de 30 dias e `aria-describedby`; não depende de segunda chamada no cliente.
- `bash scripts/test-radar-relevance-sql.sh`: aprovado com PostgreSQL 17 local descartável, fixtures sintéticas, Unix socket privado e TCP desabilitado. Exercita limite exato de 30 dias civis, mudança de timezone de sessão, eventos futuros/antigos, exclusão dos espelhos do Quiz e eventos adicionais, empate, zero cliques, ofertas encerradas/arquivadas/inseguras, permissão anon sem acesso a eventos e rollback da função. Nenhum dado de produção copiado para esse teste.
- EXPLAIN ANALYZE do SELECT da migration no banco integrado, **sem criar função ou escrever dados**: 27 bikes, 219,843 ms de execução e 33,390 ms de planejamento. Usa `quiz_events_admin_bike_metrics_idx` e índice existente de `site_analytics_daily`; não requer índice novo. É uma amostra, não benchmark de carga.
- ESLint direcionado aprovado nos nove arquivos TS/TSX afetados (regra de formatação desligada para preservar o estilo existente); `git diff --check` aprovado.
- `pnpm validate`: exit 0; typecheck, 66 testes do gate e build cliente/SSR. Avisos preexistentes de `inputValidator` depreciado e `vite-tsconfig-paths`; nenhum erro de compilação.

## Revisão pós-implementação — oito perspectivas

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Implementa exatamente a opção de cliques/30 dias aceita; mantém classificações de preço independentes. |
| CTO e Arquitetura | Pass | SSR e loaders compartilhados, duas leituras paralelas, falha isolada, consulta indexada; sem writer novo ou mudança no catálogo existente. |
| IA e Agent Engineering | Pass | Ranking determinístico por eventos; sem modelo pago, prompt novo ou contagem adicional de chat/popup. |
| Segurança | Pass | Fixtures exercitam EXECUTE público e proibição de ler eventos; contrato só identidade/rank, chave publicável no servidor e nenhum dado pessoal novo. |
| UX/UI | Pass | HTML SSR ordenado, explicação de 30 dias associada ao select e fallback A–Z anunciado; testes de renderização aprovados. |
| CX e Operação | Pass | Planilha, sync, CRM, alertas e newsletter não mudam; falha de analytics preserva catálogo. Cobertura parcial anterior a 08/10 registrada. |
| Growth e CRO | Pass | Sem alteração em href, captura ou eventos de clique; deduplicação do Quiz e consistência Home/destaque/lista testadas. |
| PMO e QA | Pass | SQL e rollback ensaiados com fixtures, 35 testes direcionados e gate pnpm validate aprovados; release permanece separado da implementação local. |

## Fechamento e release proposto

- **GO local / GO condicionado para produção**: implementação e documentação concluídas; falta autorização específica para aplicar a RPC, fazer merge e publicar o frontend no mesmo projeto Lovable.
- Mudanças de produção propostas: criar somente a RPC de leitura; integrar o PR; publicar o frontend e verificar Radar/Home sem acionar links de afiliado. Aplicar a RPC antes do frontend evita fallback durante a transição.
- Antes da aplicação autorizada, preservar referência do deployment vigente e backup recuperável de schema/permissões conforme guardrails. O ensaio desta migration e seu rollback já foram realizados no cluster local sintético; não houve restauração nem cópia de leads produtivos nesta task.
- Rollback de produto: voltar o frontend ao código anterior ao PR. A função aditiva pode permanecer sem uso e não modifica dados; eventual DROP fica para ação autorizada posterior. Base de código anterior: `ce301e89414cb032c2416400a7e071951154ef56`.
- Risco residual: ranking pode refletir cliques repetidos e exposição desigual; site sem dados anteriores a 08/10. São limites da métrica escolhida, não defeitos novos. Uma indisponibilidade usa A–Z explicitamente.
- Custo: implementação/testes locais sem créditos Lovable; inspeção SQL somente leitura. Release não demanda IA, geração, email ou WhatsApp. Publicação pela integração poderá estar sujeita à quota normal do projeto, sem uso de chat pago para editar código.
- Estado: pronto para revisão em branch `codex/radar-relevance-offer-clicks-30d`; nenhuma migration, merge ou publicação de produção executada.

## Entrega local e impedimento de envio

- Commit de implementação local: `75a9378`. O push da branch retornou HTTP 403 (`Permission denied` para o usuário configurado no Git). A alternativa pela integração GitHub também recusou `create_tree` com 403 (`Resource not accessible by integration`). Nenhuma branch ou PR remota foi criada; não repetir tentativas de escrita até corrigir a permissão da conexão.
- Patch consolidado disponibilizado no workspace de referência em `artifacts/radar-relevance-30d-2026-10-30.patch`, contendo somente o diff desta task, sem histórico Git ou `.env`. Aplica-se sobre `ce301e89414cb032c2416400a7e071951154ef56`.
- A limitação de envio não invalida os testes locais nem altera o status operacional do site. Para release, faltam uma conexão com escrita no repositório e autorização específica para migration/merge/publicação, conforme `AGENTS.md` e `docs/EXECUTION_GUARDRAILS.md` do workspace de referência.

## Ampliação autorizada — newsletter e criação editorial

O responsável autorizou publicar nesta conversa e determinou que relevância/30 dias oriente também o Radar das newsletters e os conteúdos, respeitando a rotação entre edições. A orientação atualiza a política anterior de usar analytics somente para medir distribuição: agora também prioriza a seleção **entre fontes e bikes pertinentes**, sem substituir fonte, evidência, QA ou oferta ativa. Nenhum envio, geração paga de artigo/newsletter ou regravação de edição enviada foi solicitado.

### Revisão prévia complementar

| Perspectiva | Impacto / risco / dependência | Recomendação |
| --- | --- | --- |
| Produto | Prioridade comum ao site e curadoria; popularidade não equivale a qualidade técnica/venda; preservar contexto e rotação. | Prosseguir com relevância dentro das regras editoriais. |
| CTO | Reusar RPC e comparador puro no frontend/newsletter/Edge; sem writer novo ou migração adicional. | Prosseguir com testes dos consumidores reais. |
| IA | Prioridade de audiência só entre bikes já associadas à fonte; não alterar tema, resolver ambiguidade por clique ou inventar fatos. | Prosseguir sem chamadas pagas nos testes e sem invalidar checkpoints históricos por oscilação do ranking. |
| Segurança | Reusar saída pública mínima; não inserir PII ou contagens privadas em prompts; nenhuma nova permissão. | Prosseguir. |
| UX | Seleções úteis com rotação; não prometer três quedas quando não há; preços e histórico continuam verificáveis. | Prosseguir preservando template e links. |
| CX | Histórico completo de fontes e janela de seis edições para modelos; risco de catálogo finito impedir toda edição. | Prosseguir: nunca repetir fonte; preferir modelos não recentes, depois os menos recentes antes de aplicar rank. |
| Growth | Destaque/Radar/fontes seguem interesse; risco de reforçar só líderes ou inserir modelo estranho à transcrição. | Prosseguir, rotação/contexto antes do rank e ranking antes de desconto/recência em candidatos equivalentes. |
| PMO/QA | Publicação autorizada; GitHub 403 exige caminho do projeto Lovable; custo de uma aplicação de patch precisa ser pequeno e controlado. | Prosseguir localmente; enviar só patch validado, usar modo normal, conferir diff e publicar escopo conhecido. |

Decisão consolidada: nova preparação de newsletter lê catálogo com rank; artigos/vídeos inéditos são priorizados por rank de bikes associadas mantendo diversidade; Radar seleciona somente quedas verificadas, com rotação e rank antes do tamanho da queda; destaque evita modelos já presentes na edição e prioriza rotação/rank. Fonte e vídeo subjacente nunca se repetem; a preferência de modelos em seis edições permite retorno do menos recente quando o catálogo acaba. A geração de artigos recebe prioridade de audiência somente nas bikes já associadas, sem mudar detecção de modelo principal nem impor pauta comercial. Falha de ranking impede nova preparação automática de newsletter em vez de fingir prioridade; edições já preparadas/sentidas não são reescritas. Critérios: contexto e fatos preservados, rotação vence popularidade, rank vence desconto entre candidatos equivalentes, fallback observado, testes direcionados e pnpm validate. Rollback: reverter este patch de consumidores junto do frontend; a RPC aditiva pode permanecer sem uso. O envio ao GitHub permanece negado; aplicação via integração Lovable é necessária por exclusão das alternativas de escrita, com gasto esperado pequeno e sem Max mode.

### Revisão posterior complementar

12 arquivos de teste direcionados passaram (226 casos), cobrindo newsletter, memória, simulação offline de vinte edições sucessivas, contrato editorial, execução da Edge Function real em VM sem rede, repositório e SSR. Teste adicional de famílias e regra histórica passou com 12 casos após a última mudança. `pnpm validate` final passou novamente com typecheck, 66 regressões e build. Nenhum teste acionou IA paga, email, WhatsApp ou clique afiliado.

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Política comum registrada em BIKE_RELEVANCE_POLICY e AGENTS; contexto e diversidade precedem popularidade. |
| CTO | Pass | Mesma RPC/comparador para SSR/newsletter/Edge; catálogo usado em validação de envio continua independente de analytics. |
| IA | Pass | Ranking nas bikes associadas e instrução final de geração/refinamento; teste da função real preserva FT03 quando o assunto a exige, mesmo com V9 Max mais popular. |
| Segurança | Pass | Somente rank agregado em contextos; sem PII, contagens privadas ou novos grants de tabela. |
| UX | Pass | Template preservado; cards de preço continuam factuais; famílias diferentes priorizadas quando há alternativas. |
| CX | Pass | Rotação em seis edições e retorno dos menos recentes; vinte edições simuladas sem repetir fontes; campanhas enviadas intocadas. |
| Growth | Pass | Clique real orienta candidatos pertinentes; não há alteração dos destinos afiliados ou falsa alegação de vendas. |
| PMO/QA | Pass | Gate final aprovado; patch único validado; autorização de publicação registrada e único impedimento de Git contornado pelo projeto conectado. |

Release autorizado: aplicar a RPC aditiva, o patch de consumidores frontend/server e os arquivos compartilhados da Edge `editorial-admin`, sem disparar geração/envio nem reescrever edições. Verificar a sincronização do código e a resposta anônima da RPC antes da publicação. Base restaurável de código: ce301e8. A ausência prévia da função nova foi verificada no banco integrado; nenhuma tabela/dado/RLS existente será alterada.
