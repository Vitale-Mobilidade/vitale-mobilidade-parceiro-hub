# Identidade pública e descoberta da Vitale na busca

## Diagnóstico em 09/11/2026

- As capturas comparam duas consultas de marca. O Google exibiu o resultado orgânico e sitelinks da Vitale, e exibiu um AI Overview para a consulta Amancio Tech. A causa da diferença e a frequência de citações em perguntas sobre bicicletas elétricas continuam indeterminadas.
- A [Amancio Tech](https://amanciotech.com.br/) liga a home a uma [página Sobre](https://amanciotech.com.br/sobre/) que descreve o canal, o site, os tipos de conteúdo e os links de compra. Na Vitale, a apresentação estava espalhada entre home e rodapé, a autoria dos artigos apontava para a home e `/sobre` respondia 404. A página dedicada pode ajudar leitores e buscadores a associar marca, canal, fundador e acervo.
- A home, `/conteudos` e `/videos` responderam 200 com H1, canonical próprio e robots indexável no HTML inicial. Home e índice editorial também retornaram 200 com User-Agents simulados de Googlebot, bingbot e OAI-SearchBot. Um cliente Python com User-Agent padrão recebeu 403 nas páginas HTML. Os testes simulados confirmam apenas o acesso a partir da conexão usada na auditoria. O [robots.txt](https://vitalemobilidade.com/robots.txt) permite essas rotas e restringe `/painel-bikes`. A home já tem Organization, WebSite e perfis oficiais. O [sitemap](https://vitalemobilidade.com/sitemap.xml) continha 211 URLs (159 artigos e 39 Bikes), sem `/sobre` nem `/videos`. A contagem de URLs indexadas depende do Search Console.
- O site já tem material próprio utilizável como fonte. No [teste de 19 km com a V9 Max](https://vitalemobilidade.com/conteudos/v9-max-em-um-deslocamento-de-19-km-o-que-o-uso-intenso-indica-sobre-a-autonomia), o artigo separa distância percorrida, leitura do painel e projeção de autonomia. O [teste de subida da V8 Pro](https://vitalemobilidade.com/conteudos/bike-eletrica-v8-pro-1000w-sobe-ladeira) descreve as condições da subida e distingue observação de autonomia declarada. Os dois responderam 200 e estavam indexáveis na inspeção pública.
- O Google pode decidir que uma consulta se resolve melhor com os resultados clássicos. Para servir de fonte na resposta de IA, uma página precisa estar indexada e apta a exibir trecho. A documentação orienta investir em conteúdo original, links internos e SEO técnico. [Documentação de AI Overviews e AI Mode](https://developers.google.com/search/docs/appearance/ai-features) · [Guia de otimização](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). O OAI-SearchBot corresponde à busca do ChatGPT, com controle separado do GPTBot. [Documentação de rastreadores OpenAI](https://developers.openai.com/api/docs/bots).

## Revisão pré-implementação

Classificação **estrutural**, por afetar SEO e descoberta via IA. O objetivo é apresentar a identidade pública da Vitale e ligar a assinatura editorial a fontes e exemplos verificáveis. A implementação parte de `8f72eb9` da main sincronizada do projeto Lovable ativo, em branch local isolada. As áreas afetadas são home, rodapé B2C, autoria visível, JSON-LD institucional, rota e sitemap públicos.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Apresentar canal e site pelo trabalho que fazem | Diluir a jornada de escolha na home | Posicionamento e destinos canônicos atuais | Manter H1 e CTAs, esclarecer autoria e proposta na introdução |
| CTO e Arquitetura | Rota institucional com HTML SSR, metadata e sitemap | Novo fetch de dados ou conflito de identidade no JSON-LD | Layout B2C, gerador de rotas e helper de SEO existentes | Usar conteúdo estático e o mesmo ID da organização já emitido pelo root |
| IA e Agent Engineering | Expor amostras de experiência original com limites | Transformar inferência em medição ou atribuir artigos ao fundador | Testes publicados com fontes e assinatura organizacional | Usar exemplos verificados e separar observação, estimativa, ficha e preço |
| Segurança | Ligar perfis públicos confirmados | Divulgar dados privados, links incorretos ou scripts de terceiros | Perfis oficiais existentes e fundador já identificado publicamente | Reutilizar esses dados e renderizar links HTML |
| UX/UI | Dar acesso à identidade e aos testes pelo rodapé e pela autoria | Sobrecarga visual na home ou navegação sem teclado | Tipografia e layout responsivo B2C | Usar estrutura simples com links visíveis e descritivos |
| CX e Operação | Explicar origem e limites de preços | Prometer verificação em tempo real ou adicionar rotinas manuais | Contrato público do Radar | Explicar preço registrado e confirmação no anúncio, sem novas rotinas |
| Growth e CRO | Tornar marca e conteúdo original encontráveis por links e sitemap | Confundir elegibilidade com citação ou alterar sinais de URLs existentes | Boas práticas oficiais e inspeção pública | Publicar um único destino institucional indexável e preservar canonicals atuais |
| PMO e QA | Entrega reversível por diff | Alterar o checkout de referência ou promover release sem revisão | Main do repositório ativo, validação e smoke SSR local | Isolar branch e verificar rota, identidade, links, sitemap e build |

**Trade-offs.** Uma apresentação institucional com exemplos reais oferece contexto que metadados isolados não oferecem. Para limitar regressão de conversão, manter a jornada e mudar apenas a apresentação na home. Incluir `/videos` no sitemap exigiria respeitar o noindex quando o catálogo falha ou está vazio, potencialmente adicionando uma dependência ao endpoint de sitemap. A rota de vídeos já é descoberta via links internos e permanece fora deste lote. Preservar a assinatura da organização evita confundir o fundador com autoria individual de todo o acervo.

**Decisão.** Criar `/sobre` com apresentação do canal, fundador, dois exemplos de teste, metodologia em linguagem concreta, perfis oficiais e explicação do Radar. Ligar a página pelo rodapé, assinatura dos artigos e sitemap. Alinhar apresentação da home e JSON-LD existente à identidade pública. O aceite exige HTTP 200, título e canonical próprios, conteúdo e links no HTML inicial, ID organizacional consistente, sitemap com uma entrada, testes dirigidos, `pnpm validate` e smoke HTTP. Este lote exclui reescrita ou geração em massa, alterações em robots, canonical de páginas existentes, dados, integrações, redirects e solicitações de indexação. O rollback consiste em reverter este diff e, após publicação, republicar a versão anterior do código.

## Revisão prévia da atualização solicitada

Classificação estrutural por afetar a apresentação institucional e a identidade no JSON-LD. O usuário pediu recuperar a trajetória de Lucas Vitale e retirar um parágrafo da página. A instrução mais recente mantém a assinatura atual dos artigos.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Dar destaque ao criador dentro da página institucional | Confundir o papel do criador com a assinatura do acervo | Instrução mais recente do responsável | Destacar Lucas no Sobre e preservar a assinatura da Vitale |
| CTO e Arquitetura | Referenciar a seção do fundador no JSON-LD | Criar destino duplicado ou quebrar o link de autoria | Rota SSR e nó Organization existentes | Usar uma seção em `/sobre` e o fragmento público no nó Person |
| IA e Agent Engineering | Fornecer biografia com evidência | Estimar a data de início a partir de fontes incompletas | Histórico do site e cobertura pública | Usar a duração documentada e fatos datados das fontes |
| Segurança | Reaproveitar foto e perfil profissional públicos | Incluir contatos ou dados pessoais da antiga consultoria | Asset publicado e links públicos existentes | Reaproveitar somente retrato, nome e perfil profissional |
| UX/UI | Dar destaque à trajetória de Lucas | Alongar a introdução ou prejudicar a leitura mobile | Layout atual e WebP existentes | Retrato compacto, títulos claros e links descritivos |
| CX e Operação | Ajustar o conteúdo da página ao pedido | Misturar perfil e instruções de compra | Texto estático e explicação atual do Radar | Manter na página uma descrição curta do Radar |
| Growth e CRO | Associar a trajetória ao canal | Alterar URL indexável ou criar atribuição pessoal sem respaldo editorial | URL, assinatura e publisher atuais | Preservar esses destinos e contextualizar o fundador |
| PMO e QA | Atualizar o lote local | Liberar biografia sem conferir fonte ou SSR | Histórico Git, inspeção e `pnpm validate` | Validar perfil, fragmento, assinatura, layout e sitemap |

A seção antiga “Quem somos”, no commit `e6ce63a` de 20/09/2025 e nas revisões de `src/components/AboutUs.tsx`, registra mais de 10 anos de atuação em mobilidade elétrica. As fontes públicas situam Lucas na [Vela Bikes em 2017](https://www.planetadabike.com/single-post/2017/09/29/bicicletas-el%C3%A9tricas-de-pedal-assistido-est%C3%A3o-com-fome-de-mercado) e na [Voltz na apresentação da moto elétrica para o iFood](https://institucional.ifood.com.br/inovacao/7-destaques-do-lancamento-da-moto-eletrica-do-ifood/), registrada em [2022 pela cobertura do evento](https://capitalreset.uol.com.br/transicao-energetica/transportes/ifood-anuncia-parceria-com-voltz-para-eletrificar-sua-frota/). A data da campanha inicial da Vela citada pelo UOL se refere ao projeto, portanto é insuficiente para datar a atuação de Lucas. A formulação escolhida é “mais de uma década”, com exemplos identificáveis de sua trajetória.

**Decisão.** Editar `/sobre` para incorporar o retrato e a trajetória do fundador, com âncora vinculada à entidade Person já emitida. Manter a Vitale Mobilidade como assinatura e publisher. O aceite exige HTML com biografia e foto, links das fontes, correspondência do fragmento no JSON-LD e navegação para o Sobre pela assinatura existente. A reversão local consiste em reverter o commit da atualização.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | A apresentação define o canal e o site e recupera o papel de Lucas como fundador. |
| CTO e Arquitetura | Pass | HTML SSR, uma canonical própria e JSON-LD consistente em home, Sobre e artigo, com URL do fundador apontando para a seção correspondente. A nova rota não tem loader próprio e funciona mesmo quando o backend local está indisponível. |
| IA e Agent Engineering | Pass | Exemplos de teste conferidos no domínio. A biografia usa a duração documentada pelo site antigo e registros públicos. A assinatura e a autoria estruturada continuam associadas à organização. |
| Segurança | Pass | O retrato vem do site antigo e os links biográficos levam a fontes públicas. |
| UX/UI | Pass | Navegação via rodapé com JS desativado, H1 único, retrato carregado e layout sem overflow horizontal em 320, 390 e 1280 px. |
| CX e Operação | Pass | A página resume o Radar e sua fonte de preços, com o ajuste de escopo pedido pelo usuário. |
| Growth e CRO | Pass | `/sobre` aparece uma vez no sitemap, tem canonical próprio e é descoberta por links HTML da home e dos artigos. O impacto em impressões requer publicação e medição. |
| PMO e QA | Pass | Build e verificações abaixo passaram. A publicação e a medição externa são etapas separadas. |

- `pnpm validate` passou com typecheck, 67 testes e build. A suíte dirigida da versão inicial passou com 57 casos de rotas, metadata, autoria e sitemap. ESLint da rota nova e `git diff --check` passaram.
- O smoke HTTP usou backend simulado e conferiu home, Sobre com UTM, artigo publicado, artigo inexistente (404) e sitemap GET/HEAD, com checagem adicional do retrato, fragmento da biografia, fontes, assinatura e autoria no JSON-LD. O smoke visual usou Chrome local com JavaScript desativado, em três larguras.
- Estado local validado. A publicação exige autorização explícita no projeto ativo. Antes de integrar, atualizar contra a main e conferir o preview. Depois de publicar, conferir no domínio a home, a nova rota, a assinatura de um artigo e a entrada no sitemap. Custo externo previsto nenhum, pelo fluxo de código e publicação existente. Risco baixo de oscilação de CTR da home por mudança do título e da descrição. Rollback pelo revert do commit e republicação.

## Medição após autorização e publicação

1. Na propriedade `sc-domain:vitalemobilidade.com`, conferir em leitura o [controle de IA generativa da Busca](https://support.google.com/webmasters/answer/16908024?hl=pt-BR). A configuração atual e as impressões da propriedade ficaram sem verificação nesta sessão porque o navegador conectado está desabilitado. Uma eventual exclusão deve ser tratada como achado separado, com aprovação para alteração.
2. Registrar a linha de base de 28 dias e comparar com os 28 dias seguintes, filtrando Brasil e as URLs da home, Sobre e artigos de referência. Usar o [relatório de performance de IA generativa](https://support.google.com/webmasters/answer/16984139?hl=pt-BR) para impressões de AI Overviews e AI Mode por URL quando disponível. A ausência do relatório pode refletir volume insuficiente. Usar o relatório Web para cliques e impressões orgânicos e a Inspeção de URL para a canonical selecionada, indexação e teste em tempo real.
3. Repetir em português do Brasil, com o mesmo contexto de busca, “Vitale Mobilidade”, “quem é a Vitale Mobilidade”, “V9 Max autonomia real” e “V8 Pro sobe ladeira”. Registrar data, presença de AI Overview, domínio e URL citados. No ChatGPT Search, registrar URLs citadas para as mesmas perguntas. Separar citações observadas, impressões de IA e cliques orgânicos.
