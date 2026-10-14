# Investigação de indexação e piloto editorial — 13/10/2026

## Classificação e objetivo

Estrutural: SEO, conteúdo e proposta de atualização de dez linhas no Supabase integrado. Objetivo: investigar URLs excluídas e fortalecer dez artigos existentes com evidência original, intenção distinta e metadata específica. Base de código: `c9b3e09`. Autorização atual: investigar e melhorar; não aplicar mudanças de conteúdo publicado sem apresentar o lote revisado conforme os guardrails.

## Baseline

- Search Console: relatório de indexação atualizado em 08/10, 97 URLs indexadas e 67 excluídas. Exportados os grupos de quatro rastreadas sem indexação e 56 detectadas sem indexação. O detalhamento das quatro registra último rastreamento em 10/10; não confundir esse campo com a atualização geral do gráfico.
- Auditoria HTTP de todas as 60 URLs: HTTP 200, robots indexável, canonical próprio em todas. Não há bloqueio técnico demonstrado nessa amostra; isso não prova indexação nem qualidade editorial. As 56 incluem Radar e ferramentas, não apenas artigos.
- Desempenho Web: 14/09 a 11/10, 165 cliques, cerca de 9,22 mil impressões, CTR 1,8%, posição média 6,3. Não equivale aos acessos totais/dia nem a citações de IA. Export privado em `artifacts/seo-editorial-pilot-2026-10-13/search-performance.local`.
- Catálogo: 125 artigos publicados; fontes completas disponíveis para os dez escolhidos e as outras três páginas rastreadas. Backup privado em `source-backup.local` (ignorado). Não expor transcrições/sourceExcerpt em preview público, patch público ou repositório.

## Seleção

Oito páginas com demanda observada, uma seleção de delivery com 227 impressões/zero cliques e uma página VL20 que constava como rastreada sem indexação no agregado e já está indexada na inspeção atual. Não selecionar só por número de artigos ou novidade. Evitar escolher dois artigos GT2000 com a mesma pergunta para o piloto; não inferir canibalização sem consultas por URL e leitura do corpus.

| Artigo (slug preservado) | Impressões / cliques | Intenção e fonte |
| --- | --- | --- |
| mangosteen-ft03-o-que-muda-no-uso-urbano-e-para-quem-ela-faz-sentido | 1115 / 12 | FT03, uso individual/subida; TQbrv2OZF2I |
| v9-max-qual-versao-escolher-entre-uma-ou-duas-baterias | 1068 / 9 | Configurações de bateria; bLD_-JaPMaM |
| inow-v20-pro-ou-ouxi-v8-ultra-o-que-muda-na-escolha | 747 / 4 | Traseira adaptável e comparação; gnMfnlPBpOY |
| wanshida-gt2000-para-que-tipo-de-trajeto-ela-faz-sentido | 698 / 0 | GT2000, terreno e leitura de carga; vcg8MNnr48E |
| inow-v40-pro-ou-v9-max-o-que-muda-na-escolha | 557 / 12 | Bateria e compra; _y-VeXE_dEs |
| v9-max-em-um-deslocamento-de-19-km-o-que-o-uso-intenso-indica-sobre-a-autonomia | 479 / 3 | Consumo observado, não descarga completa; SsogQWoYntg |
| bicicleta-eletrica-para-duas-pessoas-v8-pro-v40-pro-ou-v9-max | 314 / 3 | Garupa, carga e alcance; fonte ligada ao artigo |
| ouxi-gt20-pro-ou-wanshida-gt2000-qual-faz-mais-sentido-para-voce | 289 / 5 | Garupa versus bateria, modelos distintos; fonte ligada ao artigo |
| cinco-bikes-eletricas-para-delivery-como-escolher-pela-bateria-e-pela-carga | 227 / 0 | Turno, bateria e baú; fonte ligada ao artigo |
| ufofast-vl20-vale-a-pena-para-quem-a-bicicleta-eletrica-faz-sentido | Não indexada na amostra | Compra urbana e limitações reais; cf-AF7LgqpY |

Outlines de cinco intenções distintas avaliados antes da edição: uso individual em subida; seleção de capacidade de bateria; comparação de traseira para carga; teste de consumo em trajeto; planejamento de turno de delivery. Todos têm transcrição completa disponível. Os textos existentes já possuem FAQ, vídeo e Radar; o piloto deve melhorar passagens concretas, sem repetir template ou acrescentar seções artificiais.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Dez artigos com perguntas e decisões mais claras | Conteúdo redundante ou promessa de melhor bike universal | Intenções distintas e demanda observada | Prosseguir com lote limitado |
| CTO | Payload de conteúdo, sem nova rota/schema de banco | Renderização ou contrato de blocos quebrado | Contrato editorial existente e revisão monotônica | Prosseguir em artefato local |
| IA/agentes | Explicitar observações sustentadas | Inventar testes, tempos, autonomia ou atribuir cálculo como medição | Transcrições completas e excerpts literais privados | Prosseguir com evidência por mudança |
| Segurança | Backup e proposta SQL | Vazamento de transcrição ou atualização concorrente | Arquivos .local ignorados, locks e revisão esperada | Prosseguir, sem execução produtiva |
| UX/UI | Abertura direta e leitura clara | Texto virar lista de ressalvas ou relatório de vídeo | Voz editorial existente, HTML acessível | Prosseguir preservando componentes |
| CX/operação | Coerência com publicação diária | Patch sobrescrever nova revisão do writer/admin | Verificação da revisão no momento de aplicar | Prosseguir com abort em divergência |
| Growth/CRO | Metadata relevante e conteúdo citável | Mudança de intenção, preços obsoletos, slugs quebrados | Métricas por URL, Radar como fonte de oferta atual | Prosseguir sem alterar URLs/indexação |
| PMO/QA | Lote revisável e reversível | Publicar antes de QA/evidência | Dez diffs, preview local, teste/validate, rollback | Prosseguir local; handoff depende de revisão posterior |

## Conflitos e decisão consolidada

- Demanda por citações versus integridade: preservar condições e incertezas; não declarar que schema ou texto garante citação.
- Evergreen versus preço histórico: remover comparação ancorada em valores de meses anteriores onde prejudica a decisão atual; usar módulos Radar existentes sem inventar preço hoje.
- Repetição versus cobertura: manter slugs e páginas específicas; nenhum redirect, canonical alternativo, noindex ou consolidação neste lote.
- Metadata versus conteúdo: não trocar apenas palavras-chave. Cada um dos dez deve receber ao menos uma melhoria substantiva de resumo/passagem, sustentada na fonte.
- Escopo: investigação e dez propostas de edição de conteúdo existente. Sem modificar o writer/pipeline, quotas pagas, migrations, RLS ou fontes externas.
- Aceite: dez propostas com slug/status/indexable/published_at preservados; excerpts literais para passagens alteradas; distinção de observação/estimativa; metadata coerente; contrato/renderização/testes e `pnpm validate` aprovados; segunda revisão pelas oito perspectivas.
- Rollback: backup das linhas, atualização protegida pela revisão pós-patch; não reduzir revision nem sobrescrever mudanças posteriores. Aprovação final identifica exatamente as dez linhas e campos.

## Resultado e revisão posterior

### Investigação concluída

- Os grupos agregados estão defasados: todas as quatro URLs “rastreadas sem indexação” já retornam **O URL está no Google / A página está indexada** na inspeção individual de 13/10. Todas apresentam Breadcrumb válido e VideoObject válido (com avisos não críticos). Isso não é melhora produzida por esta task: não houve write de conteúdo ou solicitação de indexação.
- Das 56 “detectadas”, 26 são artigos, 24 Radar e seis ferramentas. Todas constam no sitemap atual; os 26 artigos têm link no HTML inicial de `/conteudos`. HTTP 200, canonical próprio e robots indexável verificados nas 60 URLs.
- Amostra individual do grupo de 56: `/conteudos/bike-eletrica-v8-pro-1000w-sobe-ladeira` ainda retorna **O Google não reconhece o URL**, sem rastreamento/sitemap de referência reconhecido no índice. O site público já entrega esse URL no sitemap e no índice editorial; não foi encontrado defeito técnico que justifique modificar canonical/noindex. As outras 55 não foram individualmente reinspecionadas; não declarar que todas já estão indexadas. A sessão do navegador mudou de janela/perfil durante o trabalho; a análise prosseguiu com os exports já obtidos, sem acessar arquivos de contas não relacionadas.
- Causa confirmada da discrepância das quatro: atraso do relatório agregado em relação à inspeção individual. Não há causa editorial comprovada para a exclusão do exemplo V8 Pro; novidade, escolha algorítmica e duplicação são hipóteses, não diagnóstico estabelecido.
- Não reenviar sitemap, alterar URL, aplicar redirects ou pedir indexação em massa. Inspeção e recrawl seletivos podem ser avaliados depois de mudanças publicadas; os dados de 8/10 não justificam correções destrutivas.

### Preparação dos dez artigos

- Dez aberturas revistas, dez conjuntos de metadata específicos, três títulos visíveis mais diretos, onze passagens substantivas revistas. Dez diffs completos em `artifacts/seo-editorial-pilot-2026-10-13/REVIEW.md`.
- Resultados observados preservam condições: FT03 com condutor de 76 kg; V9 Max em 19 km com modo forte; GT2000 com cerca de 30 km e indicação aproximada de 60%; respingos do para-lama de uma unidade VL20. Nenhum desses resultados foi convertido em garantia ou autonomia medida até o fim da carga.
- Duas passagens deixaram de usar preços históricos para orientar a compra atual (V9 Max versões e V20 Pro/V8 Ultra). Módulos Radar existentes continuam fonte de preço, sem editar links afiliados.
- Divergência explícita: vídeos distintos GT2000 apresentam estimativas moderadas de alcance diferentes (60–80 versus 80–100 km), sem ensaio comparável de descarga completa. A passagem de comparação GT20 Pro/GT2000 passa a usar capacidade nominal e necessidade de garupa, retirando a faixa estimada em vez de fabricar consenso. Nenhuma afirmação de alcance dobrado.
- Evidência privada com 31 janelas literais extraídas das transcrições completas; `summary_source_excerpt` atualizado e excerpts das passagens verificáveis. Backup, payload e SQL têm extensão `.local` e permanecem ignorados no Git. HTML local de revisão não expõe sourceExcerpt/transcrição.
- Proposta SQL em `release-proposal.sql.local`: transação única, dez locks em ordem estável, proteção de ID/slug/revision/status/indexable/foundation_required e MD5 da transcrição; aborta integralmente em concorrência ou mudança de fonte. Rollback em `rollback.sql.local` exige revision esperada e conteúdo pós-patch, restaura somente campos editados e deixa o trigger incrementar revision. Nenhuma alteração de trigger, schema, RLS ou status.
- Consulta read-only de pré-condições confirmou **10/10 revisões e fontes correspondentes**, todas publicadas, indexáveis e sem foundation_required. Executar de novo imediatamente antes de aplicação autorizada.
- O trigger atual limpa reviewed_at/reviewed_by quando o corpo muda e incrementa revision/updated_at; a proposta respeita esse comportamento, sem fabricar revisão humana nem alterar published_at.

### Matriz posterior

| Perspectiva | Status | Evidência / limite |
| --- | --- | --- |
| Produto | Pass | Dez intenções/decisões, dados de demanda e leitura substantiva; slugs e jornada preservados |
| CTO | Pass | Sem mudança de código público/contrato; renderização pelo ArticleView existente e build aprovados |
| IA/agentes | Pass | Fontes completas disponíveis, excerpts literais, observação/estimativa separados; pipeline não alterado |
| Segurança | Pass | Dados privados ignorados, sem secrets/writes; scripts abortam em revisão ou fonte divergente |
| UX/UI | Pass | Aberturas e headings claros; um H1, fonte HTML, FAQ/Radar/vídeo existentes preservados; preview de conteúdo usa renderer real |
| CX/operação | Pass | Writer/admin e publicação diária preservados; nenhuma alteração de Sheets; concorrência bloqueia o patch |
| Growth/CRO | Pass | Demandas observadas, metadata coerente, preços históricos retirados e rotas mantidas; citações pós-mudança não medidas |
| PMO/QA | Pass | Onze testes específicos do lote, 61 testes do gate, typecheck/build e diff aprovados; publicação segue aprovação específica |

### Fechamento

Lote local pronto para revisão. Nenhuma melhoria foi aplicada aos dez artigos em produção. QA local valida contrato, identidade, metadata, fontes literais e HTML SSR; não é teste de ranking/citação nem execução SQL em sandbox. Scripts de atualização/rollback foram preparados e pré-condições consultadas, mas não executados. Após aprovação: atualizar as dez linhas, verificar revisões e HTML público após cache, medir desempenho/indexação por URL e cesta fixa de perguntas. Não é necessário deploy de frontend para a atualização dos dados editoriais.
