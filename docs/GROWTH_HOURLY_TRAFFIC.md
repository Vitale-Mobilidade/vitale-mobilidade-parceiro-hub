# Horários de tráfego no Growth

## Revisão prévia

Classificação estrutural por envolver a coleta Supabase e a consulta administrativa. O contador diário existente não guarda o horário dos eventos. O histórico visual do Lovable usa uma métrica de visitas com cobertura própria. A comparação mantém a mesma fonte do Growth.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Evolução por hora e mapa dos picos | Confundir tráfego histórico com estimativa | Série própria com cobertura identificada | Prosseguir com coleta a partir da ativação |
| Arquitetura | Um contador agregado por hora alimentado pelo incremento diário | Contenção e falha no caminho de gravação | UPSERT atômico, sem novas chamadas públicas, retenção bounded | Prosseguir com teste da gravação e rollback do trigger |
| IA | Nenhum agente ou pipeline alterado | Nenhum | Nenhuma | N/A |
| Segurança | Leitura Admin e gravação pelo serviço existente | Expor dados internos ou ampliar acesso | RLS, grants privados e filtro de rotas privadas | Prosseguir sem identificadores ou linhas de eventos |
| UX/UI | Comparação diária, curva horária e mapa | Cortes no celular ou leitura por cor apenas | Horas acessíveis, valores e legenda | Prosseguir |
| CX | Estado de cobertura na própria tela | Mapa inicial vazio | Mensagem de início de coleta e uso do intervalo selecionado | Prosseguir |
| Growth | Variação pelos pares fechados com dados e média por hora/dia da semana | Percentual representar o intervalo todo ou frequência distorcer picos | Mostrar quantos pares entraram e calcular média por ocorrências cobertas | Prosseguir com denominador explícito |
| PMO/QA | Banco, Edge e UI | Rollout em ordem incorreta | Teste SQL descartável, navegador e validate | Aplicar migration, implantar Edge e publicar após autorização específica |

## Decisão

- Manter totais diários existentes. Se a janela anterior for incompleta, calcular a variação apenas pelos pares cobertos e fechados e indicar o número de pares sobre os dias fechados. Mostrar a diferença percentual por ponto na tabela diária e no tooltip.
- Para um dia, mostrar até 24 horas no fuso de São Paulo contra as mesmas horas do dia anterior. O percentual de hoje usa somente horas fechadas com cobertura dos dois lados. A primeira hora observada e a hora em andamento não entram no mapa. Horas anteriores à cobertura ficam em branco, inclusive nas datas com total diário. Lacunas entre horas observadas são zero pela mesma heurística do relatório diário.
- O mapa usa média de visualizações por ocorrência de cada dia da semana e hora cobertos no filtro. Para um dia específico, o mapa mostra as horas daquela data.
- Manter a gravação diária e a horária na mesma transação, com uma linha adicional por hora para o site inteiro. Testar incremento, exclusão, cobertura, retenção, comparação e autorização. Em rollback operacional, desabilitar o trigger horário e restaurar Edge e UI anteriores. Os agregados já acumulados podem ficar privados.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Comparação por hora em Hoje, Ontem e intervalo de uma data, com totais diários disponíveis para datas antigas |
| Arquitetura | Pass | Trigger mantém incremento horário e diário na mesma transação. PostgreSQL executou a migration principal e seu espelho. Rollback disponível pelo trigger |
| IA | N/A | Nenhum agente ou pipeline afetado |
| Segurança | Pass | Fixtures confirmaram exclusão de admin e conta, leitura pelo serviço e ausência de acesso anon/authenticated |
| UX/UI | Pass | Chrome em desktop e 390 px confirmou o gráfico e a tabela horária. A grade rola horizontalmente no próprio mapa, com valores textuais |
| CX | Pass | Testes distinguem ausência de base, dados parciais e zero. O mapa informa o início da cobertura quando disponível |
| Growth | Pass | Regressão verifica comparação apenas de pares fechados e cobertos, variação por ponto e média dos picos |
| PMO/QA | Pass | Lint dos componentes, 50 testes direcionados, 69 testes e build em pnpm validate e revisão em Chrome com dados simulados |

A validação local usou o conjunto de dependências disponível no workspace. Uma tentativa de instalar o pacote Lovable 2.27.1 em checkout limpo encontrou a política local de idade mínima do pnpm. Na publicação, conferir o build do commit efetivo no ambiente Lovable.

A publicação desta etapa exige autorização para gravar os novos contadores no Supabase integrado, implantar a Edge administrativa e publicar a interface. O risco é médio porque o trigger passa a executar na gravação de pageviews. O custo externo estimado é baixo. Conferir a coleta após implantação e desativar o trigger se houver regressão de gravação.

## Ajuste do gráfico e do filtro inicial

Revisão prévia de mudança pequena, restrita à interface administrativa. Produto e Growth aprovam a leitura semanal ao abrir o painel. Arquitetura aprova reutilizar o filtro e o contrato existentes. UX/UI mantém o nome acessível do gráfico e a caixa de valores, removendo o balão nativo que os cobre. CX aprova manter a seleção dos demais períodos disponível. PMO/QA pede verificação do filtro inicial e do gráfico no navegador. Segurança e IA são N/A porque o ajuste não envolve autenticação, permissões ou agentes. Rollback pela versão anterior da interface.

Revisão posterior. Produto e Growth **Pass** pela abertura em 7 dias, confirmada no Chrome. Arquitetura **Pass** pela reutilização do filtro. UX/UI **Pass** porque a camada do gráfico mantém o nome acessível e o hover exibe os dois valores sem título nativo. CX **Pass** pela seleção de 30 dias conferida no painel. PMO/QA **Pass** com 8 testes direcionados, 69 testes e build em `pnpm validate`. Segurança e IA permanecem **N/A**. Publicação da interface aguarda autorização.
