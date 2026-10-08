# Agente newsletter — abertura e Radar, 08/10/2026

## Governança prévia e decisão consolidada
SQUAD_GOVERNANCE.md e EXECUTION_GUARDRAILS.md são referenciados pelo projeto, mas não estão disponíveis neste checkout. Esta revisão aplica as oito perspectivas e os limites explícitos do responsável; não afirma ter seguido documentos indisponíveis.

| Perspectiva | Decisão / risco / gate |
| --- | --- |
| Produto | Retirar curiosidade também da intro; manter edição autônoma, três leituras diversas e acervo. Não preencher falta de diversidade. |
| CTO | Alterar contrato de conteúdo, prompt e renderer existentes; não criar writer, transporte ou schema de banco. Preservar fetch.call(globalThis), memória/ledger e agenda. |
| IA | Abertura breve com humor editorial, sem gancho de fato-surpresa. Evidências literais e revisor independente continuam obrigatórios. Modelo não muda. |
| Segurança | Fontes são dados não confiáveis, HTML escapado, URLs permitidas; nenhum contato/segredo no modelo. Não modificar consentimento ou Ask each time. |
| UX | Cartões em tabelas inline: foto contida, identificação real, queda e preços únicos, histórico discreto. Datas globais devem preservar contexto do comparativo. |
| CX | Diferenciar QA local de conteúdo gerado/aprovado e de entrega. Não enviar nem ativar neste corte preparatório. |
| Growth | Preservar #N, Quiz, vídeos e UTMs; retirar linguagem de compra e redundância sem inventar urgência. |
| PMO | Testes direcionados, verificação visual e revisão posterior; sem publicar antes da validação. Geração real/teste são gates posteriores. |

**Decisão:** GO para preparação local isolada; NO-GO para publicação/envio/ativação nesta execução. Preservar fontes/curadoria e layout editorial fora da abertura e Radar. Não escrever newsletter manual nem realizar chamadas pagas de geração.

## Modelos reais inspecionados (sem troca)
- Newsletter: `openai/gpt-5.6-sol` em newsletter-writer.server.ts, redação e revisão.
- Artigos: `openai/gpt-5.6-sol` (ARTICLE_MODEL) em editorial-admin/index.ts.
- Capas de artigos, fora do escopo: `google/gemini-3.1-flash-image` (COVER_MODEL).
- Transporte newsletter permanece Responses `/v1/responses`, com `fetch.call(globalThis)` e headers existentes. A dívida do transporte buffered/timeout é preexistente e não foi migrada neste ajuste.

## Limites e custo
Sem DNS, schema, migrations, segredos, banco, cron ou campanhas. Testes com respostas simuladas não gastam IA. Prévia real usa duas chamadas (redator/revisor), no máximo quatro com a autocorreção existente; valor depende do consumo do gateway, sem preço inventado. Não gerar novamente automaticamente após falha na homologação. Compatibilidade de inbox exige teste único posterior; navegador não comprova Gmail/Outlook.