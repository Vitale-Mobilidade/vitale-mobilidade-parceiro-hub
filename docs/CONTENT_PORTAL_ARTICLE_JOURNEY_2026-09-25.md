# Portal editorial e jornada do artigo — 25/09/2026

## Revisão pré-implementação

Classificação: **estrutural**. Muda descoberta de conteúdo, links internos para Radar/Quiz e a ordem comercial dentro do artigo; afeta SEO, Radar e Quiz. Não altera tabelas, writers, conteúdo persistido nem URLs afiliadas.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Conteúdos se torna entrada editorial e artigo conduz à Bike antes da compra. | Criar outra vitrine comercial dentro do artigo. | Bike canônica no Radar. | Prosseguir; oferta final permanece no detalhe da Bike. |
| CTO | Composição SSR a partir do índice publicado e catálogo existentes. | Aumentar peso ou fazer consulta por card. | Reutilizar loaders atuais, sem nova RPC. | Prosseguir com dados já carregados. |
| IA | Nenhum conteúdo será gerado ou inferido. | Pareceres editoriais inventados. | Usar somente relações e texto publicados. | Prosseguir sem IA. |
| Segurança | Links internos e dados públicos. | Expor rascunhos ou URL não validada. | Continuar usando `getPublishedArticles` e IDs do catálogo. | Prosseguir. |
| UX/UI | Destaque, trilhas e lateral contextual em desktop; ordem clara no mobile. | Lateral roubar espaço do texto; CTA duplicado. | Layout responsivo, leitura linear e alvos acessíveis. | Prosseguir com lateral não sticky no mobile. |
| CX/Operação | Relações existentes ganham visibilidade. | Card vazio ou relação errada sem curadoria. | Fallback apenas para itens publicados. | Prosseguir; não criar rotina editorial nova. |
| Growth/CRO | Mais links internos contextuais, sem salto de comparativo ao afiliado. | Canibalização ou afirmação de ranking sem dados. | Canônicos/metadados atuais preservados. | Prosseguir; “destaque” editorial, não popularidade medida. |
| PMO/QA | Dois templates públicos e preview administrativo do artigo compartilham componente. | Quebra de preview/SSR. | Testes de seleção, links e build; smoke de rotas. | Prosseguir após gate. |

**Conflito e decisão:** o usuário quer mais dinamismo, mas há poucos artigos publicados e nenhuma métrica confiável de popularidade. O destaque será calculado de modo determinístico a partir de publicação/relacionamentos reais, sem alegar “mais acessados”. A lateral mostrará apenas artigos e Bikes efetivamente relacionados; o Quiz pode aparecer como próximo passo contextual. O comparativo aponta às páginas das Bikes no Radar; o bloco de Radar aparece após a análise, e o artigo não contém CTA direto ao Mercado Livre. O link de compra permanece no detalhe canônico da Bike.

**Escopo:** índice `/conteudos` com destaques e trilhas de leitura; artigo com largura de leitura, lateral de relacionados e jornada ordenada comparativo → Bikes → Radar → Quiz; dados SSR existentes e links internos. **Fora de escopo:** nova tabela Content Graph, ranking por acessos, alteração de conteúdo editorial, criação automática de artigos, disparos ou alteração de afiliados. **Aceite:** somente conteúdo publicado; artigos relacionados e bikes reais; CTA de comparativo para Radar; nenhuma compra direta no artigo; mobile sem overflow; canonical/JSON-LD preservados; `pnpm validate` verde. **Rollback:** restaurar o commit anterior de frontend; banco e conteúdo persistido intactos.

## Revisão pós-implementação

| Perspectiva | Estado | Evidência |
| --- | --- | --- |
| Produto | Pass | Artigo conduz comparativo → páginas das Bikes → Radar/Quiz; link de compra permanece no detalhe da Bike. |
| CTO | Pass | Composição usa os mesmos loaders SSR do índice publicado e catálogo; sem nova RPC, migration ou writer. |
| IA | N/A | Nenhum modelo, prompt ou texto gerado foi alterado. |
| Segurança | Pass | Índice continua vindo da RPC pública de artigos publicados; links de Bike resolvidos pelo catálogo validado. |
| UX/UI | Pass | Portal com destaque, busca e trilhas; artigo com lateral em desktop e fluxo linear em mobile. Inspeção 1440px/390px, sem overflow horizontal. |
| CX/Operação | Pass | Relações explícitas têm prioridade; se não houver, os demais artigos publicados aparecem como “Mais conteúdos”, sem atribuir relação inexistente. |
| Growth/CRO | Pass | Metadados e canônicos não mudaram; comparativo não liga diretamente ao Mercado Livre. CTA afiliado existente no Radar não foi alterado. |
| PMO/QA | Pass | Typecheck, 10 testes editoriais direcionados e `pnpm validate` passaram; após integrar a atualização paralela das Ferramentas, o gate passou com 47 testes de regressão + build. Smoke local confirmou SSR do índice/detalhe e links para `/radar/{bikeId}`. |

**Desvio controlado:** com apenas dois artigos publicados, pode não existir relação editorial explícita entre eles. Nessa situação, a lateral e o fim do artigo mostram o outro item como “Mais conteúdos”/“Explore outros conteúdos”, sem chamá-lo de relacionado. Os destaques são heurística editorial baseada em quantidade de Bikes vinculadas e data de publicação; não representam acessos reais nem recomendação automatizada.

**Resultado:** GO para publicação deste frontend, condicionada à conferência do diff aplicado no projeto Lovable e ao smoke do domínio após deploy. Risco residual: performance e conversão ainda precisam ser medidos em produção; nenhuma melhora de ranking SEO foi afirmada. Rollback pela versão publicada anterior `9ca39e5cdd92d45813db1b5299fd42365452a4ff`, sem reversão de dados.
