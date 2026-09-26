# Revisão estrutural de SEO, GEO e performance — 2026-09-25

## Classificação e decisão

- Mudança estrutural: afeta SEO/GEO, Radar, conteúdo editorial, imagens, analytics e experiência pública.
- Escopo autorizado inicialmente: otimização local do site público. A publicação conjunta do lote SEO/performance, do portal editorial já validado e do patch de performance do Admin foi autorizada explicitamente em 26/09/2026.
- Decisão consolidada pré-implementação: **GO local com ressalvas**.
- Fora deste lote: remover ou redirecionar `/bikes`, trocar IDs públicos por slugs, alterar GTM/GA4, criar serviço de transformação de imagens ou publicar em produção. Essas decisões exigem evidência de Search Console/analytics, mapa de migração e autorização explícita.

## Baseline verificável

Lighthouse executado em 2026-09-25 contra a produção antes destas alterações:

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 74 | 96 | 73 | 100 | 3,9 s | 3,9 s | 260 ms | 0 |
| Desktop | 80 | 96 | 73 | 100 | 0,5 s | 3,0 s | 0 ms | 0 |

O endpoint oficial do PageSpeed Insights recusou a execução por cota; por isso o baseline foi coletado com Lighthouse local apontando para a URL pública. O resultado não substitui CrUX de campo.

Principais causas confirmadas: imagens locais entre aproximadamente 595 KB e 1,7 MB, hero de Ferramentas remoto com aproximadamente 2,24 MB, assistente/Supabase no caminho global de JavaScript, até 200 vídeos solicitados e renderizados no detalhe do Radar, `llms.txt` alheio ao produto atual e Open Graph padrão pequeno.

## Revisão pré-implementação pelas oito perspectivas

| Perspectiva | Decisão e condição |
| --- | --- |
| Produto e estratégia | GO para melhorar descoberta e velocidade sem mudar a proposta do Radar, Quiz e Ferramentas. |
| CTO e arquitetura | GO preservando SSR, carregamento progressivo e acesso a dados por funções existentes. |
| UX/UI | GO com prioridade a mobile, dimensões explícitas, foco visível e conteúdo principal navegável. |
| Growth/CRO | GO para metadata, OG, conteúdo semântico e ativos mais leves; sem promessa de ranking. |
| Segurança | GO mantendo secrets no servidor e escapando JSON-LD dinâmico. |
| IA e agentes | GO para corrigir `llms.txt`; sem alegações inventadas ou alteração do comportamento do Lucas. |
| CX e operação | GO desde que Radar, Quiz, ferramentas, ofertas e links de afiliado permaneçam funcionais. |
| PMO e QA | GO em worktree isolada, com testes direcionados, build e `pnpm validate` antes do handoff. |

## Implementação

- Padronização de canonical, Open Graph e Twitter Cards, com imagens 1200 × 630 por superfície e imagem dinâmica única para conteúdo/Radar.
- `llms.txt` refeito para representar corretamente Radar, Quiz, Ferramentas, Conteúdos, afiliados e limites das simulações.
- Doze imagens locais de bikes convertidas para AVIF responsivo, preservando os arquivos-fonte.
- Logo e hero de Ferramentas locais otimizados; dimensões, `sizes`, lazy loading e prioridade explícita adicionados às imagens públicas relevantes.
- Assistente removido do caminho inicial global: seu bundle passa a carregar após intenção explícita do usuário.
- Radar limitado a oito vídeos por página, com quatro iniciais e até quatro sob expansão, em vez de até 200.
- Sitemap desacoplado de uma consulta de catálogo que não contribuía para as URLs e podia tornar a resposta indisponível.
- Skip link e alvo de conteúdo principal adicionados; 404 traduzido para português.
- JSON-LD dinâmico serializado com escape de `<`.

## Conflitos e trade-offs registrados

- O GTM contribui para trabalho de terceiros, mas removê-lo comprometeria mensuração. Foi mantido até existir uma decisão de consentimento/carregamento com Growth e dados de produção.
- Imagens remotas vindas do catálogo/editorial ainda dependem da origem. Um pipeline/worker de variantes seria estrutural e não foi criado sem decisão de arquitetura, custo e rollback.
- `/bikes` permanece indexável e funcional. A regra do produto exige mapa de migração aprovado antes de qualquer redirect para Radar.
- As imagens OG foram geradas em JPEG, não AVIF, para compatibilidade ampla com crawlers sociais; imagens de interface usam AVIF.

## Revisão pós-implementação

| Perspectiva | Status | Evidência / risco residual |
| --- | --- | --- |
| Produto e estratégia | Pass | Jornadas centrais preservadas; nenhuma rota canônica foi removida. |
| CTO e arquitetura | Pass | SSR e serviços existentes preservados; dependência pesada passou a ser interativa. |
| UX/UI | Pass | Mobile/desktop receberam dimensões estáveis, ativos menores e skip link. |
| Growth/CRO | Pass | Metadata, OG, canonical, sitemap e GEO revisados; performance de campo depende de publicação e CrUX. |
| Segurança | Pass | Sem secrets ou writes de produção; JSON-LD dinâmico escapado. |
| IA e agentes | Pass | `llms.txt` factual; Lucas permanece disponível sob acionamento explícito. |
| CX e operação | Pass | Links diretos e fluxos públicos preservados; vídeos continuam acessíveis em quantidade controlada. |
| PMO e QA | Pass | `pnpm validate`, 409 testes e build de produção aprovados; smoke SSR e Lighthouse de produção concluídos. |

## Validação final

- `pnpm validate`: **Pass** — typecheck, 47 testes do gate e build de produção.
- `pnpm test`: **Pass** — 49 arquivos e 409 testes, incluindo o novo fluxo editorial intercalado.
- `git diff --check`: **Pass**.
- Smoke SSR do build local: HTTP 200, title, canonical e Open Graph presentes.
- Lighthouse do build local, usado como indicação técnica e não como promessa de produção:

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 85 | 96 | 77 | 100 | 2,7 s | 3,2 s | 220 ms | 0 |
| Desktop | 100 | 96 | 77 | 100 | 0,6 s | 0,7 s | 0 ms | 0 |

O erro de console do GTM foi eliminado no smoke. Cookies de terceiros, cache de origens externas e a confirmação em infraestrutura real continuam como riscos residuais de produção.

## Release e validação em produção — 26/09/2026

- Commit publicado: `e6e3d8c30a08d09e312d66a831b80b182f48d1a3`.
- Deployment Lovable: `7e7c40a9-a425-4b43-88f1-212c82454dd9`.
- Domínio canônico verificado: `https://vitalemobilidade.com`.
- Smoke HTTP/SSR: Home, Radar, Ferramentas, Conteúdos, Quiz, `llms.txt`, sitemap e imagens Open Graph retornaram 200; rota inexistente retornou 404.
- Artigo real verificado com comparação, preços, histórico, vídeo, Radar, Quiz e ferramenta intercalados no HTML SSR.
- O endpoint oficial do PageSpeed Insights continuou indisponível por cota diária. O Lighthouse foi executado diretamente contra produção:

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 90 | 100 | 77 | 100 | 2,1 s | 2,6 s | 150 ms | 0 |
| Desktop | 87 | 100 | 77 | 100 | 0,5 s | 2,4 s | 0 ms | 0 |

Riscos residuais observados em produção: TTFB variável do documento, imagens remotas do catálogo sem variantes dimensionadas, JavaScript/cookies de GTM, Meta e SalesIQ, e metadata global `index, follow` presente no HTML de 404 embora a resposta HTTP seja 404. Eles não anulam o release, mas impedem declarar o desempenho como concluído em campo antes de CrUX e exigem decisões estruturais separadas sobre CDN de imagens, consentimento/terceiros e metadata de not-found.

## Próximo gate

Monitorar Search Console/CrUX por 28 dias. Em lote estrutural separado, decidir o mapa SEO de `/bikes`, o pipeline de variantes para imagens remotas, a estratégia de consentimento/carregamento de GTM/Meta/SalesIQ e a metadata SSR de 404. O rollback do frontend é a versão anterior ao deployment `7e7c40a9-a425-4b43-88f1-212c82454dd9`.

## Rodada pós-PageSpeed da Home — 26/09/2026

As capturas oficiais fornecidas pelo responsável cobrem apenas a Home. O dado de campo aparece agregado por origem e representa a janela histórica de 28 dias; portanto ainda inclui versões anteriores ao deployment acima. A execução atual de laboratório marcou 87 no mobile e 95 no desktop, com SEO 100, acessibilidade 100 e CLS 0. No campo, o principal encadeamento é TTFB alto (2,7 s mobile; 2,4 s desktop), seguido de FCP/LCP altos. No laboratório mobile, o risco atual é TBT de 470 ms.

Uma amostra Lighthouse móvel adicional em produção cobriu Home, Radar, detalhe do Radar, índice/detalhe editorial, índice/detalhe de Ferramentas e Quiz. SEO permaneceu 100 e CLS 0 em todas. A variância de TTFB/LCP foi alta; imagens remotas de Bike, terceiros globais e o player do YouTube foram os maiores custos reproduzíveis. A Home transferiu 2,66 MB; o Radar lista, 4,60 MB; uma única imagem `v8_ultra` transferiu aproximadamente 1,18 MB. O artigo carregava aproximadamente 849 KB de scripts do player antes de interação.

### Correções locais desta rodada

- cliente Supabase da newsletter retirado do preload da Home e carregado apenas no envio; chunk adiado: 55,84 KB gzip;
- catálogo do Radar limitado a 12 cards iniciais, com carregamento progressivo por interação;
- cada card do Radar passou de três links redundantes para um CTA principal com foco visível;
- assistente deixa de flutuar sobre conteúdo no mobile e permanece fixo apenas a partir de `sm`;
- Quiz preserva um H1 em todas as fases e amplia o alvo/foco do botão Voltar;
- índice de Conteúdos usa hero mobile e miniaturas YouTube `mqdefault` nos cards;
- artigo usa fachada de vídeo e só cria o iframe `youtube-nocookie` após clique;
- detalhe editorial ganhou landmark `main` explícito;
- helper de miniatura valida host, protocolo, ID e variante antes de reescrever a URL.

### Segunda revisão multidisciplinar

| Perspectiva | Status | Evidência / condição |
| --- | --- | --- |
| Produto e estratégia | Pass | Radar, Quiz, conteúdo, oferta e posicionamento B2C preservados; não há nova feature nem mudança de rota. |
| CTO e arquitetura | Pass condicionado | SSR e contratos de dados preservados; cache HTML, TTFB e variantes remotas continuam em lote de infraestrutura separado. |
| IA e agentes | N/A justificado | Lucas, prompts, grounding, modelos e automações não foram alterados; o assistente continua sob clique explícito. |
| Segurança | Pass | Nenhum secret, schema, RLS, write, PII ou URL assinada alterado; reescrita de thumbnail é restrita a `https://i.ytimg.com`. |
| UX/UI | Pass | Focos redundantes removidos, H1/tap target corrigidos e overlay mobile eliminado; CLS e dimensões preservados. |
| CX e operação | Pass | Sheets, sync, painel, CRM, alertas, catálogo e links diretos permanecem inalterados. |
| Growth e CRO | Pass condicionado | Conteúdo/CTA/metadata preservados; terceiros não foram removidos sem plano de consentimento e atribuição. |
| PMO e QA | Pass condicionado | 411 testes e `pnpm validate` passaram; publicar só após autorização específica desta rodada e smoke do artefato. |

Validação local: `pnpm test` com 50 arquivos/411 testes, `pnpm validate` com typecheck, 47 testes direcionados e build de produção, e `git diff --check`, todos aprovados. Esta rodada ainda não foi publicada. O rollback proposto é restaurar o deployment `7e7c40a9-a425-4b43-88f1-212c82454dd9`; não há alteração de banco ou de dados.
