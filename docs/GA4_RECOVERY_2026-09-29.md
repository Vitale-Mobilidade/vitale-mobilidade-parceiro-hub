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

O código local restaura o download imediato e assíncrono do GTM. **O container GTM e o site em produção não foram alterados.** A correção de `page_view` ainda depende de duas mudanças no workspace do GTM e publicação autorizada: retirar `send_page_view=false` da tag `GA4 – Configuração Base` (ID 30) e pausar `GA4 - event_page_view_spa` (ID 28). A medição otimizada de mudanças de histórico já está ativa no fluxo; mantê-la. Não modificar a tag de consentimento, ID de medição ou outras tags.

| Perspectiva | Status | Evidência ou pendência |
| --- | --- | --- |
| Produto e Estratégia | Pass local | Escopo limitado à medição; sem promessa de recuperar dados históricos |
| CTO e Arquitetura | Pass local | Bootstrap imediato com script assíncrono e teste de emissão única; GTM produtivo ainda pendente |
| IA e Agent Engineering | N/A | Nenhum fluxo de IA alterado |
| Segurança | Pass local | Sem payload novo, consentimento ou segredo; tag global segue excluída de `/admin` |
| UX/UI | Pass local | Sem interface alterada; custo de performance do carregamento imediato é risco aceito e deve ser observado após release |
| CX e Operação | N/A | Sheets, CRM e rotinas não mudaram |
| Growth e CRO | Fail para release | `page_view` inicial não volta até a mudança no GTM; conferir GA4 Tempo real e uma navegação SPA após publicação |
| PMO e QA | Fail para release | Teste dirigido 2/2, lint dirigido, `pnpm validate` (typecheck, 59 testes, build) passaram; publicação e smoke produtivo pendentes |

### Fechamento

- Estado: código e documentação locais prontos para revisão; publicação bloqueada até autorização específica para GTM e frontend.
- Rollback: restaurar a versão anterior do GTM e reverter o commit local do bootstrap. Sem migration, banco ou dados produtivos.
- Smoke pós-publicação: abrir `/` e `/quiz` diretamente em sessões de teste, conferir exatamente um `page_view` por entrada no Preview/Tempo real; navegar para `/radar` sem recarga e conferir exatamente mais um; verificar que `/admin` não carrega o GTM. Registrar versão GTM, deploy e horário.
