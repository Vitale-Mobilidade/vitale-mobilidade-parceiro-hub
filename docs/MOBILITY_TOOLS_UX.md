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
| 4–9 | a definir | 6 calculadoras restantes do briefing (incluindo as de tempo, sobre `MobilityTimeEngine` com minutos informados e semanas/ano editáveis) | ≤ 6 cada | só com contexto suficiente | PLANEJADAS — nome, rota e entradas a confirmar antes de implementar; sem link público |
