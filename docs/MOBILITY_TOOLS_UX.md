# Ferramentas de Mobilidade — contrato global de UX (9 calculadoras)

Status em 23/09/2026. Nada aqui está publicado em produção; rotas implementadas existem só em PREVIEW.

## Regras comuns (todas as rotas)

- **Uma tela**, sem wizard, etapas, submit ou botão Calcular. Resultado atualiza assim que os campos obrigatórios são válidos.
- **Máximo 5–6 entradas simples** (+ toggle opcional como garupa). Campos começam vazios; nunca há valor presumido pela Vitale. Zero aceito onde faz sentido ("sem esse custo").
- **Estados obrigatórios:** vazio honesto (sem número fictício), erro local acessível (`aria-invalid`/`aria-describedby`), resultado zero/negativo exibido como tal, fonte de ofertas indisponível, nenhuma bike compatível (filtros nunca afrouxados).
- **Resultado:** no máximo 4 métricas + 1 insight determinístico. Premissas técnicas só em `<details>` "Como calculamos?".
- **Recomendação condicional:** no máximo 2 bikes reais (elegíveis no Quiz ∩ oferta atual, link `meli.la` válido, preço > 0) **apenas quando a rota tiver contexto suficiente** para filtrar (km/dia → autonomia com margem, garupa → capacidade, orçamento). Sem contexto, sem bikes.
- **CTAs:** ficha da bike, Radar só se monitorada, Mercado Livre direto com analytics não bloqueante; links entre calculadoras só quando respondem à próxima dúvida, sem repassar valores como se fossem outra coisa.
- **Compartilhado:** motores puros em `src/lib/mobility/` (Cost, Time, Recommendation, Projection, Payback) e UI em `src/components/mobility/` (NumberField, Metric, BudgetSelector, PassengerToggle, BikeResultCard, CostProjectionChart). Sem IA, sem API externa, sem PII.

## Ordem e estado

| # | Rota | Pergunta | Entradas principais | Bikes | Estado |
|---|------|----------|---------------------|-------|--------|
| 1 | `/calculadoras/economia` | Quanto posso economizar por mês? | modal, gasto mensal só nos trajetos que faria de bike, km/dia desses trajetos, dias/sem de bike, orçamento (+garupa); sem campo % (100% interno do subconjunto) | até 2 | PREVIEW |
| 2 | `/calculadoras/payback` | Em quanto tempo a bike se paga? | gasto mensal só nos trajetos que faria de bike, km/dia desses trajetos, dias/sem de bike, orçamento (+garupa); sem campo % | até 2 | PREVIEW |
| 3 | `/calculadoras/custo-anual-mobilidade` | Quanto gasto por ano para me locomover? | 4 categorias R$/mês (opcionais) + opcional "quanto deixaria de pagar usando bike" em R$ (0..soma); nunca chamado de economia líquida | nenhuma | PREVIEW |
| 4 | `/calculadoras/uber-vs-bike` | Uber/99 ou bike? | gasto mensal só nas corridas que faria de bike, km/dia e dias/sem dessas corridas, orçamento, garupa | até 2 | PREVIEW |
| 5 | `/calculadoras/carro-vs-bike` | Carro ou bike: quanto cada um custa no trajeto? | gasto variável só nos trajetos que faria de bike do carro (sem fixos), km/dia desses trajetos, dias/sem, continuará com o carro? (sim/não), orçamento opcional, garupa (toggle); "Ajustar premissas" opcional com 1 campo de custo fixo evitado, só se "não" | até 2 | PREVIEW |
| 6 | `/calculadoras/transporte-publico-vs-bike` | Transporte público ou bike no mês? | gasto mensal nas viagens que pretende trocar, tempo diário atual (ida+volta), tempo diário estimado de bike, dias/sem, km/dia antes da troca, orçamento opcional, garupa (toggle); percentual interno = 100% do subconjunto informado, explicado em "Como calculamos?" | até 2 | PREVIEW |
| 7 | `/calculadoras/moto-vs-bike` | Moto ou bike elétrica no trajeto? | gasto variável só nos trajetos que faria de bike da moto (sem fixos), km/dia desses trajetos, dias/sem, continuará com a moto? (sim/não), orçamento opcional, garupa (toggle); "Ajustar premissas" opcional com 1 campo de custo fixo evitado, só se "não" | até 2 | PREVIEW |
| 8 | `/calculadoras/tempo-no-transito` | Quanto tempo por ano passo no trânsito? | minutos de ida, minutos de volta, minutos de bike por dia (ida+volta, estimativa do usuário), dias/sem, km/dia (opcional, só para bikes); orçamento/garupa opcionais em detalhes; semanas/ano (52) editável só em "Como calculamos?"; sem payback nem custo | até 2 (com km/dia) | PREVIEW |
| 9 | `/calculadoras/tempo-recuperado` | Quanto tempo a bike devolve por ano? | tempo atual por dia (ida+volta), tempo de bike por dia (ida+volta), dias/sem, km/dia (opcional, só para bikes), orçamento opcional (+garupa) em detalhes; horas/mês = horas/ano ÷ 12; sem payback nem custo | até 2 (com km/dia) | PREVIEW |

As rotas 5–9 seguem o briefing já fechado: rápidas/reativas, sem wizard, sem parâmetros técnicos no fluxo principal (premissas só em "Como calculamos?"). As de tempo (8–9) usam `MobilityTimeEngine` com minutos informados pelo usuário; 52 semanas/ano é a premissa central documentada, não um input principal. Ordem sequencial após custo anual; nenhuma entra no sitemap nem recebe link até estar funcional em PREVIEW.


Semanas/ano (52) é premissa central documentada em "Como calculamos?" para todas as rotas de tempo, nunca input principal.



## Decisão de UX: subconjunto concreto em vez de "% substituível" (23/09/2026, PREVIEW)

Economia e Payback não pedem mais percentual. A pessoa informa gasto, km/dia e dias/semana **somente dos trajetos que faria de bike**; internamente o motor recebe `replaceablePercent = 100` (100% desse subconjunto — não é suposição sobre o gasto total, e "100%" nunca aparece na tela). Gasto 0 mostra o resultado real (zero/negativo) e não sugere bike. Aplicado a todas as 9 rotas: nenhuma tem campo de porcentagem visível. Uber/Carro/Moto usam o mesmo subconjunto concreto (100% interno); Custo anual pede o valor em R$ que a pessoa acha que deixaria de pagar (opcional, 0..soma, sem custo da bike descontado).

## Recomendação de duas bikes

Filtros rígidos inalterados (elegível/ativa no Quiz ∩ oferta atual atômica, preço > 0, link meli.la, autonomia ≥ km/dia × 1,2, garupa, teto). 1ª = menor preço compatível. 2ª só aparece se tiver ≥ 25% mais autonomia declarada (`RELEVANT_AUTONOMY_GAIN`) ou mais lugares, sendo a mais barata com essa vantagem; senão, uma só. Cards mostram o tradeoff (R$ a mais por +km/+lugar) e quanto falta até o teto quando informado. O rodapé explica que a seleção só varia com distância, garupa e teto, e oferece "Refine no Quiz" como link opcional. O contrato atual de candidatas não traz atributos confiáveis de uso/terreno do Quiz, então nenhum contexto desses é usado e o /escolherbike não foi alterado.

Todas as rotas com bikes (Economia, Payback, Uber, Carro, Moto, Transporte público, Tempo no trânsito, Tempo recuperado) usam `RecommendationFooter` após os cards; nas de tempo, orçamento e garupa ficam junto das bikes e não são necessários para calcular o tempo.

### Filtro opcional "Meu trajeto tem muitas subidas" (PREVIEW)
Toggle compartilhado (`HillsToggle`) junto de garupa/orçamento nas 8 rotas com bikes; não entra na simulação financeira/temporal e altera a seleção na hora. Marcado: só entram bikes com evidência POSITIVA exata no `get_quiz_catalog` — `terrains` contém `muitas_subidas` ou `bestFor` contém `subidas`, ambos validados como arrays de strings (`hasHillTag`). Ausente/desconhecido não conta. Sem regex/IA sobre descrições, sem score do Quiz, sem reordenação por página. Os demais filtros (elegibilidade, oferta atômica, autonomia ×1,2, garupa, orçamento rígido, alternativa com vantagem verificável) seguem iguais; pode resultar em 0 ou 1 bike. O motivo cita apenas "marcada no catálogo do Quiz como indicada para trajetos com subidas" — marcação editorial, não prova de desempenho. Na data da implementação, 4 modelos elegíveis tinham a marcação.

### Regra da segunda bike (revisada)
Capacidade extra não justifica alternativa (garupa já é filtro rígido quando pedida). Com teto informado: 1ª = menor preço compatível; 2ª = bike distinta dentro do teto com MAIOR autonomia declarada, desde que ≥25% (RELEVANT_AUTONOMY_GAIN) acima da 1ª; empate → menor preço. Sem ganho real, só uma bike com explicação. Sem teto: só a "opção econômica provisória" e convite para escolher um teto. Garupa/subidas valem para as duas.
