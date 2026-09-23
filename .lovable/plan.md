# Calculadora de economia em uma tela

## Brief de decisão
- **Decisão do visitante:** estimar se substituir parte do deslocamento por bike elétrica reduz seu gasto operacional e quais até duas bikes reais cabem no cenário.
- **Resposta no topo mobile:** título curto, seis entradas essenciais e resultado automático assim que os dados obrigatórios forem válidos.
- **Próximos passos:** conhecer a bike, consultar Radar somente quando monitorada e abrir a oferta atual diretamente.
- **Fontes e recência:** elegibilidade do catálogo do Quiz combinada por `bikeId` com oferta pública atual; sem alternativa estática ou preço inventado.
- **Estados:** formulário incompleto, erro local, 0% substituído, economia zero/negativa, orçamento inválido, catálogo indisponível e 0/1/2 bikes reais.
- **Métrica:** conclusão de uma simulação válida e cliques contextuais nas bikes, sem bloquear o link afiliado.
- **Dependências:** apenas motores e leitores existentes; sem banco, planilhas, funções operacionais, Quiz ou Radar.

## Implementação
1. Reorganizar `MobilityCostEngine` para aceitar o modo rápido baseado no gasto mensal informado, preservando o contrato detalhado e seus testes antigos. Centralizar energia por km e manutenção mensal em `config.ts`.
2. Adicionar funções puras e testáveis para projeções de 12/24/36 meses, payback e seleção de duas recomendações distintas: menor preço e alternativa de maior autonomia/capacidade.
3. Refazer `/calculadoras/economia` como uma única área reativa, sem etapas, envio ou botão Calcular: seis entradas principais, garupa, presets de orçamento e erros locais acessíveis.
4. Mostrar no máximo quatro números-chave, insight determinístico, gráfico SVG reutilizável e cards de até duas bikes reais com seleção sem recarregar e CTAs já válidos.
5. Preservar metadata, canonical, JSON-LD, header/footer e atualizar somente a copy de `/ferramentas` se ela deixar de corresponder ao fluxo final.
6. Registrar no ROADMAP a nova filosofia e o status PREVIEW/não publicado.

## Revisão pelas oito perspectivas
- **Produto/CX:** resposta imediata, limites e premissas explícitos; nenhuma promessa de economia.
- **CTO/IA:** motores puros reutilizáveis, SVG leve e nenhum cálculo por IA.
- **Segurança:** validação finita, nenhum dado pessoal e links atuais preservados byte a byte.
- **UX:** uma tela, mensagens junto aos campos, teclado, alvos de toque e ordem mobile solicitada.
- **Growth:** apenas próximos passos relacionados à bike real selecionada, sem manipular o resultado.
- **PMO/QA:** delta restrito à frente de Ferramentas, reversível e mantido apenas na prévia.

## Validação
- Testes dirigidos para modo rápido, projeções e duas recomendações: 0%, negativos, inválidos, economia negativa, orçamento e ausência de bikes.
- Typecheck e build uma vez; checagem visual e de interação em 1280×720 e 390×844.
- Não executar auditoria ampla e não publicar.
