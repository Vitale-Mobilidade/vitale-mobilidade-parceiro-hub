# Ajustes de artigos, mídia e mobile — 28/09/2026

## Revisão prévia — estrutural (SEO, IA, Radar, vídeos)

Solicitação: preservar formato aprovado; excluir relações incidentais de bikes, Radar com preço atual e composição inteira para uma bike, remover rodapé editorial, corrigir imagens, mostrar todos vídeos relacionados e reduzir comprimento mobile da home via carrosséis e logo menor. Implementação/publicação autorizadas na mesma tarefa; sem geração IA paga.

| Perspectiva | Impacto / risco / dependência / recomendação                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Refinar fluxo aprovado, preservar artigos. Risco de voltar à complexidade. Depende de dados existentes; prosseguir com ajustes delimitados.                                                  |
| CTO         | SSR e catálogo como fonte única. Risco de carrossel ocultar links SSR, limites de vídeos. HTML completo com scroll-snap e interação progressiva; leitura completa sem schema.                |
| IA          | Relações do artigo vêm dos assuntos no título, não menção incidental. Risco de eliminar comparação real. Matching de variantes e fallback; testes, sem alterar writer/prompt.                |
| Segurança   | Nenhuma credencial/RLS/migration nova. Risco de fallback de mídia incorreta. Usar imagem da mesma bike, não imagem genérica de outro modelo; preservar destinos diretos.                     |
| UX/UI       | Radar de uma bike ocupa largura, preço claro; swipe, setas e pausa no mobile. Risco de movimento/scroll indesejado. Respeitar reduce-motion, foco/interação e visibilidade; desktop em grid. |
| CX          | Completar vídeos e fallback de imagens. Risco de corte silencioso. Examinar fonte/contagens; não executar sync nem recriar conteúdo.                                                         |
| Growth/SEO  | Links/metadata SSR preservados, remover copy solicitada. Risco de falsa atualidade de preço. Exibir só oferta ativa do Radar; indisponibilidade explícita.                                   |
| PMO/QA      | Testes de variantes, lista completa, composição e smoke desktop/mobile. Risco de publicar só código local. Validar main salvo no Lovable, pnpm validate e conferir domínio.                  |

Decisão: implementar nos componentes/helpers existentes, sem alterações de texto/slug/preço no banco; resolver relações na geração futura e na renderização de artigos existentes. Trade-off: carrossel automático só no mobile, com pausa e redução de movimento; mantém todos links no HTML. Rollback por release anterior d6b750b. Critérios: V9 Pro não mostra V40 Pro/V9 Max, bloco único inteiro e preço real, imagens corretas, todas relações de vídeos da fonte, home com swipe/setas/pausa e logo menor, validate verde. Nenhum artigo será gerado como teste.

## Revisão posterior local

| Perspectiva | Estado / evidência                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produto     | Pass: formato de artigo preservado; alterações limitadas a relações, mídia, Radar e mobile.                                                                                                                        |
| CTO         | Pass: SSR conserva todos cards/links; carrossel somente enriquece interação mobile. Vídeos por bike não usam teto; fontes/papéis/RPCs preservados.                                                                 |
| IA          | Pass: escritor/modelo/prompt intactos; bikes do título priorizadas para vínculos de artigo; teste de bike única/comparação/variantes aprovado.                                                                     |
| Segurança   | Pass: sem dados/migration/RLS novos; imagens do mesmo ID/nome, não trocadas entre variantes; destinos diretos intactos.                                                                                            |
| UX/UI       | Pass local: largura inteira quando único Radar; preço ativo e indisponibilidade explícita, carrossel com swipe/setas/pausa e reduce-motion, logo menor no celular. Verificação visual de preview antes do release. |
| CX          | Pass: limites8/12/20 removidos no Radar/artigos/comparador/legado; Radar mostra4 iniciais+expansão com todo restante. Fonte real108 vídeos, V9Max23 e V8Pro12; fixture27 testa completude sem inventar vínculos.   |
| Growth/SEO  | Pass: preço vem apenas de oferta atual; URLs/slugs/textos dos publicados inalterados. Assets de12 bikes antes apontavam para hashes JPG antigos; agora AVIF do bundle atual e OG absoluta no Radar.                |
| PMO/QA      | Pass local:62 testes direcionados e47 regressões do validate, typecheck/build aprovados. Sem chamadas de geração ou sincronização paga.                                                                            |

Limites: o número27 citado pelo responsável não foi encontrado nas associações atuais da fonte. Mostrar todos os vídeos cadastrados, sem forçar relações ausentes. Sem gasto IA, sem reescrever artigos ou modificar histórico/preços. Riscos mitigados: autoplay pausa com foco/interação/aba oculta; reduce-motion desliga autoplay. Imagens remotas válidas preservadas; falha usa somente imagem da mesma bike ou estado indisponível. Publicação segue autorização existente; rollback do release d6b750b.

---

# Portal editorial: busca e blocos intercalados — 25/09/2026

## Revisão pré-implementação

Classificação: **estrutural**. A mudança toca a descoberta de artigos, a entidade Bike/Radar, o Quiz, dados de preço, SEO interno, a composição determinística dos artigos e a versão do prompt editorial. A migration de prompt é preparada localmente, mas **não aplicada** sem autorização específica. Não altera RLS, links afiliados nem artigos persistidos.

| Perspectiva | Impacto                                                                      | Risco                                                            | Dependência                                                            | Recomendação                                                                    |
| ----------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Produto     | O índice prioriza a biblioteca; o artigo oferece decisões durante a leitura. | Excesso de CTAs interromper a análise.                           | Intenção editorial de cada página.                                     | Prosseguir com poucos blocos contextuais, sem vitrine principal no índice.      |
| CTO         | Busca por Bike no SSR e preço pela mesma leitura pública do Radar.           | Nova chamada no loader e preço indisponível.                     | Índice, catálogo e RPC existentes.                                     | Prosseguir com chamada única e fallback honesto sem preço.                      |
| IA          | Próximos artigos precisam ser análises independentes, não relatos do vídeo.  | Reordenar texto ou inventar conclusão.                           | Contrato tipado, prompt versionado e aplicação posterior da migration. | Ajustar instrução e preparar nova versão do prompt; vídeo é complemento visual. |
| Segurança   | Dados públicos de oferta e artigos publicados.                               | Confundir preço da planilha com preço atual ou mostrar rascunho. | Validação de oferta atual e loaders publicados.                        | Usar apenas oferta atual válida do Radar; nenhuma compra direta no artigo.      |
| UX/UI       | Índice mais simples, lateral útil e interrupções visuais no corpo.           | Duplicar Quiz da navegação e poluir mobile.                      | Ordem de leitura responsiva.                                           | Remover Quiz da lateral; um banner intercalado; Bikes abaixo dos conteúdos.     |
| CX/Operação | Pesquisa por modelo e cards de decisão sem curadoria extra.                  | “Mais lidos” sem métrica.                                        | Não há contagem confiável de leitura.                                  | Usar “Artigos em destaque”, seleção editorial, até haver analytics.             |
| Growth/CRO  | Links contextuais artigo → Bike → oferta; busca por modelo.                  | Alegação de preço/ranking não sustentada, perda de contexto SEO. | Canonical/JSON-LD atuais.                                              | Preservar metadados e usar somente preço público atual.                         |
| PMO/QA      | Índice, artigo e preview administrativo compartilham componentes.            | Regressão em preview, SSR ou posição dos blocos.                 | Testes direcionados, typecheck, build e smoke.                         | Prosseguir após `pnpm validate` e inspeção local.                               |

**Conflitos e decisão:** “Mais lidos” exigiria medição que ainda não existe. A lateral mostrará uma lista maior de destaques editoriais sem afirmar popularidade. O preço atual virá da oferta pública ativa do Radar; quando não houver leitura confiável, o artigo apresentará link para o Radar, sem exibir preço de planilha. O artigo mantém o texto e a ordem dos blocos publicados, mas os blocos interativos passam a ser renderizados no ponto editorial, com fallback limitado para artigos antigos.

**Escopo:** retirar a vitrine destacada do índice; buscar por título, resumo e Bike; ampliar lista lateral editorial; remover Quiz lateral; intercalar comparativo, preview real de preço/histórico, Quiz e ferramenta de economia no artigo; exibir preços atuais no comparativo; ajustar o layout determinístico, instrução de geração e preparar versão nova do prompt. Artigos publicados ganham a nova composição sem escrita no banco nem alteração de texto. **Fora de escopo:** analytics de leitura, recálculo de conteúdos publicados, disparo, aplicação da migration, novo texto editorial, compra direta e publicação sem autorização específica. **Aceite:** ofertas apenas do Radar ativo; comparativo aponta para Bike; gráfico usa registros reais da Bike e nenhum ponto inventado; blocos intercalados no corpo; texto não depende do vídeo; índice pesquisável por Bike; SSR/preview preservados; `pnpm validate` verde. **Rollback:** reverter o diff de frontend/layout/instrução; se a migration vier a ser aplicada, criar versão restauradora do prompt anterior (versões anteriores permanecem preservadas). Nenhum artigo persistido é alterado por este corte.

## Revisão pós-implementação local

| Perspectiva | Estado     | Evidência e limite                                                                                                                                                                        |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Pass       | O índice começa pelos artigos; artigo mantém análise e leva ao Radar da Bike antes da oferta externa.                                                                                     |
| CTO         | Pass       | Uma leitura pública do catálogo Radar no loader do artigo; somente ofertas de Bikes ligadas entram no payload. Mini-gráfico SVG SSR, sem biblioteca/client JS adicional.                  |
| IA          | Pass local | Instrução de geração e layout tipado passam a produzir texto independente com blocos intercalados. Nova versão do prompt preparada como migration; **ainda não ativa em produção**.       |
| Segurança   | Pass       | Preço apenas quando `hasCurrentOffer`, `currentPrice` válido e Bike ligada ao artigo. Não há escrita de lead, alteração de RLS, secret ou link afiliado.                                  |
| UX/UI       | Pass local | Quiz saiu da lateral; artigos em destaque vêm primeiro e Bikes depois. Conteúdo longo intercala vídeo, comparativo, dois previews do Radar, Quiz e ferramenta sem mover o texto aprovado. |
| CX/Operação | Pass       | Artigos publicados adotam a composição nova na renderização, sem regravar conteúdo. Sidebar suporta até oito artigos, mas só há dois publicados atualmente; não inventa “mais lidos”.     |
| Growth/CRO  | Pass       | Busca inclui modelos vinculados; comparativo escolhe os dois modelos do título e inclui preço atual; o link segue para `/radar/{bikeId}`, não para afiliado. SEO do artigo preservado.    |
| PMO/QA      | Pass local | Testes de busca, seleção de variantes e fluxo do artigo passaram; `pnpm validate` e smoke SSR de índice/artigo passaram. Publicação e migration exigem autorização para este escopo.      |

**Desvio e correção detectada no smoke:** o artigo “VL20 ou V9 Pro” tinha V9 Max como Bike principal contextual e o comparador antigo mostrava V9 Max + VL20. A seleção agora privilegia os dois modelos citados primeiro no título, sem confundir o modelo genérico com a variante mais longa. O preview do Radar usa o mesmo par.

**Riscos residuais:** a lista editorial não pode se chamar “mais lidos” sem analytics confiável. O gráfico é um resumo de até 30 registros diários disponíveis, não substitui a análise temporal completa do Radar. Se o Radar falhar, os preços não são apresentados como atuais; o link para cada detalhe permanece. O texto já publicado não foi reescrito e deve continuar sob responsabilidade editorial. O prompt versionado só muda após migration autorizada e deploy da função com a instrução nova.

**Status:** implementação local validada; produção permanece na versão anterior. Para release, aplicar a migration de prompt proposta apenas após autorização específica, publicar frontend e função editorial, então conferir `/conteudos`, os dois artigos publicados e a prévia do Radar no domínio. Rollback pelo release Lovable anterior; a versão anterior do prompt continua guardada e pode ser reativada por uma nova versão restauradora, sem apagar histórico.
