# Auditoria de custo editorial — 09/10/2026

Base operacional GitHub: `328eac8`; branch local `codex/editorial-review-cost`. Capturas do operador mostram escrita/correção 0,37 e revisão 0,67 (40.187 tokens de entrada, 292 de saída). Não há exportação do histórico integral da execução nem confirmação do código implantado da Edge Function; não atribuir todos os tokens a um campo nem prometer economia em créditos.

## Governança pré-implementação
Classificação: estrutural (IA e Edge Function Supabase). Auditoria e implementação local, sem chamadas pagas, banco de produção ou deploy.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
|---|---|---|---|---|
| Produto | Menor gasto por publicação | Economizar enfraquecendo qualidade | Gate factual preservado | Prosseguir com condições |
| CTO | Contexto seletivo e cache no capture existente | Cache obsoleto | SHA-256 do input, política, modelo, schema, revisão e corpus | Prosseguir |
| IA | Pares selecionados por triagem existente | Triagem não detecta paráfrase distante | Enviar todos os pares com alertas ou score <75; fonte integral | Prosseguir com condições |
| Segurança | Sem novos endpoints ou secrets | Aprovação reaproveitada indevidamente | Cache privado, resultado válido, fingerprint exato | Prosseguir |
| UX/UI | Mesmo contrato e mensagens | Rejeição exige intervenção | Estado needs_review existente | Prosseguir |
| CX | Evitar correções que repetem os mesmos erros | Interromper recuperação útil | Apenas erros idênticos após correção; revisão humana | Prosseguir |
| Growth | Preservar qualidade, metadata e originalidade | Menos contexto de comparação | Corpus completo na triagem local | Prosseguir com condições |
| PMO/QA | Testes offline e documentação | Divergência de produção | Base GitHub atual, testes dirigidos e pnpm validate | Prosseguir |

Conflito: reduzir transcrição maximiza economia, mas trechos escolhidos pelo próprio escritor não provam ausência de contradição. Decisão: preservar fonte integral neste patch; não implementar recuperação seletiva sem casos de fidelidade. Troca de modelo também requer comparação de qualidade, adiada sem gasto autorizado. Triagem lexical tem risco residual de paráfrase distante, já presente no sistema; o modelo anterior via apenas cinco corpos arbitrariamente mais próximos. Agora recebe todos os pares suspeitos, sem corte por quantidade.

Decisão consolidada: reduzir contexto do corpus nas duas revisões, remover lista global de nomes da revisão automática (catálogo das bikes associadas preservado), cache de aprovação automático para input idêntico, bloquear repetição dos mesmos erros após correção. Aceite: sem pares irrelevantes; suspeitos completos; mudança de fonte/texto/catálogo/corpus/política/modelo/schema/revisão invalida cache; checks locais continuam a cada tentativa; nenhuma aprovação inválida permite publicação. Fora do escopo: deploy, migração, alteração de modelo, substituição da revisão por autoavaliação, correção parcial de seções e remoção da fonte. Rollback: reverter patch da função e helper; cache com política diferente é ignorado, sem migration.

## Necessidade das etapas
| Etapa | Necessidade | Decisão |
|---|---|---|
| Escrita com fonte | Fundamentar artigo e extratos literais | Manter; código atual limita a 90 mil caracteres |
| Revisão factual independente | Conferir suporte e contradições do artigo concluído | Manter uma por versão; não é substituída pela nota do escritor |
| qualityScore | Número auxiliar, não é o trabalho principal | Não demanda uma chamada exclusiva; automático nem usa a nota como gate |
| Corpus inteiro no prompt | Comparação local pode selecionar pares | Remover contexto não suspeito |
| Até cinco corpos independentemente de risco | Comparações sem indício gastam contexto | Substituir por pares com alerta ou score <75 |
| Nova revisão de input idêntico aprovado | Não acrescenta evidência | Reaproveitar aprovação exata |
| Reescrita completa | Hoje usada para falhas e mudanças de recorte | Manter por compatibilidade; correção parcial exige contrato de localização de issues e preservação de blocos |
| Mesmos erros após correção | Nova tentativa cega sem diagnóstico | Parar e encaminhar para revisão humana |
| Reparar sourceExcerpt | Só ocorre quando prova falta/não é literal | Manter condicional; spans sobrepostos aumentam input, otimização separada |
| SEO separado | Fluxo foundation manual tem chamada própria | Não confundir com fluxo automático; unificação depende de schema e evidências |

A captura da chamada 0,37 contém instrução de correção: o fluxo pode ter custos anteriores não visíveis. Cada chamada é independente: reenviar transcrição implica novo processamento; store=false não oferece memória compartilhada. Limite atual: até duas correções, além da escrita inicial; publicação revisa cada novo resultado. O patch não promete um preço por artigo.

## Resultado implementado localmente
- Helper de seleção aplica triagem determinística a todo o corpus, envia apenas pares com alertas ou diversidade <75, mantendo seus corpos integrais e sem limite artificial de cinco.
- Ambas as revisões usam o helper; o automático recebe somente os nomes das bikes associadas (o catálogo dessas bikes continua integral).
- Aprovação automática persiste assessment e SHA-256 no capture existente. Reuso exige versão de política, fingerprint e revisão exatos, pass=true e assessment completo aprovado. Fingerprint inclui prompt, modelo, schema, artigo enviado, transcrição, catálogo, diversidade e corpus inteiro. Checks determinísticos, fonte original e capa rodam novamente mesmo com cache.
- Rejeições idênticas após uma correção encaminham a needs_review; diagnósticos diferentes conservam limite original de duas correções.
- Relatório registra caracteres do payload, quantidade de pares enviados e reviewReused; caracteres não são tokens nem preço.
- Nenhuma migration, dependência nova, mudança de UI ou execução paga. Harness offline teve dois imports pré-existentes registrados, pois falhava antes de executar a função atual.

### Outras chamadas condicionais encontradas
A escrita pode acionar vitale_rewrite para voz editorial inválida e depois vitale_voice_patch apenas para campos ainda bloqueados; ambas recebem a fonte novamente. São condicionais, não obrigatórias em cada artigo. A segunda já corrige campos específicos. Remover fonte dessas edições sem outra conferência factual poderia mudar condições e números. O reparo de prova literal também é condicional. No fluxo automático analisado, não há chamada obrigatória separada de SEO seguida dessa mesma revisão de publicação; qualityAndPublish pertence ao fluxo foundation manual. Portanto, não afirmar que todo artigo paga duas auditorias diferentes antes de publicar.

## Governança pós-implementação
| Perspectiva | Status | Evidência/justificativa |
|---|---|---|
| Produto | Pass | Contexto evitável removido; gate factual independente preservado |
| CTO | Pass | Cache exato no armazenamento existente; sem schema novo; typecheck aprovado |
| IA | Pass | Fonte integral preservada; todos os pares suspeitos completos; testes de seleção e invalidação |
| Segurança | Pass | Cache privado, SHA-256, checks locais repetidos e bloqueio de resultados incompletos |
| UX/UI | Pass | Contratos e estados existentes; nenhuma alteração de interface |
| CX | Pass | Repetição de falhas vai a revisão humana; diagnósticos novos ainda permitem correção limitada |
| Growth | Pass | Triagem integral, catálogo relevante e revisão factual/metadata preservados |
| PMO/QA | Pass | 74 testes dirigidos, pnpm validate (61 regressões + typecheck + build), diff check e documentação |

Fechamento: implementação local concluída, sem deploy/merge nem alteração de produção. Build emite avisos existentes de inputValidator deprecado e vite-tsconfig-paths. Última alteração após validate acrescentou apenas teste de integração; testes dirigidos e typecheck repetidos. Sem benchmark pago nem histórico integral real: economia por artigo depende do corpus selecionado; reuso só economiza quando uma aprovação é tentada de novo para input idêntico. A revisão necessária não torna 0,67 um preço obrigatório. Nenhuma estimativa percentual de créditos é comprovada.

### Condição de aplicação externa
AÇÃO: implantar a Edge Function editorial-admin com o helper novo, após revisar o diff contra a versão realmente implantada.
MOTIVO: reduzir contexto e repetições do fluxo editorial.
IMPACTO: revisão/correção automática e seleção de pares no QA manual; novas execuções somente.
RISCO: médio; triagem lexical pode não apontar paráfrases distantes, exigindo acompanhamento editorial.
CUSTO EXTERNO: não estimado para deploy; testes reais de geração consomem créditos e não foram feitos.
TESTES JÁ FEITOS: 74 testes offline, validate com 61 regressões, typecheck e build, diff check.
ROLLBACK: reimplantar função anterior; caches v6 são ignorados pela versão anterior, sem migration.
Estado: aguardando autorização específica antes de qualquer aplicação externa; nenhuma publicação realizada nesta task.

## Decisão de release atualizada — preservação de cobertura
O responsável autorizou implementar e publicar em 09/10, condicionando a economia à preservação da qualidade. Reavaliação antes de release: excluir todos os pares sem alerta podia retirar um dos cinco corpos revisados anteriormente. Esse risco foi recusado. A versão final preserva obrigatoriamente os cinco pares mais próximos selecionados pelo código anterior e acrescenta todos os pares com alertas ou score <75. Omite apenas a metadata dos demais pares, que o prompt anterior já proibia usar para concluir duplicação narrativa. Também preserva a lista global de nomes canônicos; a otimização desse campo foi retirada. Esta decisão substitui as referências anteriores a enviar exclusivamente suspeitos e remover o catálogo global.

O corpus existente representa body com limite de 4.000 caracteres, seções com limite de 1.200; “corpos preservados” refere-se a essa representação anterior, não a textos originais ilimitados. Nenhum desses limites foi reduzido. Correções são interrompidas por erros iguais somente se a revisão anterior pertence à mesma fonte e a revisão do artigo mudou.

| Perspectiva | Revisão da decisão de release |
|---|---|
| Produto | Prosseguir: economia sem retirar os cinco pares antes analisados nem mudar o texto/capa |
| CTO | Prosseguir: usa a mesma ordenação estável da seleção antiga; cache completo e testes de invalidade |
| IA | Prosseguir: fonte/modelo/prompt/schema e cinco corpos anteriores preservados; suspeitos adicionais nunca cortados |
| Segurança | Prosseguir: autorização humana registrada, cache privado, checks determinísticos antes de reuso |
| UX/UI | Prosseguir: fluxo e gate de publicação permanecem; needs_review continua disponível |
| CX | Prosseguir: erros repetidos só interrompem após revisão nova do artigo para a mesma fonte |
| Growth | Prosseguir: nenhum critério de qualidade, catálogo de nomes ou evidência anteriormente revisada foi reduzido |
| PMO/QA | Prosseguir condicionando release a testes atualizados, validate, diff operacional e smoke sem geração paga |

Medição somente leitura sobre 119 artigos não arquivados no banco Lovable integrado, sem PII. Dez artigos mais recentes comparados localmente contra corpus construído de artigos (não inclui outlines sem texto): peerArticles antigo 126.420–128.884 caracteres, novo 26.900–29.560 caracteres; redução de 77%–79% desse campo, cinco pares originais preservados em 10/10. Essa medição não é dos tokens totais nem dos créditos finais. Fonte, artigo e demais campos continuam sendo processados. A amostra não é uma avaliação de qualidade de respostas reais geradas e não justifica prometer custo fixo de 1 crédito.

Escopo externo autorizado: publicar somente o backend preparado. Não regenerar artigos/capas nem publicar conteúdo editorial para testar. Rollback: reimplantar os arquivos de backend da base 328eac8. Sem migration, alteração de RLS ou frontend.

### Gate final antes da implantação
Oito perspectivas: Pass para o escopo final que preserva top cinco, fonte, modelo, catálogo e critérios; condições de teste satisfeitas. 75 testes direcionados e pnpm validate (61 regressões, typecheck, build) aprovados, diff check limpo. Projeto Lovable confirmado ready, banco integrado enabled, latest_commit_sha igual à base GitHub 328eac8. Escopo de publicação autorizado pelo usuário nesta thread; custo pontual de implantação via Lovable comunicado como baixo a moderado, modo padrão. Nenhuma geração paga de artigo/capa autorizada como teste.
