# Growth — média de acessos por dia

## Revisão pré-implementação

Classificação: pequena. KPI derivado da série diária pública já carregada,
sem novas consultas, contratos, backend, dados, SEO, integração ou coleta.
Base: main 26ab88e, com os quatro novos filtros já publicados.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto e Estratégia | KPI solicitado no resumo do gráfico; manter o período selecionado como referência. Prosseguir. |
| CTO e Arquitetura | Dividir o total diário existente pelo número de dias; não adicionar consulta. Falta de cobertura não pode virar zero nem média parcial silenciosa. Prosseguir com essa condição. |
| IA e Agent Engineering | N/A: sem IA ou agentes na funcionalidade. |
| Segurança | N/A: sem mudança de autorização, dados ou entrada externa. |
| UX/UI | Quarto KPI no resumo, com até uma casa decimal pt-BR e layout mobile acessível; informar dias e hoje parcial. Prosseguir. |
| CX e Operação | Dias com zero entram no divisor. Dias ausentes tornam a média indisponível. Prosseguir condicionado à distinção. |
| Growth e CRO | Usar as mesmas visualizações públicas do gráfico, incluindo repetições e exclusões existentes; não representar visitantes únicos. Prosseguir. |
| PMO e QA | Testes de cálculo renderizado, zero, falta de cobertura, hoje parcial e dia único; lint direcionado e pnpm validate. Prosseguir condicionado aos checks. |

Decisão: média = total de visualizações públicas do período / dias do período,
incluindo hoje quando selecionado e sinalizando que está parcial. Uma casa decimal
no máximo. Sem dados em qualquer dia: —, com explicação de cobertura. Zero medido
é zero. A comparação existente entre períodos não muda. Trade-off: manter o mesmo
recorte do total torna o valor verificável; hoje parcial pode reduzir a média e
será identificado. Nenhum conflito de perspectivas identificado; revisão pelo
mesmo agente, sem alegar independência. Rollback: reverter componente e teste.
Autorização de publicação do painel reiterada pelo usuário durante esta entrega.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Quarto KPI no resumo do gráfico, acompanha o filtro vigente. |
| CTO e Arquitetura | Pass | Cálculo local a partir do total e dias existentes, sem nova consulta. |
| IA e Agent Engineering | N/A | Sem IA ou agentes na funcionalidade. |
| Segurança | N/A | Sem mudança de acesso, dados ou entradas externas. |
| UX/UI | Pass | Lista de definições rotulada, até uma casa decimal pt-BR; uma coluna mobile, duas sm e quatro xl; hoje parcial explícito. |
| CX e Operação | Pass | Zero entra no divisor e ausência de cobertura exibe —. |
| Growth e CRO | Pass | Mesma série do total, sem confundir pageviews com pessoas únicas; comparação existente preservada. |
| PMO e QA | Pass | 13 testes do componente, incluindo cinco casos novos; lint direcionado, git diff --check e pnpm validate aprovados. |

`pnpm validate` concluiu tipos, 69 regressões e build cliente/SSR com exit code 0.
Exemplo da captura: 9.111 / 22 = 414,1, com hoje parcial. Testes confirmam média
fracionária, dias zerados, dia único, hoje parcial e cobertura incompleta, inclusive
com série anterior ausente. Estado: validado localmente, pronto para publicação
já autorizada. Rollback: reverter esta alteração de componente/teste; dados e
filtros ficam preservados. Evidência visual produtiva será registrada após deploy.