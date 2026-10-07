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

## Revisão de curadoria e visual — feedback do responsável

Problema: duas leituras e dois vídeos comparativos tornam a edição repetitiva. Nova decisão consolidada (estrutural, mesmas oito perspectivas): taxonomia visível por peça, no máximo um comparativo no conjunto artigo+vídeo, sem repetir a mesma peça adaptada, prioridade à diversidade e depois à data. Usar tipo editorial existente quando específico, heurística conservadora pelo título quando ausente; nunca rotular apresentação como teste prático. Sem variedade recente suficiente, reduzir itens, não preencher com comparativos nem inventar classificação. Acrescentar Quiz com CTA e arte própria existente; Radar deve mostrar foto/modelo, preço de referência datado, preço verificado e queda calculada em cards, não texto genérico apenas. Produto/Growth priorizam diversidade sobre estrita ordem cronológica; IA/Segurança exigem rótulos conservadores e fatos verificáveis; Arquitetura/Operação preservam fontes/RLS/cron; UX exige cards mobile e tags legíveis; QA exige casos de duplicação e seleção escassa. Produção segue sem mudança até liberação.


## Agenda e edicoes independentes (pedido final)

Segunda e quinta, duas vezes por semana, janela10-12h Sao Paulo. App e migration additive20261007233000 preparados, nao aplicados. Respiro70h acomoda a janela de2h sem atrasar o envio seguinte; nao aumenta frequencia. PostgreSQL17 isolado aceitou quinta e rejeitou sexta. Migration historica preservada. Rollback: pausar e coordenar reversao da funcao/app.

Curadoria exclui titulos usados nas duas edicoes anteriores. Curiosidade inicial com sourceId e citacao literal obrigatorios: ate3frases, sem repetir ideia anterior ou depender de continuidade. Leitura server-only das transcricoes dos videos selecionados, max4fontes6000caracteres cada, sem dados dos assinantes. Se a transcricao faltar, usa fonte publicada e nao inventa experiencia de video. Revisor verifica curiosidade e diversidade de abertura, alem de fatos.

Quiz com arte e CTA existentes. Radar em cards: foto, referencia datada, preco verificado, percentual calculado, barras proporcionais e historico. Preview usa snapshot real V9Max6273 (04/10) para5889 (07/10,19h07),queda6,1%. Pauta da preview:1comparativo,1guia de rotina,1video de precos,1teste pratico. Sem chamada paga IA/envio/publicacao nesta revisao. As oito perspectivas mantem Pass para preparacao local; geracao/inbox reais continuam gates de release.


Validacao posterior deste ajuste:29testes direcionados passaram; pnpm validate passou (59regressoes, types/build), lint passou, SQL17 isolado validou quinta/sexta. Sete imagens reais carregadas na preview, desktop800 e mobile390 sem overflow. Todos os oito pareceres Pass para preparacao: Produto (diversidade/autonomia); CTO (migration additive/servicos privados); IA (curiosidade sustentada/revisor/memoria); Seguranca (somente transcricoes selecionadas no servidor); UX (tags/cards/Quiz/mobile); Operacao (agenda coerente e respiro); Growth (CTAs/maiores quedas datadas); PMO (testes/documentacao/rollback). Publicacao/migration/geracao real/inbox seguem pendentes de liberacao do novo escopo, sem declarar implantacao.


## Voz editorial e teste autorizado — ajuste de 7/10

O responsavel rejeitou o titulo comercial e aprovou formato/imagens. Instrucao: newsletter divertida de conteudo, baseada na fala das transcricoes; numeracao a partir de#1; reenviar teste. Redator passou a usar conversa direta, perguntas e humor leve, atribuindo experiencias ao video/Vitale, sem fingir ter pedalado ou copiar propaganda. Titulo comercial generico bloqueado no validador e revisor. Texto deste teste foi refeito diretamente neste chat a partir das transcricoes selecionadas e artigos, nao e prova de chamada do writer no gateway.

Assunto do teste:#1 — Ladeira nao le ficha tecnica (emoji bike). Curiosidade factual do teste VL20; variedade mantida com comparativo, rotina de trabalho, precos e teste pratico. Layout e imagens preservados. Somente guilherme@hotpipe.com.br; teste nativo Resend, sem campanha de lista.

Numeracao de producao preparada: RPC privada retorna count(distinct edition_day)+1, payload congela o numero por edicao e todas coortes compartilham esse texto; preview/teste nao consomem sequencia. Primeiro disparo real continua#1, testes de revisao nao sao edicoes de lista. Funcao adicionada a migration local nova; nao aplicada em producao.


Teste revisado enviado e entregue pelo Resend:01a1188f-022b-764f-953e-020cb229c35c, assunto [TEST]#1 — Ladeira nao le ficha tecnica (bike), somente Guilherme. UI confirmou Delivered. Rascunho segue Draft, sem segmento. Evidencia artifacts/newsletter-test-1-delivered.png. Nenhuma campanha de lista ou deploy/migration realizados neste teste. Gate local:30testes direcionados passaram; pnpm validate passou (59regressoes, TypeScript/build), lint limpo e SQL17 isolado comprovou leitura de contador sem consumir numero. Numeracao e voz preparados no codigo; ainda nao foram publicados no runtime automatico.

## Revisão estrutural — implantação solicitada e curadoria permanente
Pre-revisão: Produto exige edição autônoma e acervo inédito; CTO exige memória paginada dos envios efetivos; IA exige curiosidade contextualizada, fontes privadas e revisão factual; Segurança exige UTMs sem PII e descadastro intacto; UX exige bike distinta das quedas e acervo opcional; Operação exige segunda/quinta e geração sem chat humano; Growth exige edição/seção/segmento atribuíveis; QA exige não repetição por URL, query preservada e validação. Decisão: implementar estes critérios, validar localmente e implantar no Lovable conforme solicitação explícita atual do responsável. Risco: reduzir quantidade de peças quando não houver diversidade, em vez de preencher com repetição. Rollback: pausar rotina e reverter release; conservar histórico.

Implementação: histórico efetivo completo paginado, exclusão por URL além de título, acervo sem corte de 30 dias, até três leituras e associações de bikes distintas. Destaque exclui todas as quedas, prefere assunto e bike distintos das últimas edições. UTMs em todos os destinos editoriais HTML/texto: source=vitale_newsletter, medium=email, campaign=giro_N, content=segmento_seção. Descadastro nativo preservado. GA4 existente recebe page_location conforme consentimento; Quiz já captura UTMs. YouTube recebe parâmetros, mas isso não comprova relatórios de clique externo; não foi criado redirecionador nem alegado acesso a métricas YouTube.
Pós-revisão das oito perspectivas: Pass para critérios locais de Produto (acervo e diversidade), CTO (paginação e SSR preservado), IA (gancho contextual com fonte/revisor), Segurança (sem PII/descadastro intacto), UX (layout preservado), CX (agenda/estado explícito), Growth (UTMs preservam query/fragmento), PMO (33 testes direcionados, pnpm validate com 59 regressões/types/build). Validação de geração real permanece pendente até runtime. Responsável determinou implantação no Lovable nesta thread; publicar apenas este escopo, sem envio novo de teste ou lista nesta validação.

Validação no runtime publicado: prévia autenticada retornou newsletter_writer_unavailable após aproximadamente44s; limite40s insuficiente. Corrigir limites90s redação/45s revisão (abaixo do dispatch180s e lease300s), alinhar headers à integração editorial existente Lovable-API-Key/X-Lovable-AIG-SDK, reportar timeout/output inválido sem expor fonte/segredo. Transcrições passam a no máximo5 IDs para suportar terceira leitura. Sem envio. Mesmo escopo das oito revisões; erro de runtime impede declarar conclusão até prévia real bem-sucedida.

Diagnóstico adicional no ambiente Lovable (3,5 créditos, execução interrompida para evitar novas chamadas): limite de tokens do revisor600 podia truncar JSON contando raciocínio; citações eram parafraseadas; sete seções extrapolavam tamanho. Correção consolidada: limites6000/2000tokens, prompt500–700palavras totais/70por seção e cópia exata de evidência. Normalização só NFC, espaço e caixa; nenhum resumo/paráfrase passa. Debug temporário do ambiente removido no código consolidado. Automação pausada temporariamente enquanto a primeira geração real aprovada não for comprovada. Migration registrada no ledger sem reaplicar.
