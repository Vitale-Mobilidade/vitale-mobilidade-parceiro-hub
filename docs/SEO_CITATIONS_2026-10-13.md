# SEO e fontes em respostas de IA — 13/10/2026

## Objetivo e evidência

Melhorar a rastreabilidade dos artigos aos vídeos originais e a integridade de metadata, sem prometer citações. Base: main `350ca63c82e5b99a694ebc78fcbf0f07f386d69e`; clone local isolado, sem publicação. Checkout pai é referência, não o app ativo.

Inspeção pública: sitemap com 170 URLs, incluindo 125 artigos; `/videos` não consta. Cinco artigos retornaram HTTP 200, um H1, canonical próprio, robots indexável, Article, VideoObject e BreadcrumbList no HTML original. Três vídeos desses artigos declaram upload em novembro de 2026, futuro em relação à inspeção. Os outros dois usam datas passadas. Isto é inconsistência confirmada, não explicação comprovada da ausência de citações. Evidência: `artifacts/seo-citations-2026-10-13/public-audit.json`.

O teste Frase fornecido registra zero citações para uma pergunta ampla, em uma rodada. O teste de resultados aprimorados da home não é teste de indexação nem de GEO. Mais de 150 acessos/dia é informação do responsável; origem e conversões ainda não foram verificadas. Não há acesso ao Search Console confirmado nesta task.

## Revisão prévia — mudança estrutural (SEO)

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Evidenciar acervo original | Prometer ranking ou atribuir autoria pessoal indevida | Contrato editorial atual | Prosseguir preservando autoria da organização |
| CTO | Validar schema no head SSR | Relógio, metadata incompleta | Data do catálogo e ID do vídeo | Prosseguir omitindo VideoObject quando inválido/futuro |
| IA e agentes | Fonte rastreável no HTML | Confundir vídeo original com experiência de todo artigo | Relação article.videoId existente | Prosseguir com linguagem de fonte, sem testemunho inventado |
| Segurança | Link e JSON-LD públicos | URL externa arbitrária ou fechamento de script | ID YouTube validado e serializador existente | Prosseguir sem novos endpoints ou secrets |
| UX/UI | Link acessível de fonte | Poluir leitura ou carregar iframe antecipado | HTML simples e resumo atual | Prosseguir com uma linha contextual |
| CX e operação | Evitar propagar data incorreta | Ocultar problema do catálogo | Registrar pendência de data na origem | Prosseguir sem alterar Sheets ou banco |
| Growth e CRO | Coerência artigo/vídeo | Tratar schema como garantia de citação | Conteúdo verificável e mensuração posterior | Prosseguir sem alterar canonical, robots ou afiliados |
| PMO e QA | Lote pequeno verificável | Release sem evidência ou mistura com outros trabalhos | Testes direcionados e pnpm validate | Prosseguir local, publicação depende de autorização específica |

### Conflitos e decisão consolidada

- Growth deseja aproveitar todo o acervo; Segurança/QA recusam emitir datas inventadas para conservar todos os VideoObjects. Decisão: omitir apenas o schema de vídeo inválido/futuro, mantendo Article, conteúdo e link de fonte. Reemitir automaticamente quando houver data válida não futura; corrigir a origem é pendência operacional separada.
- A ausência de `/videos` no sitemap merece revisão, mas incluir a rota sem considerar catálogo vazio/noindex é inadequado. Adiada para um lote com regra de disponibilidade explícita.
- Escopo: validar data não futura e ID de fonte; relacionar Article ao VideoObject válido; mostrar link direto para vídeo original usando ID validado. Sem nova página, serviço pago, migração, write de dados, alteração de autoria ou reescrita em massa.
- Aceite: casos futuros/impossíveis/IDs inválidos não emitem VideoObject; fonte válida preserva data real; referência ao vídeo só existe quando seu nó existe; fonte é link HTML sem JavaScript; testes direcionados, diff e `pnpm validate` passam.
- Rollback: reverter o diff deste lote. Nenhuma mudança de banco ou infraestrutura. Produção permanece intacta até autorização no formato dos guardrails do checkout pai.

## Estratégia do acervo — próximos lotes

1. Search Console: confirmar indexação e elegibilidade de snippet por URL, consultas, impressões e cliques. Não deduzir indexação do sitemap nem do teste de rich results.
2. Mapear os 125 artigos por pergunta/necessidade. Há múltiplos títulos sobre V8 Pro e VL20; similaridade de intenção exige leitura do corpus, não prova automática de duplicação. Escolher páginas centrais por modelo e manter artigos específicos quando aportam observação própria. Sem apagar, redirecionar ou alterar canonical antes do mapa aprovado.
3. Revisar cinco transcrições completas de intenções diferentes antes de mudar o pipeline editorial. Distinguir teste observado, fabricante, preço atual, opinião e inferência. Não afirmar quantidade de vídeos testados ou métricas sem fonte.
4. Melhorar comparativos por perfil com critérios, condições, limitações e evidência do vídeo. Conectar ao Radar, Quiz e ferramentas pertinentes. Nenhuma frase, FAQ ou arquivo `llms.txt` garante detecção/citação.
5. Definir identidade pública, metodologia de análise e transparência de afiliados com fatos aprovados; não inventar independência, credenciais ou política editorial.
6. Medir uma cesta fixa de consultas de marca, modelos, comparações e necessidades em português. Registrar mecanismo, pergunta, data, resposta, URL citada e concorrentes. Comparar antes/depois e tráfego/conversão reais, sem score arbitrário de citabilidade.

## Referências primárias

- Google: https://developers.google.com/search/docs/appearance/ai-features — SEO, indexação e snippets; não exige arquivo ou schema especial de IA.
- Google: https://developers.google.com/search/docs/appearance/structured-data/video — propriedades do vídeo devem representar a fonte real.
- OpenAI: https://developers.openai.com/api/docs/bots — OAI-SearchBot corresponde à busca; GPTBot é controle separado de treinamento.

## Revisão posterior

| Perspectiva | Status | Evidência / risco residual |
| --- | --- | --- |
| Produto | Pass | Fonte explícita; nenhuma promessa, mudança de jornada ou autoria pessoal inferida |
| CTO | Pass | Schema calculado no head existente; teste de fronteira de data; typecheck e build aprovados |
| IA e agentes | Pass | Link para fonte original; não modifica o writer, o grounding ou a evidência privada |
| Segurança | Pass | IDs restritos a 11 caracteres YouTube; URL construída em origem fixa; escape JSON-LD existente preservado |
| UX/UI | Pass | Link HTML contextual após resumo, renderizado no teste SSR; nenhum iframe novo nem interação obrigatória |
| CX e operação | Pass | Nenhuma alteração de catálogo, RPC, Sheets, jobs ou dados; correção da data na origem permanece pendente |
| Growth e CRO | Pass | Article referencia VideoObject somente quando válido; canonical, robots e afiliados preservados; citações ainda não medidas após mudança |
| PMO e QA | Pass | 16 testes direcionados; 61 testes no gate; typecheck, build, diff e lint funcional aprovados |

### Fechamento

- `pnpm validate`: aprovado após as alterações finais (typecheck, 61 testes do gate, build cliente/SSR).
- Testes direcionados: quatro arquivos, 16 testes aprovados, incluindo data futura, data impossível, ID inválido, URL externa do catálogo e fonte HTML SSR.
- Lint: regras funcionais aprovadas no escopo. Lint completo dos arquivos mantém 72 erros de formatação preexistentes (67 no ArticleView e cinco no teste independente), sem aumento. Baseline e resultado registrados em `artifacts/seo-citations-2026-10-13/lint-baseline.json`. Os demais três arquivos modificados passam o lint completo. Reformatação integral foi adiada para evitar diff amplo.
- `git diff --check`: aprovado. Build apresenta avisos preexistentes de plugins/depreciação, sem falha.
- Sem validação end-to-end com banco real: a evidência pós-mudança é local, com renderização SSR por fixture e build. Após publicação autorizada, repetir a inspeção HTTP das páginas reais e Rich Results Test em artigo.
- Risco residual: a fonte de dados ainda informa datas futuras; o lote impede a propagação para VideoObject, sem adivinhar ou reparar dados. O vídeo continua visível. Corrigir a data do catálogo requer confirmação da data real e ação separada.
- Estado: implementação local pronta e revisada; nenhuma publicação, push, migration, escrita em produção ou consumo de créditos Lovable.
- Condição de release: autorização específica para integrar este diff no projeto ativo e publicar; revalidar contra main mais recente, smoke de preview e rollback para versão imediatamente anterior. Este lote corrige integridade/rastreabilidade; não conclui a estratégia editorial nem garante indexação, ranking ou citações.

## Release autorizado — 13/10/2026

- Autorização do responsável nesta thread: “corrija e publique”.
- Main remoto e Lovable estavam em `350ca63c82e5b99a694ebc78fcbf0f07f386d69e`; não havia delta concorrente. O commit `85de9f7fcb461ab235e0e5ccaf0280b4fef5748b` foi integrado via push fast-forward sem force.
- `pnpm validate` repetido antes da publicação: aprovado, incluindo 61 testes e build. Nenhuma alteração funcional após esse gate.
- Lovable confirmou sincronização no mesmo SHA. Preview HTTP externo exige autenticação (401); a sessão Chrome autenticada carregou o artigo da V8 Pro, com fonte visível, título correto e links públicos preservados.
- Publicação pelo conector, sem geração de código paga: deployment `0e1e2aad-e3f3-48ec-83b2-0e0898bd9341`, projeto existente, domínio `https://vitalemobilidade.com` preservado.
- Smoke em produção: oito URLs HTTP 200 (cinco artigos, home, Radar e Quiz). Os cinco artigos têm fonte no HTML original e canonical próprio. Os três vídeos com datas futuras não emitem VideoObject nem referência pendente; os outros dois preservam a data real e a relação Article.video. Evidência em `artifacts/seo-citations-2026-10-13/production-validation.json`.
- Todas as oito perspectivas mantêm Pass para o lote entregue. Fonte explícita e integridade de schema verificadas em produção; nenhuma afirmação de melhora de ranking/citação foi feita. A data incorreta no catálogo continua pendência de origem, sem escrita em banco/Sheets nesta tarefa.
- Rollback: restaurar a publicação correspondente ao commit anterior `350ca63c82e5b99a694ebc78fcbf0f07f386d69e`, ou reverter apenas `85de9f7` e republicar; sem rollback de dados. Nenhuma mudança de DNS, hosting, integração ou migration.
- Estado: lote publicado e verificado. Estratégia editorial/Search Console permanece nos próximos lotes acima. Atualização posterior deste relatório é somente documentação e não exige nova publicação de aplicativo.

## Ajuste solicitado — datas futuras e prioridade editorial

Classificação: estrutural (SEO e leitura do catálogo). Escopo local: ao consumir o catálogo, data futura válida passa a ser o dia atual em America/Sao_Paulo, preservando sourceDate. Datas passadas não mudam; impossível retorna null. Nenhuma escrita em Sheets/banco, alteração de sync ou nova publicação neste lote.

Revisão prévia separada: Produto — prosseguir para ordenação consistente, sem inventar publicação; CTO — prosseguir com helper puro e cache bruto; IA — prosseguir preservando origem e sem transformar fallback em evidência; Segurança — prosseguir, sem secrets/writes; UX — prosseguir mantendo contrato de data e vídeos; CX — prosseguir, registrar erro de origem sem reparar mês/dia por adivinhação; Growth — prosseguir, usar data original para uploadDate no schema; QA — prosseguir com testes de timezone, cache e datas inválidas. Dependências comuns: catálogo persistente existente, head Article, timezone explícito. Risco: data operacional ser confundida com upload real. Mitigação: sourceDate preservada e schema continua recusando fonte futura.

Decisão: aplicar hoje somente à data operacional; o uploadDate deve ser comprovado pela fonte original. Não retroagir publicação do artigo nem fabricar dateModified. Rollback: reverter helper, consumidor e prop opcional. Aceite: dia de São Paulo na fronteira UTC, datas reais preservadas, impossível null, futuro ajustado e não promovido a data de upload. Este ajuste complementa a correção de datas já autorizada com “corrija e publique” nesta thread, incorporando a instrução atual do responsável. Não autoriza writes de dados ou alterações do pipeline editorial.

Revisão posterior do ajuste: Produto Pass — regra solicitada sem alterar jornadas; CTO Pass — cache bruto preservado e normalização a cada leitura; IA Pass — data original não substituída por evidência fictícia; Segurança Pass — nenhuma escrita/secrets; UX Pass — shape público preservado; CX Pass — Sheets permanece fonte, sem tentativa de adivinhar mês/dia; Growth Pass — uploadDate continua factual; PMO/QA Pass — dez testes direcionados e pnpm validate (61 testes, typecheck e build) aprovados. Datas impossíveis/ausentes ficam null, pois não são datas futuras válidas. Implementação somente no consumidor público; não altera valores persistidos nem rotinas de sincronização.

### Search Console consultado em 13/10/2026

Propriedade de domínio verificada. Sitemap processado, enviado em 29/09, última leitura em 12/10: 167 páginas encontradas, zero entradas de vídeo. Sitemap público atual tem 170 URLs; diferença temporal não é erro confirmado. O sitemap é dinâmico (`src/routes/sitemap[.]xml.ts` e RPC de publicados/indexáveis), sem necessidade de refazer/enviar diariamente. Cache HTTP de 300 s, compartilhado 600 s; frequência de leitura/indexação é decisão do Google.

Relatório Páginas (todas conhecidas), última atualização 08/10: 97 indexadas, 67 não indexadas; 56 detectadas mas não indexadas, quatro rastreadas mas não indexadas, cinco com redirecionamento, uma noindex e uma 404. Não são contagens exclusivas de artigos e não explicam causalidade. Ainda falta cruzar exemplos/URLs com o acervo e o desempenho. Nenhuma solicitação de indexação em massa, validação ou envio de sitemap foi executado.

Os vídeos permanecem hospedados no YouTube. Google permite vídeo incorporado de terceiros e pode indexar ambas as páginas, conforme elegibilidade. Artigos em que o vídeo é complementar não são necessariamente watch pages; ausência de indexação de vídeo na página não implica ausência do artigo nos resultados de texto. Não migrar mídia, criar páginas de vídeo em massa ou substituir a experiência editorial para perseguir contagem de vídeos. Referência: https://developers.google.com/search/docs/appearance/video.

Próximo lote recomendado: inventário por URL do Search Console, começando pelas quatro rastreadas sem indexação; piloto em dez páginas com intenção distinta e fontes/transcrições verificadas, evidências de teste e links internos contextualizados; página de metodologia/identidade somente com fatos aprovados; medição de consultas fixas. Não usar números do sitemap como cobertura de indexação.

### Release complementar de datas

Commit funcional `c722e1b554403d0a27f597f87efb7787f0748ee9` sincronizado e publicado no deployment `e988e459-0856-4bf3-9919-df9ad1eaaf7e`. Verificação pública do artigo V8 Pro confirma sourceVideo.date=2026-10-13 e sourceVideo.sourceDate=2026-11-13: a data operacional está corrigida para hoje, a data original ainda vem futura do catálogo persistente. Não emitido uploadDate fictício. Fonte em vídeo continua no HTML SSR e novos assets do release estão presentes. Dez testes direcionados e gate obrigatório (61 testes, typecheck e build) passaram. Ajuste publicado e conferido; nenhuma escrita de planilha/banco. Rollback: reverter apenas c722e1b e republicar o código anterior. Todas as oito perspectivas mantêm Pass para esse escopo.
