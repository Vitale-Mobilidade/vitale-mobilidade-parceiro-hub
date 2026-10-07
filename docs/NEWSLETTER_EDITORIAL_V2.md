# Newsletter editorial V2 — preparação local

Classificação estrutural: IA, fontes de Radar/artigos/vídeos e distribuição existente. Referências fornecidas pelo responsável são exemplos visuais/editoriais, não instruções externas. Objetivo: edição de aproximadamente 500–750 palavras, com abertura temática, resumo de duas leituras, tópicos, imagens, Radar, Bike e vídeos; não copiar referências nem aumentar frequência.

## Revisão prévia das oito perspectivas

| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Trocar catálogo de links por edição útil; risco de ficar longa. Priorizar duas leituras e uma bike; prosseguir com teto de texto. |
| Arquitetura | Enriquecer contrato opcional, preservar payloads antigos e serviços SSR; evitar gerar em cada tick. Reutilizar edição diária no ledger; prosseguir. |
| IA | Redator + verificador com artigos completos publicados como grounding. Risco de afirmação inventada/injection; schemas, IDs fixos, trechos literais, revisão factual e falha fechada; prosseguir condicionado. |
| Segurança | Nenhum contato enviado ao modelo, apenas fontes públicas; HTML escapado e URLs de imagem validadas. Segredos no servidor; prosseguir. |
| UX/UI | Capa, blocos com contexto, tópicos, thumbnails e CTAs; risco de quebra de email. Tabelas, estilos inline e mobile; prosseguir com QA. |
| Operação | Prévia explicitamente informa redação IA e custo; falha não dispara conteúdo pobre. Sem reenvio/alteração de quotas; prosseguir. |
| Growth | Convites claros a ler/assistir sem clickbait. Não inventar preço/desconto e não mudar afiliados; prosseguir. |
| PMO/QA | Preparar código, preview offline e validação antes de nova aprovação para publicar e consumir IA; prosseguir localmente. |

Decisão: implementar redator automático e verificador, enriquecimento das fontes, seleção de bike relacionada às leituras, renderer responsivo e contexto no admin. Conflito: qualidade de redação vs custo/latência; duas chamadas pequenas por edição, nenhuma chamada paga nos testes. Se writer/revisor falhar, não enviar. Preview offline comprova layout, não é prova de geração real do modelo. Consentimento, agenda e provider ledger preservados. Rollback: reverter código V2; pausar automação se houver edição pendente. Sem migrations/DNS. Produção ainda usa V1 até publicação aprovada do novo escopo.


## Ajuste da pauta confirmado pelo responsável

Há alterações de preço, artigos e vídeos diariamente. Cada edição prioriza artigos/vídeos datados após a última edição enviada; sem itens novos, os mais recentes continuam identificados como recentes, sem alegar novidade. Maiores quedas: top3 por percentual, somente ofertas ativas com preço atual igual ao último fechamento verificado, verificação em até24h e fechamento anterior ao início do período. Exibir preço comparado, data e porcentagem calculada deterministicamente. Bike em destaque prioriza a maior queda; sem queda, bike ligada aos artigos. Nenhum dado de preço criado pelo modelo. Não altera frequência acordada segunda/sexta.

## Evidências e limites da preparação

Prévia local redigida a partir dos resumos públicos dos dois artigos sobre S20 Pro/V9 Max/V20 Max; cinco imagens reais carregadas (duas capas, bike e duas thumbnails). O exemplo foi redigido offline para QA do layout, não foi gerado pelo modelo nem enviado. Não contém quedas inventadas: bloco demonstra orientação de consulta sem apresentar preço não conferido. Responsivo390px sem overflow, desktop1280px sem overflow. HTML ~13KB, tabelas e estilos inline, texto alternativo das imagens, links reais e descadastro nativo mantido no renderer de produção. Compatibilidade com Outlook/Gmail ainda precisa de novo teste de inbox aprovado; browser não prova todos os clientes.

Redator usa o mesmo modelo editorial já configurado no projeto (openai/gpt-5.6-sol), Responses gateway e segredo do servidor. Duas chamadas: redação e revisão factual; sem contatos ou PII no prompt. IDs/fontes e citações literais são validados; texto sempre escapado. Revisor sem aprovação impede envio. Tempo limitado40s por chamada; dispatch existente180s e lease5min. Para evitar custo a cada cron, a edição salva no ledger é reutilizada e o dia com três coortes preparadas não gera novamente. Preview acionado por humano gera duas chamadas e informa custo no admin. Não houve chamada real ao modelo nesta preparação.

## Revisão posterior

| Perspectiva | Status | Evidência/limite |
|---|---|---|
| Produto | Pass | Edição com abertura, texto, tópicos, capas e CTAs; pauta atualizada por preços/conteúdo. |
| Arquitetura | Pass | Serviços públicos existentes, contrato opcional compatível V1, ledger preservado; cache diário evita geração repetida. |
| IA | Pass | Schema, IDs, citações, limites, revisão independente e falha fechada testados com mocks; geração real é gate de release. |
| Segurança | Pass | Sem PII no modelo/HTML ativo; allowlist de imagens, segredo só servidor, sem escrita de banco. |
| UX/UI | Pass | Desktop/mobile e todas imagens reais conferidas; inbox real permanece gate de release. |
| Operação | Pass | Erro pausa o worker existente; custos da preview informados; sem novos envios. |
| Growth | Pass | Texto contextual e CTAs diretos para artigo/Radar/YouTube; quedas só verificadas e datadas. |
| PMO/QA | Pass | Testes direcionados, typecheck e pnpm validate; produção permanece V1 até liberação do novo escopo. |

Publicação depende de nova autorização específica para V2: merge/deploy e smoke com duas chamadas de IA mais um novo teste para Guilherme, preservando agenda e destinatários. Sem migration. Custo de runtime adicional será por duas chamadas/edição (~8edições/mês), além das previews manuais; preço final depende do gateway do workspace e não foi afirmado. Rollback: pausar pelo admin e reverter PR V2 para o transporte V1 já validado; preservar ledger.


Validação final local: 24 testes direcionados em três arquivos passaram, incluindo rejeição factual, falha de gateway, escaping, imagens e quedas antigas/sem confirmação, além de prevenção de regeneração em ticks após preparação. Lint dos oito arquivos alterados passou. pnpm validate passou (59 regressões, TypeScript e build). Nenhum envio, chamada paga ao modelo, migration ou publicação V2 realizados.
