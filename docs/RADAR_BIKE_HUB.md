# Página oficial da Bike no Radar

Estado: decisão pré-implementação, 25/09/2026. Rota canônica: `/radar/$bikeId`.

## Decisão consolidada

Classificação: **estrutural**, pois combina Radar, SEO e relações editoriais. A página responde, nesta ordem: qual é a bike, quanto custa a oferta atual, como o preço evoluiu, para que serve, como se compara a outro modelo e quais conteúdos reais ajudam a decidir.

Escopo deste corte: completar a descrição e ficha vindas da Bike existente; oferecer comparação lado a lado dentro do detalhe com outra Bike do catálogo público; mostrar até seis artigos e doze vídeos ligados por `bike_id`; ampliar os metadados SSR e JSON-LD da URL canônica; preservar banners compartilhados do Quiz e do grupo. O pin do preço de hoje usa a bicicleta verde fornecida pelo responsável, com valor e rótulo visíveis, sem deslocar a posição proporcional na escala.

Critérios: um H1, canonical `/radar/$bikeId`, `Product` sem avaliação inventada, oferta no JSON-LD apenas quando preço e URL válidos vierem da mesma oferta, breadcrumb, seções condicionais, comparação com valores reais e rótulo de dado ausente. A rota antiga `/bikes/$slug` permanece 301 para esta página. A comparação fica na própria página, sem criar `/comparar`.

Dependências: leitura pública existente de Bike/oferta e o índice editorial publicado; a projeção de `relatedBikeIds` foi preparada em migration separada. A página deve funcionar também com o índice antigo, que ainda só expõe a Bike principal.

Fora do escopo: alterar o Quiz, gerar conteúdo por IA, inferir testes/opiniões, editar escritores de dados, prometer ranking ou coletar novos dados pessoais.

Rollback: reverter os componentes e o `head` desta rota; restaurar a RPC anterior se a projeção editorial tiver sido aplicada. Preços, ofertas e artigos persistidos não são apagados.

## Revisão antes do código

| Perspectiva | Impacto, risco e dependência | Recomendação |
| --- | --- | --- |
| Produto | Reúne avaliação e decisão na Bike oficial; risco de excesso de informação acima do Radar | Prosseguir com preço e histórico na primeira dobra |
| Arquitetura | Acrescenta leitura do catálogo público ao loader SSR; risco de latência e fontes divergentes | Prosseguir com fallback isolado e sem nova tabela de Bike |
| IA | Conteúdo pode ser consumido por buscadores com IA; risco de afirmação sem fonte | Prosseguir só com campos e artigos publicados, sem síntese gerada |
| Segurança | JSON-LD e tabela expõem apenas dados já públicos; links externos devem ser validados | Prosseguir preservando leitura por RPC pública e URL afiliada direta |
| UX/UI | Tabela precisa funcionar em tela pequena e ter atributos comparáveis | Prosseguir com tabela semântica, seletor acessível e estado vazio |
| CX/Operação | Descrição e oferta devem acompanhar a fonte existente | Prosseguir sem nova rotina de curadoria |
| Growth/CRO | URL única concentra intenção por modelo; risco de canonical ou dados estruturados contraditórios | Prosseguir com preço só da oferta atual e sem alegar resultado de ranking |
| PMO/QA | Mudança atravessa dados e SEO; publicação depende de gate proporcional | Implementar localmente, revisar diff e registrar verificação pendente |

Conflito: uma tabela comparativa útil pede preço da outra Bike, mas o histórico do Radar não substitui a oferta atual. A tabela usará o catálogo público de ofertas; quando não houver oferta, exibirá “Sem oferta atual”.

## Revisão após a implementação local

| Perspectiva | Estado | Evidência e limite |
| --- | --- | --- |
| Produto | Pass | Preço e Radar continuam antes da ficha, comparação e conteúdos. |
| Arquitetura | Pass | Loader reaproveita as RPCs de histórico, catálogo e índice editorial; catálogo tem cache existente. |
| IA | N/A | Nenhum texto é gerado ou resumido por IA. |
| Segurança | Pass local | `Product.offers` só recebe preço e URL `meli.la` da oferta atual válida; nenhuma tabela privada foi exposta. |
| UX/UI | Pass local | Tabela semântica, seletor rotulado, conteúdo opcional e rolagem acessível no celular; inspeção visual publicada pendente. |
| CX/Operação | Pass | Campos continuam sendo mantidos no fluxo de dados atual. |
| Growth/CRO | Pass local | Canonical único, breadcrumbs e `Product` SSR; artigos/vídeos possuem links contextuais. Resultado em busca ainda não mensurado. |
| PMO/QA | Fail para release | O responsável pediu testes somente quando solicitar; verificação visual e `pnpm validate` não foram executados. |

Resultado: código local preparado. Publicação permanece bloqueada pelo gate de verificação e pela autorização específica de deploy/migration.
