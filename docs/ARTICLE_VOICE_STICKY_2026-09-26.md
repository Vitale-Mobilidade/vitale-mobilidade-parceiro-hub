# Voz editorial e leitura de artigos — 26/09/2026

## Revisão pré-implementação (mudança estrutural: IA e SEO)

Decisão consolidada: manter a transcrição como insumo privado para fundamentar fatos, mas gerar um artigo autoral e autossuficiente. O vídeo aparece como complemento visual, sem ser citado como fonte no texto. Não reescrever manualmente artigos publicados. Fixar os destaques da lateral apenas em telas largas e alinhar imagens e texto no comparativo. Nenhuma alteração de produção faz parte desta etapa local.

| Perspectiva | Avaliação e condição |
| --- | --- |
| Produto | Preservar a estrutura de hub e a ordem editorial aprovadas; melhorar somente voz e leitura. |
| UX/UI | Lateral sticky com limite de altura e rolagem própria quando necessário; no mobile permanece no fluxo. Fotos começam no mesmo eixo dos nomes e preços. |
| IA/agentes | Prompt versionado deve instruir voz direta, independente do vídeo, sem alegar teste próprio não comprovado; QA detecta metalinguagem e pede reescrita à IA. |
| Arquitetura | Preservar SSR, blocos tipados, modelo e fluxo existentes. Não adicionar JavaScript para sticky. |
| Segurança | Transcrição continua dado não confiável, sem instruções executáveis; sem secrets/client writes. |
| Operação | Regeneração publicada exige fluxo controlado, revisão e reversão; evitar lote de 100 sem piloto. |
| Growth/CRO | Manter slugs/canonicals, conexões Radar/Quiz e vídeo complementar. Não despublicar artigo sem plano de continuidade SEO. |
| PMO/QA | Testes direcionados, `pnpm validate`, amostra editorial por IA e revisão pós-implementação antes de release. |

Conflito explícito: a voz de especialista não autoriza inventar experiência direta. A redação pode dizer o que conclui, mas deve diferenciar ficha técnica, dado de catálogo e observação realmente sustentada pela transcrição. A exigência de reescrever artigos já publicados pode conflitar com continuidade SEO e revisão humana; a decisão operacional de produção fica pendente de autorização específica.

## Critérios de aceite locais

- O gerador orienta voz direta, natural e independente, sem “na avaliação da Vitale”, “o material analisado” ou referência ao vídeo/transcrição no corpo.
- Se os padrões detectáveis de metalinguagem escaparem na primeira geração, a própria IA recebe pedido de refinamento; se persistirem, o rascunho não é salvo. Uma leitura editorial da amostra continua necessária.
- Nenhum artigo existente é editado manualmente.
- A lateral permanece acessível durante a rolagem no desktop; mobile permanece linear.
- Imagens do comparativo ficam alinhadas à esquerda com seus respectivos textos.

## Estado de produção e próximos passos

Pendente após validação local: publicar frontend/função, ativar a nova versão do prompt e executar piloto de regeneração por IA nos artigos já publicados com checagem de voz, fatos, slug e links. Não tratar o lote futuro de aproximadamente 100 artigos como parte deste release.

## Revisão pós-implementação

| Perspectiva | Resultado local |
| --- | --- |
| Produto | Pass — estrutura intercalada, Radar, Quiz e vídeo complementar preservados. |
| UX/UI | Pass — aside sticky apenas no desktop, altura limitada; imagens do comparativo alinhadas à esquerda com o texto. Verificação visual em produção ainda pendente. |
| IA/agentes | Pass local — prompt versionado troca a orientação contraditória; primeira geração e refinamento seguem voz autoral; QA bloqueia persistência dos padrões detectáveis se persistirem. Amostra real da IA ainda pendente. |
| Arquitetura | Pass — somente CSS e código da Edge Function, sem novo JavaScript de interação no artigo; SSR preservado. |
| Segurança | Pass — transcrição e rascunho são tratados como dados não confiáveis nos prompts; sem mudança de acesso ou secrets. |
| Operação | Pass local, release pendente — artigos publicados não foram alterados. Fluxo atual exige Rascunho antes de Regenerar; isso causa retirada temporária da página. |
| Growth/CRO | Pass local, release pendente — slugs e conexões atuais não foram alterados. Piloto deve checar URL, canonical, links e cobertura editorial antes de republicar. |
| PMO/QA | Pass — teste editorial direcionado (9 testes), `pnpm validate` (typecheck, 47 testes e build) e `git diff --check`. |

Conflito não resolvido para produção: o pedido de regenerar os artigos existentes pela IA versus a indisponibilidade temporária criada pelo fluxo atual. Sem autorização específica para essa janela ou implementação posterior de publicação atômica, não mudar o status dos artigos publicados. O novo prompt também usa a cota de geração da IA: normalmente uma chamada por artigo, com uma segunda chamada apenas se a checagem detectar voz distante; os valores reais de consumo devem ser conferidos antes do piloto e do lote de ~100.

Plano de release, sujeito a autorização: (1) publicar frontend e função após conferir diff e rollback, (2) aplicar a migração idempotente do prompt, (3) confirmar versão ativa no Admin IA, (4) regenerar um artigo piloto no fluxo da IA, validar fatos, voz, slug e layout e republicar, (5) só então repetir para o segundo artigo. Rollback de código por commit anterior; rollback de prompt criando nova versão com o texto anterior; conteúdo antigo recuperável pelos logs de revisão, mas a troca de status deve ser tratada individualmente para reduzir indisponibilidade.

## Execução autorizada em produção — 26/09/2026

Usuário autorizou a regeneração e republicação dos dois artigos com breve indisponibilidade. Prompt v4 ativo, função `editorial-admin` e frontend implantados. Os artigos dos slugs `v9-max-vl20-vs-v9-pro-da-ufofast-qual-vale-mais-a-pena` e `v9-max-s-vs-v9-max-ufofast-qual-comprar-2-baterias` foram regenerados pelo fluxo da IA, revisados e republicados nos mesmos links; ambos responderam HTTP 200 com status `published`, `prompt_version=4` e revisões finais 7 e 10, respectivamente. O QA confirmou voz independente do vídeo, blocos intercalados e números sustentados nas transcrições.

Falha de apresentação do resumo com marcadores Markdown literais foi corrigida reutilizando `InlineText` na introdução e nos cards relacionados, sem alterar a prosa gerada. `pnpm validate` passou com 47 testes, typecheck e build. A verificação visual confirmou resumo formatado, lateral sticky e fotos alinhadas aos nomes e preços.