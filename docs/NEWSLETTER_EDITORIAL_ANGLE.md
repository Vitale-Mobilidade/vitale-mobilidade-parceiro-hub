# Ângulo editorial da newsletter

Classificação estrutural: contexto e comportamento de IA. Objetivo: impedir que fontes novas sejam costuradas com o mesmo resumo sobre banco, bateria e rotina. Não modificar seleção, factualidade, revisão independente ou orçamento.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Variar a experiência entre edições; prompt não garante qualidade; depender da aprovação real; prosseguir com aprovação obrigatória.                       |
| CTO         | Alterar apenas contexto do escritor; evitar contrato e chamada extra; manter schema e quatro chamadas/120s; prosseguir.                                   |
| IA          | Escolher foco único e descartar plano rejeitado; risco de trocar sinônimos; manter histórico e revisor; prosseguir com orientação concreta de composição. |
| Segurança   | Fontes continuam dados não confiáveis; nenhum secret/PII novo; manter isolamento e validação; prosseguir.                                                 |
| UX          | Renderização preservada; risco de intro genérica; critérios editoriais existentes; prosseguir.                                                            |
| CX          | Manter rascunho anterior e envio pausado até aprovação; depender de CAS/habilitação oficiais; prosseguir condicionado.                                    |
| Growth      | Evitar fadiga de leitura; não mudar links nem fontes; evidência real da edição; prosseguir.                                                               |
| PMO         | Correção pequena testável sem geração adicional de planejamento; teste dirigido e validate; aprovação real antes de agendar; prosseguir condicionado.     |

Trade-off: acrescentar outra chamada de planejamento aumentaria custo e tempo sem garantir aprovação. Decisão: plano explícito no contexto da chamada existente e orientação específica de reparo, sem alterar o revisor. Não tratar sucesso de testes de prompt como aprovação da edição.

Escopo: composição de assunto/headline/abertura com um foco escolhido das fontes, evitando enumeração e estrutura anterior; rejeição de abertura exige abandonar o plano anterior. Aceite: testes, validate e execução real aprovada. Rollback: reverter commit; preservar draft revision1 e enabledfalse até aprovação. Publicação segue autorização de integração desta thread; agendamento autorizado para 12/10 às06:30 BRT.

## Revisão técnica posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Orientação de composição distinta; aprovação operacional continua pendente da execução real. |
| CTO | Pass | Sem contrato, API extra ou aumento de quatro chamadas/120s. |
| IA | Pass | Histórico chega a escritor/reparo/revisor; revisor independente continua podendo rejeitar. Vinte testes dirigidos passaram. |
| Segurança | Pass | Nenhuma alteração de credenciais, dados, permissões ou isolamento de fontes. |
| UX | Pass | Renderer e limites da abertura preservados. |
| CX | Pass | Nenhuma habilitação ou substituição de draft feita antes de aprovação. |
| Growth | Pass | Seleção, URLs e memória de conteúdo/modelos preservadas. |
| PMO | Pass | pnpm validate passou: tipos, 61 testes e build; escopo restrito e rollback definido. |

Condição de release técnico atendida. Entrega da edição/agendamento ainda pendente; testes não provam comportamento do modelo. Custo da última execução: 2,7 créditos Lovable, quatro chamadas reais e rejeição mantida. Próxima execução somente com esta orientação implantada.
