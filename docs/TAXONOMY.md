# Taxonomia final e contrato de rotas — Vitale Mobilidade

Versão de 29/09/2026, conferida no domínio e no commit `75ef227bf02fbd9310a27ae1a1ba71566dece272`. Este documento substitui as listas históricas deste arquivo. A estrutura de URLs já está publicada; as correções de classificação de 22 artigos e a projeção `contentType` estão preparadas localmente e dependem de aplicação autorizada.

## 1. Estrutura pública estável

| URL canônica | Entidade e intenção | Estado |
| --- | --- | --- |
| `/` | Orientação para escolher transporte e navegar | Publicada |
| `/radar` | Descoberta e preços das Bikes | Publicada |
| `/radar/{bikeId}` | Página oficial da Bike: preço, histórico, ficha, comparação, vídeos e artigos | 30 páginas publicadas |
| `/quiz` | Recomendação conforme uso e orçamento | Publicada |
| `/ferramentas` | Hub de simulações de mobilidade | Publicada |
| `/ferramentas/{toolSlug}` | Simulação específica, ligada a Bikes compatíveis, Radar, Quiz e conteúdo real | Sete ferramentas publicadas |
| `/conteudos` | Hub editorial, busca e filtros | Publicada |
| `/conteudos/{articleSlug}` | Artigo com fonte em vídeo e relações editoriais | 101 páginas publicadas |
| `/grupodeofertas` | Redirecionamento para retenção via WhatsApp | Fora do sitemap |

Comparação entre Bikes integra o Radar. Não existe página pública independente `/comparar`. Busca, filtros e estados de comparação não criam URLs indexáveis: a canonical continua sendo a página base.

## 2. Identidade e aliases

A entidade central é `Bike`. `bikeId` é o identificador persistido e literal, incluindo underscores, como `v9_max`. A URL oficial vigente é `/radar/v9_max`. `articleSlug` tem identidade própria e não deriva do ID de Bike.

O mapa explícito dos 30 IDs, nomes, slugs legados e URLs está em [`bike-identity-map.json`](../artifacts/seo-final-2026-09-29/bike-identity-map.json). É um inventário do contrato publicado, sem renomear modelos. Uma futura mudança para slugs no Radar exige mapa e decisão específicos.

| Alias legado | Destino | HTTP |
| --- | --- | --- |
| `/acompanhamento` | `/radar` | 301 |
| `/acompanhamento/{bikeId}` | `/radar/{bikeId}` | 301 |
| `/calc` e `/calc/` | `/ferramentas` | 301 |
| `/bikes` | `/radar` | 301 |
| `/bikes/{slug}` | Radar da Bike resolvida pelo catálogo existente | 301; slug inexistente 404; falha de catálogo 503 |
| `/escolherbike` | `/` | 301; preserva os QR Codes antigos |

Query e UTM são preservadas nos redirects. Não atribuir significado comercial novo a IDs existentes. `/calculadoras/economia` é legado com `noindex`, fora do sitemap. Painel e `/admin/*` não são conteúdo público indexável.

## 3. Classificação editorial persistente

`editorial_articles.content_type` é a fonte da classificação. Título não determina categoria em tempo de renderização. O contrato validado do CMS contém seis valores; labels públicos e no editor vêm de `src/lib/editorial-taxonomy.ts`.

| Valor persistido | Label | Critério |
| --- | --- | --- |
| `test` | Testes e análises | Análise de um veículo e observações no uso ou teste |
| `comparison` | Comparativos | Duas ou mais opções/versões comparadas para decidir |
| `guide` | Guias de escolha | Critérios de compra e escolha, inclusive veículos usados |
| `tips` | Uso e cuidados | Manutenção, segurança prática, recarga e uso |
| `economy` | Custos e economia | Gastos de transporte, economia e rotina econômica |
| `other` | Outros conteúdos | Conteúdo que não corresponde às intenções acima |

Só categorias com artigos reais aparecem no filtro; não criar arquivos vazios ou páginas artificiais para combinações de filtros. A correção proposta para os 101 artigos resulta em: **66 testes e análises, 23 comparativos, 5 guias, 3 de uso e cuidados e 4 de custos e economia**. Os 22 deltas estão em [`taxonomy-changes.json`](../artifacts/seo-final-2026-09-29/taxonomy-changes.json). Produção ainda tem 88 `test` e 13 `comparison`.

## 4. Relações e fontes

- `primary_bike_id`: Bike principal quando o conteúdo tem uma principal real. Conteúdo geral ou veículo fora do catálogo pode não ter principal.
- `related_bike_ids`: outras Bikes de fato tratadas no artigo, com IDs válidos. Artigo comparativo pode conter mais de uma; não adicionar relações só por palavra-chave.
- `related_article_ids`: artigos publicados realmente complementares. Não criar relacionamento com drafts, IDs inexistentes ou com o próprio artigo.
- `video_id`: vídeo fonte identificado. Autoria do artigo é a organização editorial Vitale Mobilidade; a autoria pessoal não é deduzida do vídeo.
- `tool` nos blocos: slug de uma das sete ferramentas que ajuda a responder a intenção. Resultado depende das entradas e oferta real; não é previsão garantida.
- Preço, oferta e histórico vêm dos repositórios do Radar. O texto pode registrar contexto histórico com data, sem transformar um preço de vídeo em oferta atual.

A ida Article → Bike e a volta Bike → Article usam essas relações existentes. Se não houver relação verdadeira, a seção não ganha conteúdo inventado. Índice público entrega apenas publicados e indexáveis; fonte/transcrição privada e drafts não entram na hidratação.

## 5. Ferramentas oficiais

Registro único: `src/lib/mobility/tools-registry.ts`, alinhado com o contrato editorial.

| Grupo | Slugs |
| --- | --- |
| Economia | `carro-vs-bike`, `moto-vs-bike`, `aplicativos-vs-bike`, `transporte-publico-vs-bike` |
| Renda | `veiculo-alugado-vs-bike-propria`, `meta-entregas` |
| Tempo | `economia-de-tempo` |

## 6. Indexação e HTTP

Sitemap dinâmico: **143 URLs** (101 artigos, 30 Bikes e 12 páginas estruturais/ferramentas). Inclui só URLs canônicas, públicas, existentes e elegíveis. Aliases, painel, admin, filtros e rotas inexistentes ficam fora. Se uma fonte indispensável falhar, sitemap responde 503 em vez de publicar uma lista incompleta.

Documento válido: 200, conteúdo principal SSR, uma canonical e um H1. Documento inexistente: 404. Fonte editorial indisponível: 503, `no-store` e `Retry-After`; não converter indisponibilidade em artigo excluído. `robots.txt` permite crawlers públicos, incluindo Googlebot e OAI-SearchBot, e anuncia o sitemap. Esse acesso não garante indexação ou citação.

## 7. Regra para acrescentar conteúdo

1. Escolher a intenção e `content_type` no CMS antes da publicação. Usar a taxonomia existente.
2. Vincular fonte/transcrição, Bike principal e relacionadas reais, artigos e ferramenta úteis.
3. Revisar título/H1, resumo que responde à pergunta, condições das observações, limites, autoria organizacional, SEO title e descrição específicos, OG e slug único.
4. Conferir fonte de números/afirmações. Distinguir teste, cadastro, opinião e estimativa. Nunca fabricar data, medição ou experiência.
5. Rodar o QA editorial da revisão atual. No inventário legado, `foundation_required=false` para todos os 101 publicados; essa ausência de bloqueio não equivale a prova de fundamentação. Novos conteúdos devem usar o fluxo de fundação e aprovação de QA do CMS existente.
6. Gerar variantes de capa com `scripts/optimize-editorial-images.py` no fluxo local aprovado e atualizar o manifest. Imagem nova funciona com a original até isso acontecer; OG preserva a imagem original.
7. Confirmar HTML SSR, canonical, schema factual, links/relações, mobile e sitemap antes do release.

Adicionar novos artigos e Bikes estende o inventário, sem mudar URLs publicadas ou abrir categorias vazias. Ver a auditoria e os gates em [`SEO_FINAL_2026-09-29.md`](SEO_FINAL_2026-09-29.md).
