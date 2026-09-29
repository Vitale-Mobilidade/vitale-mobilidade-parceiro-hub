# Search Console — Vitale Mobilidade, 29/09/2026

Perfil conferido na interface: **Lucas (Vitale Mobilidade)**. Propriedade: `sc-domain:vitalemobilidade.com`. Registros obtidos na interface autenticada, sem exportar identificadores pessoais, cookies ou credenciais.

## Configuração concluída e conferida

| Item | Evidência na interface |
| --- | --- |
| Verificação | Proprietário verificado; propriedade incluída em 21/04/2026 |
| Sitemap | `https://vitalemobilidade.com/sitemap.xml` enviado nesta execução; mensagem **Sitemap enviado**, detalhe **O sitemap foi processado**, última leitura 29/09/2026, **143 páginas**, 0 vídeos no sitemap de URLs |
| Analytics | Associação **Google Analytics GA4**, conta e fluxo **Vitale Mobilidade**, URL `vitalemobilidade.com`; nenhuma solicitação pendente |
| IA generativa na Pesquisa | **Incluir**, já ativo |
| robots.txt | Todos os arquivos são válidos |
| Ações manuais | Nenhum problema foi detectado |
| Problemas de segurança | Nenhum problema foi detectado |
| HTTPS | Atualizado em 21/09/2026: 0 URLs não HTTPS, 2 HTTPS, nenhum problema nos últimos 90 dias |
| Rastreamento | Atualizado em 26/09/2026: 531 solicitações, cerca de 13 milhões de bytes, resposta média 644 ms; domínio principal, www e subdomínio de negócios **Sem problemas** |

A listagem inicial do sitemap exibiu transitoriamente uma falha de busca; o detalhe posterior confirmou o processamento e as 143 páginas. Vale a confirmação final. Não foi criada outra propriedade, removida associação nem alterada permissão. Não houve exportação paga para BigQuery ou mudança de DNS.

## Indexação e teste ao vivo

Relatório agregado atualizado em **20/09/2026**: 2 indexadas, 4 não indexadas (3 redirects e 1 alternativa com canonical adequado). Esse relatório antecede os artigos recém publicados.

Artigo inspecionado: `/conteudos/inow-v20-pro-ou-ouxi-v8-ultra-o-que-muda-na-escolha`.

- Índice: **Detectada, mas não indexada no momento**. O sitemap enviado já aparece como origem de descoberta. Sem rastreamento anterior registrado.
- Teste em tempo real em **29/09/2026, 09:20**: **É possível indexar a página**. Breadcrumb válido, vídeo detectado.
- Melhoria de vídeo: 1 erro crítico real, **O campo uploadDate não foi encontrado**. Corrigido na proposta local usando a data do vídeo correspondente do catálogo; quando não houver data válida, o schema incompleto será omitido.
- `contentUrl` publicado apontava para uma página YouTube, não para bytes do vídeo. A proposta usa `embedUrl` e `url` reais, sem inventar arquivo de mídia.

Após a publicação do commit `1581ae92f29957e4af9fff16fc64f9c5608930a8`, o teste em tempo real em **29/09/2026, 20:51** mostrou **O URL está disponível para o Google**, **É possível indexar a página**, breadcrumb válido e **1 VideoObject válido**. O antigo erro crítico de uploadDate ausente desapareceu. Restaram dois avisos opcionais: data sem hora ISO completa e fuso horário não informado. A fonte confirma o dia, mas não a hora do upload; não foi fabricado horário. A solicitação individual de indexação foi aceita: **Indexação solicitada**, URL adicionado à fila prioritária. Não foi solicitada indexação em massa.

## Core Web Vitals de campo

Atualização **26/09/2026**: mobile 2 ruins, 0 boas; desktop 2 que precisam de melhoria. Mobile: LCP > 4 s e INP > 200 ms. O grupo de LCP tem **4,3 s**, com `/escolherbike` como exemplo com dados suficientes; a home tem dados individuais insuficientes. `/escolherbike` é uma rota antiga, hoje com redirect. Isso descreve o histórico do grupo, não uma medição individual dos 101 novos artigos.

A validação de correção do grupo não foi iniciada antes de publicar a correção. Após o release, Lighthouse mobile no domínio mediu índice 74/92 em duas rodadas, artigo 89, Radar 86 e Quiz 91, com variação relevante no tempo de resposta inicial. Esses valores de laboratório não substituem CWV de campo. A atualização de dados de campo e a decisão de indexação dependem de novas visitas/rastreamento e do processamento do Google.

## Referências e próximo passo

- [Sitemaps: criação e envio](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): envio é um sinal para descoberta, não garantia de indexação.
- [SEO de vídeos](https://developers.google.com/search/docs/appearance/video): artigos com vídeo complementar não são automaticamente watch pages.
- [Recursos de IA da Pesquisa](https://developers.google.com/search/docs/appearance/ai-features): manter SEO, acesso e conteúdo útil; não existe um schema adicional obrigatório para IA.
- [OpenAI: publishers e developers](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq): permitir OAI-SearchBot e acompanhar referrals, sem promessa de citação.

Inspeção em tempo real, schema e indexação individual de amostra foram concluídos após o release. Acompanhar indexação e CWV de campo quando o Google atualizar os relatórios; não declarar os 101 artigos indexados ou CWV bons pelo simples processamento do sitemap.
