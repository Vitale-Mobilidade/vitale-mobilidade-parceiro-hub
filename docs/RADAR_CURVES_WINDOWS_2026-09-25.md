# Radar: curvas e janelas de histórico — 25/09/2026

## Governança — revisão pré-implementação

**Classificação:** estrutural, porque altera a apresentação do histórico do Radar.
**Objetivo:** usar curva visual suave, preservando os preços diários registrados, e oferecer somente 7, 14 e 30 dias no seletor da página da bike.
**Áreas afetadas:** gráfico compartilhado do Radar, seletor do detalhe, rótulos e documentação. Sem mudança de banco, coleta, afiliados ou publicação automática.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Histórico mais legível; escolha de período mais simples. | Curva parecer medição contínua. | Manter valores reais no tooltip. | Prosseguir com ressalva explícita. |
| CTO e Arquitetura | Troca da interpolação Recharts e novo valor de janela. | Afetar consumidores internos de 90 dias/Tudo. | Preservar suporte interno a essas janelas. | Prosseguir com escopo na UI. |
| IA e Agent Engineering | Nenhum fluxo de IA alterado. | IA futura interpretar curva como dado novo. | Texto de transparência. | Prosseguir; documentar que é só visual. |
| Segurança | Nenhum dado pessoal ou permissão alterado. | N/A para segurança de dados. | Nenhuma. | Prosseguir. |
| UX/UI | Curva orgânica e três opções claras, inclusive em mobile. | Controle ou curva prejudicar leitura. | Rótulos acessíveis e gráfico responsivo. | Prosseguir. |
| CX e Operação | Menos dúvida sobre períodos. | Suporte interpretar valor entre datas como preço observado. | Texto explicativo. | Prosseguir com ressalva. |
| Growth e CRO | Leitura do Radar mais clara; sem mudança em SEO. | Confiança afetada se curva exagerar variação. | Interpolação monotônica, sem alterar escala/dados. | Prosseguir. |
| PMO e QA | Regressão local de janelas e gráficos. | Controles antigos persistirem ou cálculo 14 dias falhar. | Testes focados e `pnpm validate`. | Prosseguir após validação. |

**Conflito e decisão:** preço diário é discreto, enquanto a preferência visual é uma curva contínua. Aceitamos a interpolação apenas como traço entre pontos registrados, sem criar observações; tooltip e explicação deixam isso claro. A seleção pública fica em 7/14/30, mas 90/Tudo continuam disponíveis no cálculo interno para não quebrar rankings e páginas arquivadas.

**Critérios de aceite:** gráfico do destaque e do detalhe usam curva suave sem alterar amostras; seletor do detalhe exibe exatamente 7/14/30; janela de 14 dias recorta corretamente; textos não afirmam observação entre datas; testes direcionados e `pnpm validate` passam.
**Fora de escopo:** cálculo de preços, eixo/escala, fontes de dados, outros filtros do Radar, deploy.
**Rollback:** reverter os arquivos locais desta alteração; nenhuma migração ou dado é modificado.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Somente apresentação e escolha da janela pública mudaram; preços e classificação preservados. |
| CTO e Arquitetura | Pass | `DailyWindow` aceita 14; 90/Tudo permanecem para consumidores internos; typecheck e build passaram. |
| IA e Agent Engineering | Pass | Nenhum fluxo de IA alterado; texto explicita interpolação visual, sem dado novo. |
| Segurança | N/A | Nenhum dado pessoal, permissão, segredo ou endpoint alterado. |
| UX/UI | Pass | Traço `monotone` no componente compartilhado e três rótulos públicos; controles mantêm `aria-pressed` e `role=group`. |
| CX e Operação | Pass | Nota "Como lemos esses números" distingue curva de observações reais. |
| Growth e CRO | Pass | Sem alterações de SEO, links ou ofertas; tooltip ainda mostra apenas o fechamento registrado. |
| PMO e QA | Pass | 7 testes direcionados passaram; `pnpm validate` passou (typecheck, 36 testes de regressão e build). |

**Estado:** implementação local concluída. Publicação não executada neste escopo; depende de autorização específica, conforme os guardrails. Sem migração, alteração de dados ou custo externo de produto. Rollback pela reversão dos arquivos modificados.
