# Tráfego público diário no Growth

## Revisão prévia

Mudança estrutural pela consulta Supabase e pelo contrato da Edge Function administrativa. Base operacional `origin/main` em `96bb571`. O gráfico usa `page_view` de `site_analytics_daily`, com contadores agregados por dia em São Paulo e retenção móvel de até 366 datas. O coletor já aceita apenas uma lista de páginas públicas nos domínios oficiais.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | A tendência diária passa a abrir o Growth | Confundir acessos com pessoas ou visitas do Lovable | Rótulo de visualizações públicas | Prosseguir com a definição visível |
| CTO e Arquitetura | Uma RPC aditiva, com datas indexadas e sem mudança de schema de tabelas | Volume em janelas longas e rollout incompleto | Limite de 366 dias por janela, isolamento do novo resultado | Prosseguir com agregação no banco e compatibilidade com a Edge anterior |
| IA e Agent Engineering | Nenhum agente ou conteúdo gerado afetado | Nenhum identificado | Nenhuma | N/A |
| Segurança | Novos agregados atrás da ação Growth existente | Acesso a dados internos ou exposição por RPC | Gate Admin, RPC invoker e EXECUTE só para service_role | Prosseguir sem dados pessoais e com exclusão defensiva de rotas privadas |
| UX/UI | Gráfico, números e detalhe diário | Sobreposição em mobile e comparação só por cor | Rótulos, linhas distinguíveis, estados e tabela sob demanda | Prosseguir com revisão desktop/mobile |
| CX e Operação | Comparação pelo seletor atual | Confundir período parcial, histórico ausente e zero | Datas explícitas e estado próprio da série | Prosseguir sem exigir sincronização manual |
| Growth e CRO | Dias equivalentes e variação do volume | Comparar dia em andamento a dia fechado, ou misturar fontes e conceitos | Mesma coleta nos dois recortes, omitir hoje da variação | Prosseguir sem estimar sessões, humanos ou vendas |
| PMO e QA | SQL, contrato e UI com release coordenado | Contagem errada no limite da janela ou regressão nos indicadores | Fixtures de borda/permissões, testes da tela e validate | Prosseguir localmente. Publicação condicionada à autorização e smoke autenticado |

## Decisão consolidada

- Mostrar o período selecionado e o intervalo imediatamente anterior de mesma duração, alinhados pela posição do dia. Exibir os totais de cada janela quando houver cobertura da janela inteira. Se hoje estiver incluído, marcar o total selecionado como parcial e calcular variação somente para os pares de dias fechados. Exibir ausência de base quando algum par não tiver cobertura ou a base for zero.
- Preencher lacunas entre o primeiro e o último registro público retido com zero. Fora desses limites usar ausência de dados. Esta heurística não identifica falhas de coleta dentro do intervalo nem confirma o horário de início da coleta no primeiro dia.
- Usar os contadores existentes para disponibilizar histórico imediatamente após release. Isso preserva a comparabilidade da coleta, com cobertura limitada às rotas instrumentadas. A contagem exclui navegação administrativa. Pessoas da equipe em páginas públicas podem entrar na contagem, assim como automação que execute a coleta. Sessões, visitantes únicos, classificação de bots, novas rotas de tracking e integração com Lovable Analytics ficam fora do escopo.
- Aceite local com datas contíguas, exclusão de admin e áreas privadas, estados distintos de cobertura e erro, variação sem hoje e leitura dos valores diários por teclado. Publicar em ordem RPC, Edge e interface. Rollback pela versão anterior da UI e da Edge, deixando a RPC privada sem uso. Nenhuma alteração de dados ou política de tabela é necessária.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | O painel abre com o gráfico e os totais comparativos de visualizações públicas |
| CTO e Arquitetura | Pass | A RPC lê contadores diários e devolve no máximo 366 pares. SQL principal e espelho executados em PostgreSQL local. Typecheck e build SSR passaram |
| IA e Agent Engineering | N/A | A mudança não envolve conteúdo gerado, prompts ou agentes |
| Segurança | Pass | Gate Admin preservado. PostgreSQL confirmou execução via service_role e ausência de EXECUTE para anon/authenticated. Fixtures de admin, painel e conta foram excluídas |
| UX/UI | Pass | Gráfico validado em Chrome a 1440 e 390 px. Linhas distinguíveis, barras no período de um dia e valores acessíveis por teclado |
| CX e Operação | Pass | Filtros Hoje, Ontem, 7 dias, 30 dias e Personalizado conferidos no painel local com API simulada. Ausência de cobertura, fonte indisponível e zero testados separadamente |
| Growth e CRO | Pass | SQL confirmou comparação de intervalos de mesma duração. Testes confirmaram que a variação exclui hoje e o dia correspondente anterior. A coleta e os cliques afiliados não foram modificados |
| PMO e QA | Pass | Lint do componente, 48 testes direcionados, `pnpm validate` com 69 testes e build, fixtures SQL e smoke local da UI |

A prévia usa dados fictícios e o checkout de trabalho parte da branch principal operacional. Nenhuma leitura de números de produção foi necessária nesta etapa. O release exige autorização para aplicar a consulta privada no Supabase integrado ao Lovable, integrar o código, atualizar `editorial-admin`, publicar a interface e verificar o painel autenticado. Custo externo estimado baixo pela implantação no Lovable. O rollback consiste em restaurar a versão anterior da interface e da Edge, mantendo a consulta aditiva privada e sem uso.
