# Recalibração do Quiz — 08/10/2026

Estado: preparação local no repositório operacional, base `50c7a29`; sem publicação.
Classificação: estrutural (Quiz e leitura de Sheets). Evidência: RPC pública consultada, 20 bikes elegíveis com descrições atualizadas.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Mesma regra para todos os modelos | Autoridade superar adequação | Margem limitada a 5 pontos | Prosseguir condicionado |
| CTO | Motor puro e contagem na leitura server-side existente | SSR e navegação divergirem | Mesma server function nos dois fluxos | Prosseguir condicionado |
| IA | Descrição humana passa a fornecer sinais | Negação/comparação virar atributo | Extrair somente afirmações conservadoras; sem modelo pago | Prosseguir condicionado |
| Segurança | Sem PII, schema ou escrita | Texto externo manipular score | Pesos fixos, sinais limitados, nenhum comando executado | Prosseguir |
| UX | Mantém duas opções e fluxo | Nota parecer percentual; garupa inadequada | Notas internas preservadas; limitações reduzem score | Prosseguir condicionado |
| CX | Usa descrição e catálogo de vídeos existentes | Falha de vídeo bloquear quiz | Falha remove desempate e mantém catálogo | Prosseguir condicionado |
| Growth | Prioriza conteúdo existente em proximidade | Ganho editorial vencer adequação | Não alterar links/atribuição; preservar bônus de origem | Prosseguir condicionado |
| PMO | Testes dirigidos e gate obrigatório | Regressão de orçamento e fallback | Casos de margem, ordem, descrição e integração | Prosseguir condicionado |

## Conflitos e decisão consolidada

Growth favorece autoridade; Produto exige adequação primeiro. Decisão: sem bônus por quantidade de vídeos. Formar grupos ancorados na maior nota restante, com amplitude máxima de 5 pontos; ordenar cada grupo por vídeos, nota e ID. Isso evita comparador não transitivo e efeito cascata.

Escopo: remover listas de IDs no score; pesos comuns por uso (30), terreno (20), autonomia (até 30), garupa (até 30), peso (até 25), orçamento (30), experiência (até 5). Autonomia, preço e capacidade vêm de campos estruturados; descrição só complementa sinais qualitativos e carga máxima explicitamente informada. Não inferir autonomia por números soltos, nem desempenho por wattagem.

Dependências: RPC atual, leitor de vídeos existente e aliases canônicos. Critérios: mesmas regras para bike antiga/nova; vídeos só reordenam dentro de 5 pontos; deduplicação por videoId; falha de vídeos neutra; notas permanecem originais; links/SSR/CRM preservados. Fora de escopo: banco, sync, prompts, rotas e publicação. Rollback: reverter somente arquivos desta mudança, base `50c7a29`, sem dados a restaurar.

Risco residual preexistente: quando nenhuma bike cabe no orçamento, o motor retorna catálogo completo. Preservado por ser contrato existente; não apresentar como correção nesta task. Faixa acima de 120 kg e peso do passageiro não permitem comprovar carga total: pontuação não é certificação de segurança.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Uma regra para todas as bikes; margem máxima de 5; notas sem bônus editorial |
| CTO | Pass | Leitor server-side enriquece RPC; hook usa mesma server function; typecheck e build SSR/client aprovados |
| IA | Pass | Sem chamada IA; evidência textual conservadora, pesos limitados e teste de negação/comparação |
| Segurança | Pass | Só leituras públicas; sem secrets, PII, escrita, migration ou RLS |
| UX | Pass | Duas opções e layout mantidos; textos de restrição de garupa reduzem adequação |
| CX | Pass | Vídeos deduplicados pela associação canônica; teste de falha mantém catálogo e zera cobertura |
| Growth | Pass | Desempate usa vídeos reais; links e atribuição aprovados nos testes dirigidos |
| PMO | Pass | 94 testes dirigidos; lint dirigido; pnpm validate exit 0 (typecheck, 60 testes do gate, build); diff check |

### Evidência operacional

Leitura pública da aba Videos Youtube: V9 Max 25, GT2000 21, FT03 14, V8 Pro 13 e V40 Pro 8 vídeos distintos associados (08/10/2026). Esses números se atualizam pelo leitor existente, com cache de 10 minutos. Sem consulta ou consumo da API YouTube. Se não houver cobertura disponível, a ordem usa nota e ID.

Simulação local de quatro perfis com os 20 registros atuais e vídeos reais em `QUIZ_WEIGHTS_SCENARIOS_2026-10-08.json`: urbano solo até R$7 mil → FT03/V9 Max; trabalho intenso → V9 Max S/UFOFAST duas baterias; subidas e garupa até R$10 mil → V9 Max S/V8 Pro S. Simulação pública somente leitura, sem criar leads, cliques ou mensagens. O ensaio foi separado da suíte permanente para manter os testes offline.

### Limites e fechamento

A descrição oferece sinais qualitativos, não compreensão semântica completa. Sentenças negativas ou comparativas são descartadas conservadoramente e podem omitir algum atributo verdadeiro. Autonomia e capacidade estruturadas prevalecem sobre a prosa: GT2000 permanece em 60 km conforme RPC, embora a descrição mencione 80 km em uso moderado. Nenhum dado da planilha foi alterado.

Resultado: GO para preparação local; release condicionado à autorização específica de integração/publicação e smoke no preview do projeto ativo. Sem custos externos adicionais relevantes, créditos Lovable, escrita ou publicação. Rollback por reversão do diff; banco/Sheets intactos. Integrações herdadas permanecem operacionais e não foram reconstruídas.

## Autorização de release

O responsável autorizou explicitamente integrar, validar no preview e publicar nesta conversa em 08/10/2026 (“pode publicar!”). Base anterior confirmada no GitHub e no projeto Lovable: `50c7a29b4389a5e5c02ffaabd6f022c6de5bb583`. Escopo exclusivo dos dez arquivos desta mudança; nenhum schema, writer, dado ou configuração de produção.
