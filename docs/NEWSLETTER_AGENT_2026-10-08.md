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

## Revisão posterior e evidências
| Perspectiva | Resultado local / limitação |
| --- | --- |
| Produto | Três leituras obrigatórias; seleção insuficiente bloqueia em vez de repetir. Acervo e diversidade preservados. |
| CTO | Writer/renderer existentes; Radar fora do texto IA; request.call(globalThis), histórico, ledger e transporte intactos. |
| IA | Contrato sem curiosidade, guard de abertura e revisor bloqueiam gancho surpresa explícito ou disfarçado. Evidência literal/reparo único preservados. Aprovação real do novo prompt ainda não verificada. |
| Segurança | Escape/allowlist e testes de autoria literal intactos; nenhum secret/contato consultado. Resend Ask each time não alterado. |
| UX | Cartões inspecionados 1280px e 390px sem overflow; dez imagens carregadas. Tabelas inline e preços únicos. Inbox Outlook/Gmail ainda pendente. |
| CX | Admin identifica abertura breve e três leituras; nenhuma geração real/envio/ativação neste corte. |
| Growth | 25 destinos com UTM no QA do renderer; Quiz/vídeos/numeração preservados. |
| PMO | 113 testes em nove arquivos passaram (54 newsletter + 59 regressões); verificador automático do ambiente registrou build OK. Não executei pnpm validate manualmente: o ambiente executa types/build automaticamente. Não apresentar isso como execução literal de pnpm validate. |

QA visual em `/tmp/browser/newsletter-layout/`: renderer-only.html (20.933 bytes), radar-mobile.png e radar-desktop.png. Conteúdo histórico da prova anterior foi reaproveitado apenas para testar o renderer; não é geração/aprovação da nova abertura, nem foi enviado. Artefato antigo `artifacts/newsletter-agent-proof.html` permanece intacto como evidência histórica, não prova deste release.

Decisão pós-revisão: GO para código preparado; geração real e inbox ainda são gates pendentes. Alvo500–700 palavras e guard350–850 preexistentes preservados conforme pedido de manter textos; não confundir alvo editorial com validação exata. Memória das duas últimas aberturas preservada; histórico completo de artigos enviados continua separado. Marca não é inventada: cartão usa nome do catálogo ligado pelo bikeId, com fallback ao nome real do Radar; não há campo brand no leitor atual.

## Como homologar UMA prévia real depois
1. No ambiente com esta revisão, entrar como administrador em `/admin/newsletter` e clicar uma vez em **Gerar prévia com conteúdo publicado**. A ação `preview` chama automaticNewsletter → writer → validação → reviewer → renderResendNewsletter, sem Resend, campanhas ou consumo de número de edição.
2. Alternativa existente: requisição privada já assinada ao worker com `x-newsletter-mode=preview`; nunca copiar assinatura/JWT para chat/arquivos. Não criar endpoint ou segredo novo.
3. Em caso de falha, guardar somente código seguro/status/tempo e parar, sem nova geração. Em sucesso, conferir conteúdo e exportar HTML; identificar esta prova como nova geração real, não usar fixture de QA.
4. Só então testar uma vez para o destinatário autorizado, preservando Ask each time e sem lista/campanha. Nenhum envio feito agora. Não publicar/ativar a rotina automaticamente.

Rollback de código: reverter apenas ajuste da abertura/Radar/admin/testes; preservar ledger, fontes, cron e segredos. Não apagar edições ou reaplicar migration.
## Prova real pós-correção (08/10/2026)

### Diagnóstico anterior (request 10276)
- Duas revisões rejeitaram: dia de preparação (quinta) ausente no input do revisor; ampliações factuais não sustentadas (unidade da bateria, trajeto/alcance, garagem, boleto).
- Correção mínima em `b9235c9`: revisor recebe `weekday`, distingue preparação de envio, proíbe ampliar fatos; orçamento de palavras proporcional ao número de fontes. Grounding não foi afrouxado.
- Geração após a correção: 2 chamadas, `approved:true`, 684 palavras, 25 UTMs. Prova perdida com o `/tmp` antes de ser copiada ao Git.

### Oito revisões pós-correção
1. Produto: abertura breve sem curiosidade; três leituras, Radar e agenda preservados.
2. CTO: mudança restrita a prompts/orçamento; máx. 4 chamadas e 120 s por edição.
3. IA: revisor independente com contexto temporal; autocorreção única, sem loops.
4. Segurança: fontes tratadas como dados não confiáveis; nenhum segredo/contato no prompt ou na saída.
5. UX: cartões Radar email-safe; sem prosa longa.
6. CX: sem pressão de compra nem promessas de desconto.
7. Growth: UTMs e links ao Radar/Quiz preservados.
8. PMO: envio e ativação continuam dependentes de aprovação humana; cron/newsletter OFF.

### Nova geração autorizada (08/10/2026, 12:05 UTC)
- Runtime `b9235c9`, edição #1 do ledger (histórico enviado vazio), weekday 4.
- 4 chamadas gateway HTTP 200 (~21 s, ~13 s, ~22 s, ~17 s): redator → revisor reprovou → autocorreção → revisor reprovou.
- Resultado: `newsletter_writer_review_failed`. Nenhum HTML/JSON aprovado; nada salvo em `artifacts/`. Os apontamentos do revisor não foram capturados (o script não registrava as razões) e não houve nova tentativa, conforme instrução.
- Limitação: o revisor reprova de forma não determinística (aprovou na rodada anterior com o mesmo código). Próximo passo exige decisão humana: nova tentativa com captura das razões ou ajuste de prompt.

### Causa comprovada da reprovação de 12:06 UTC (sem nova geração)
Fonte: logs do AI Gateway (somente leitura), salvos em `artifacts/newsletter-diagnostics/2026-10-08-review-failed.json`.
- Revisão 1 (`01a11b68-0832…`): (a) abertura usava o para-lama como gancho "para puxar conversa" — violação real da regra; (b) "manutenção" listada como custo, mas a fonte a trata como receita — erro real do redator.
- Revisão 2 (`01a11b68-9210…`): a autocorreção resolveu (a) e (b), mas **reescreveu partes não apontadas** e criou dois erros novos: "Sol forte e poça d'água" em article-1 (piada com cenário ausente) e "GT2000 cruzando São Paulo" no preheader (fonte: 6–7 km Faria Lima → Alto de Pinheiros).
- Descartado: proibição de interjeição/"Ah" e `weekday` não aparecem em nenhuma issue; não causaram falso negativo. As quatro issues são procedentes; o revisor não errou.
- Causa: a correção regenerava o rascunho inteiro, então cada ciclo podia introduzir novas afirmações sem suporte.

### Correção
- `mergeNewsletterCorrection`: após reprovação, campos/seções não citados nas issues voltam exatamente ao rascunho anterior (issue genérica mantém a versão corrigida). O revisor continua checando o texto inteiro; grounding inalterado.
- Prompt: piada comenta fato da fonte sem acrescentar clima/lugar/escala/custo; regras valem para assunto/preheader/headline; correção copia literalmente o que não foi apontado.
- `writeNewsletter`/`automaticNewsletter` aceitam `onDiagnostic` (rascunhos, issues, códigos; sem segredos). `scripts/newsletter-proof.ts` sempre grava em `artifacts/newsletter-diagnostics/`.
- Testes: regressão reproduzindo o caso (preheader e article-1 preservados, abertura/article-2 corrigidos) + issue genérica. 47 testes de newsletter passaram.

### Oito revisões da correção
Produto: voz divertida mantida; humor só sobre fatos. CTO: mudança local, mesmo limite de 4 chamadas. IA: elimina regressão na autocorreção sem afrouxar o revisor. Segurança: diagnóstico sem env/headers/contatos. UX/CX: sem mudança visual. Growth: UTMs/Radar intactos. PMO: sem geração, envio ou ativação nesta etapa; próxima execução usa o script com logging.
