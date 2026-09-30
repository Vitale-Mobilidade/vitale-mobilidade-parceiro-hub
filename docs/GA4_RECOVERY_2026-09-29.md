# Recuperação da medição GA4 — 29/09/2026

## Revisão pré-implementação

Classificação: **estrutural**, por alterar medição pública e GTM. Objetivo: recuperar `page_view` de entradas diretas sem duplicar visualizações na navegação interna. Fontes: propriedade GA4 Vitale Mobilidade, fluxo web `14789647385` (`G-LXMH4RWQHV`), container publicado `GTM-NM9MGXNM` e HTML do domínio.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Recuperar leitura do funil de aquisição | Confundir medição com tráfego real | Comparar antes/depois no GA4 | Prosseguir com correção mínima |
| CTO e Arquitetura | Bootstrap global de tags e acionador de página | Dupla contagem ou perda no primeiro acesso | Container e rota raiz vigentes | Restaurar bootstrap imediato e um único disparo inicial |
| IA e Agent Engineering | Nenhum fluxo de agente muda | N/A | N/A | N/A, sem código de IA afetado |
| Segurança | Eventos e URLs chegam ao GA4 | PII na query ou mudanças de consentimento | Preservar consentimento e política de dados | Não alterar consentimento nem enviar payload novo |
| UX/UI | Carga assíncrona de tags pode custar desempenho | Aumento de trabalho antes da pintura | Medir impacto de build e página | Aceitar custo proporcional à medição correta |
| CX e Operação | Painéis de GA4 voltam a orientar operação | Histórico perdido não é recuperável | Conferência em Tempo real | Validar sem alterar Sheets/CRM |
| Growth e CRO | Entradas de YouTube/Google passam a registrar visualização | Métricas distorcidas por duplicatas | Configuração do GTM e teste de entrada direta | Corrigir primeiro acesso e navegação SPA |
| PMO e QA | Gate de release para analytics | Declarar recuperação só pelo snippet | Teste dirigido, `pnpm validate`, Preview/Tempo real | Publicar apenas após aceite específico |

### Evidência e conflito

- O GA4 aberto no Chrome corresponde ao ID `G-LXMH4RWQHV` presente no GTM. Uma entrada direta controlada na Home não apareceu no relatório em Tempo real.
- O container publicado configura a tag base com `send_page_view=false`. A única tag manual de `page_view` usa o acionador `gtm.historyChange`; a entrada direta não o satisfaz. O GTM publicado também mantém `All Pages` para a tag base. No fluxo GA4, a medição otimizada de páginas está ativa e a opção de mudanças de histórico está marcada.
- O código de 29/09 adia o download do GTM até `load` + duas pinturas + `idle` ou interação. Esse atraso pode perder visitas curtas, mas não explica sozinho os zeros anteriores a 29/09.
- Growth prioriza cobertura imediata; UX prioriza carregamento leve. Decisão: restaurar carga assíncrona imediata do GTM e medir depois o custo de performance. Não otimizar às custas da coleta sem dados de campo.

### Decisão consolidada

- Escopo: restaurar o bootstrap imediato do GTM no código; na tag base do GTM, remover `send_page_view=false` para recuperar o evento inicial e manter a medição otimizada de mudanças de histórico; pausar a tag manual `GA4 - event_page_view_spa` para evitar duplicatas.
- Dependências: um único evento inicial, sem mudança no ID de medição, consentimento, afiliados ou integrações.
- Aceite: entrada direta em Home/Quiz gera um `page_view`; navegação interna gera um por rota; sem duplicata; GA4 Tempo real recebe os eventos após publicação.
- Fora de escopo: eventos de conversão, `affiliate_click`, atribuição histórica e publicação sem autorização.
- Rollback: reverter o commit de bootstrap e a versão do container GTM; nenhuma alteração em dados ou banco.

## Revisão pós-implementação

O código restaura o download imediato e assíncrono do GTM. No GTM, a versão **14** foi publicada em 29/09/2026, 21:50 BRT: a tag base `GA4 – Configuração Base` (ID 30) deixou de definir `send_page_view=false`, e `GA4 - event_page_view_spa` (ID 28) foi pausada. O JavaScript público do contêiner confirmou a versão 14 e as duas alterações. A medição otimizada de mudanças de histórico permanece ativa no fluxo; consentimento, ID de medição e demais tags não mudaram.

No Tag Assistant Preview, a entrada na Home produziu um hit de visualização de página. Navegar para `/radar` produziu mais um hit, totalizando dois, sem disparo da tag manual pausada. O frontend foi publicado no domínio atual a partir do commit `f021ba3`; o HTML produtivo de `/`, `/quiz` e `/radar` respondeu 200 e contém o bootstrap imediato. Em `/admin`, a guarda `!location.pathname.startsWith('/admin')` permanece no snippet.

Limite da verificação: na sessão usada para o Preview, o Tag Assistant indicou `analytics_storage` **Negado**, conforme a tag de consentimento padrão do contêiner. O GA4 Home ainda mostrava 0 usuários ativos nos últimos 30 minutos após a publicação. Os hits enviados não provam que essa sessão aparecerá no Tempo real: com consentimento negado, o Google limita a medição e pode usar pings sem cookies e modelagem. A decisão de consentimento existente não foi modificada. Conferir os relatórios processados após o próximo ciclo e uma sessão que conceda consentimento antes de afirmar recuperação numérica. Referência: [Google, consent mode](https://support.google.com/analytics/answer/10000067).

| Perspectiva | Status | Evidência ou pendência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Escopo limitado à medição; sem promessa de recuperar dados históricos |
| CTO e Arquitetura | Pass | Bootstrap imediato com script assíncrono e teste de emissão única; GTM versão 14 ativo |
| IA e Agent Engineering | N/A | Nenhum fluxo de IA alterado |
| Segurança | Pass | Sem payload novo, consentimento ou segredo; tag global segue excluída de `/admin` |
| UX/UI | Pass | Sem interface alterada; custo de performance do carregamento imediato é risco aceito e deve ser observado após release |
| CX e Operação | N/A | Sheets, CRM e rotinas não mudaram |
| Growth e CRO | Pass técnico; resultado em GA4 pendente | Preview mostrou um `page_view` inicial e outro na navegação SPA; versão 14 publicada. Realtime da sessão com consentimento negado permaneceu em 0 |
| PMO e QA | Pass técnico; acompanhamento pendente | Teste dirigido 2/2, lint dirigido, `pnpm validate` (typecheck, 59 testes, build) e smoke HTTP produtivo passaram; contagem processada no GA4 ainda não comprovada |

### Fechamento

- Estado: usuário autorizou publicar; GTM versão 14 ativa, frontend publicado a partir de `f021ba3` no domínio atual. A evidência técnica confirma emissão de hits, mas a recuperação dos números exibidos no GA4 segue pendente.
- Rollback: restaurar a versão 13 do GTM e reverter o commit do bootstrap. Sem migration, banco ou dados produtivos.
- Acompanhamento: conferir o relatório de páginas do GA4 após processamento, separado por status de consentimento quando disponível; validar uma sessão de teste com consentimento concedido, sem alterar a escolha de outros usuários. Manter versão 13 do GTM e commit anterior `699e7ff` como referências de rollback.
