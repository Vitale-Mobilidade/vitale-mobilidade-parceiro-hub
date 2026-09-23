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
| 1 | `/calculadoras/economia` | Quanto posso economizar por mês? | modal, gasto mensal, km/dia, dias/sem, %, orçamento (+garupa) | até 2 | PREVIEW |
| 2 | `/calculadoras/payback` | Em quanto tempo a bike se paga? | gasto mensal, %, km/dia, dias/sem, orçamento (+garupa) | até 2 | PREVIEW |
| 3 | `/calculadoras/custo-anual-mobilidade` | Quanto gasto por ano para me locomover? | carro/moto, Uber/99, transporte público, estacionamento/outros, % | não (sem km/dia) | PREVIEW |
| 4 | `/calculadoras/uber-vs-bike` | Uber/99 ou bike: qual sai mais barato? | gasto mensal em apps, km/dia, dias/sem, orçamento (+garupa) | até 2 | PLANEJADA — sem link público |
| 5 | `/calculadoras/carro-vs-bike` | Carro ou bike: quanto cada um custa no trajeto? | gasto mensal evitável do carro, km/dia, dias/sem, orçamento (+garupa) | até 2 | PLANEJADA — sem link público |
| 6 | `/calculadoras/transporte-publico-vs-bike` | Transporte público ou bike no mês? | gasto mensal em tarifas, km/dia, dias/sem, orçamento (+garupa) | até 2 | PLANEJADA — sem link público |
| 7 | `/calculadoras/moto-vs-bike` | Moto ou bike elétrica no trajeto? | gasto mensal evitável da moto, km/dia, dias/sem, orçamento (+garupa) | até 2 | PLANEJADA — sem link público |
| 8 | `/calculadoras/tempo-no-transito` | Quanto tempo por ano passo no trânsito? | minutos diários no trajeto atual (ida+volta), dias/sem, semanas/ano | não (sem km/dia) | PLANEJADA — sem link público |
| 9 | `/calculadoras/tempo-recuperado` | Quanto tempo a bike devolve por ano? | minutos diários no trajeto atual, minutos diários estimados de bike, dias/sem, semanas/ano | até 2 se houver contexto | PLANEJADA — sem link público |

As rotas 4–9 seguem o briefing já fechado: rápidas/reativas, sem wizard, sem parâmetros técnicos no fluxo principal (premissas só em "Como calculamos?"). As de tempo (8–9) usam `MobilityTimeEngine` com minutos informados pelo usuário; 52 semanas/ano é a premissa central documentada, não um input principal. Ordem sequencial após custo anual; nenhuma entra no sitemap nem recebe link até estar funcional em PREVIEW.
