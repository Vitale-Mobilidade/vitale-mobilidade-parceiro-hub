# Refinamento Gemini e navegação de artigos — 28/09/2026

Base de produção: d413b2f873b3f60a765c8a325f4db550fbeb2b63. Pedido: manter Gemini, desenvolver melhor o artigo antes do próximo teste feito pelo usuário; bikes antes de três destaques; quatro vídeos iniciais e Ver mais, com mobile compacto. Publicação autorizada na mesma conversa para continuidade dos ajustes; não gerar artigo pago nesta entrega.

## Pré-implementação — estrutural (IA e SEO)

| Perspectiva | Impacto, risco, dependência e recomendação                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Aumentar utilidade com fluxo simples. Risco: inflar texto. Depende da riqueza da fonte. Prosseguir com extensão flexível.                                                                          |
| CTO         | Prompt compartilhado e ArticleView/loader SSR. Risco: perder links ao limitar lista. Depende de manter coleção completa. Prosseguir com details nativo, sem nova chamada/requisição.               |
| IA          | Cobertura, voz e fidelidade. Risco: generalizações e fatos inventados ao alongar. Depende de instrução explícita sobre estimativas/opiniões/medidas. Prosseguir em uma resposta, sem etapas novas. |
| Segurança   | Só texto tipado e links existentes. Risco: instruções da fonte e HTML arbitrário. Depende dos contratos atuais. Prosseguir preservando validação e permissões.                                     |
| UX          | Bikes primeiro, três destaques, quatro vídeos e expansão. Risco: listas longas mobile e disclosure inacessível. Depende de summary operável por teclado e cards compactos. Prosseguir.             |
| CX          | Usuário gera próximo teste. Risco: resultado não demonstrado de prompt. Depende de avaliar o próximo artigo real. Prosseguir sem teste pago do agente.                                             |
| Growth      | Conteúdo útil, links SSR completos e sem promessa de ranking por extensão. Risco: filler e mudanças de URL. Depende de preservar canonical/slug publicados. Prosseguir.                            |
| PMO/QA      | Mudança pequena de implementação, com validação proporcional. Risco: integração de prompt e UI. Depende de teste SSR, typecheck/build e pnpm validate. Prosseguir; rollback pela base acima.       |

## Decisão consolidada

Escopo: orientar 7–9 mil caracteres apenas como referência flexível para fontes ricas, aprofundar detalhes pertinentes, evitar relatos do vídeo e extrapolações. Manter google/gemini-3.8-flash, transporte e custo de uma geração. Limitar destaques no loader e render, priorizar bikes. Renderizar quatro vídeos mais details com todos os restantes; mobile em cards horizontais compactos. Sem migração, alteração de artigos existentes, geração de capa ou regeneração paga.

Conflito/trade-off: maior cobertura pode aumentar tokens, tempo e custo de saída; extensão rígida levaria a repetição. Decisão: prioridade à evidência e à utilidade, sem mínimo obrigatório. Native details recolhe vídeos e preserva links SSR sem JavaScript adicional.

Aceite: prompt aplicado à geração e reescrita; bikes precedem até três destaques; 0–4 vídeos sem controle desnecessário, 5+ com quatro iniciais e todos os restantes acessíveis; teclado e mobile; validar sem crédito de IA. Rollback: restaurar os quatro arquivos de código da base e republicar.

## Pós-implementação

| Perspectiva | Status | Evidência                                                                                                                                                                                                                    |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Pass   | Mesmo fluxo simples e modelo; extensão flexível por fonte.                                                                                                                                                                   |
| CTO         | Pass   | Links completos no SSR; details nativo; typecheck e build passaram.                                                                                                                                                          |
| IA          | Pass   | Instruções compartilhadas em geração e reescrita, contra estimativas transformadas em médias, procedimentos incertos, sensores/jornadas inventados; sem etapa adicional. Qualidade real será avaliada pelo teste do usuário. |
| Segurança   | Pass   | Sem novas permissões, banco, secrets ou HTML arbitrário.                                                                                                                                                                     |
| UX          | Pass   | Bikes antes de destaques, limite três na rota e renderer, summary nativo com foco visível, cards mobile horizontais.                                                                                                         |
| CX          | Pass   | Sem geração paga nem alteração dos artigos publicados; próximo teste manual do usuário.                                                                                                                                      |
| Growth      | Pass   | Todos os vídeos permanecem em anchors SSR; nenhuma mudança de canonical, slug ou dados de preço. Comprimento não é promessa de ranking.                                                                                      |
| PMO/QA      | Pass   | 17 testes editoriais direcionados e 5 testes SSR passaram; pnpm validate passou (typecheck, 47 regressões, build).                                                                                                           |

Fechamento local: sem divergência material pendente. O teste real do próximo artigo é necessário para medir cobertura, fidelidade e custo; o ajuste de prompt por si só não comprova melhora. Rollback: restaurar ArticleView, loader de conteudos/$slug, editorial-contract e editorial-admin/index da base d413b2f e republicar. Publicação direta no editor, sem pedido ao agente pago do Lovable, sem migração ou chamada de geração. Status: preparado para publicação autorizada.

---

# Gemini Flash como padrão editorial — 28/09/2026

## Contexto e autorização

Usuário autorizou explicitamente trocar o padrão e publicar para gerar pessoalmente um artigo de teste. Mudança estrutural por envolver IA. Base e rollback: `4f12849`.

## Revisão prévia das oito perspectivas

| Perspectiva | Impacto                                  | Risco                                      | Dependência                                                  | Recomendação                                        |
| ----------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------- |
| Produto     | Reduzir custo por geração                | Qualidade equivalente ainda não comprovada | Teste solicitado pelo usuário                                | Prosseguir para teste                               |
| CTO         | Modelo Google no mesmo gateway Responses | Compatibilidade de streaming/schema        | Contrato documentado pelo adaptador oficial TanStack/Lovable | Prosseguir com teste local do transporte            |
| IA          | Gemini 3.8 Flash com instruções atuais   | Perda de detalhes/voz e schema inválido    | JSON estrito e validação existente                           | Prosseguir, qualidade avaliada no artigo do usuário |
| Segurança   | Mesmo gateway/chave no servidor          | Exposição por nova integração              | Nenhuma nova credencial ou acesso                            | Prosseguir                                          |
| UX          | Botão Gerar artigo permanece             | Painel indicar modelo antigo               | Exibir modelo efetivamente executado                         | Prosseguir com correção do status                   |
| CX          | Próxima geração usa Gemini               | Uma falha impede gerar                     | Erros existentes; rollback disponível                        | Prosseguir                                          |
| Growth      | Mesmo prompt, módulos e metadata         | Qualidade editorial/SEO do resultado       | Nenhuma garantia de ranking ou equivalência                  | Prosseguir para avaliação real                      |
| PMO/QA      | Release pequeno e reversível             | Troca apenas cosmética                     | Conferir constante, log de execução, payload e deploy        | Prosseguir com testes e evidência                   |

## Decisão consolidada e trade-off

Alterar `ARTICLE_MODEL` para `google/gemini-3.8-flash`, mostrar esse modelo no status e registrar esse modelo em futuras versões de prompt. Preservar versão/conteúdo de prompts históricos e logs; não migrar banco. O gateway suporta Responses para modelos Google; manter streaming, JSON Schema e raciocínio low. Testes locais com fetch simulado, regressão editorial e pnpm validate. Não gerar artigo pago nesta task: o usuário realizará o teste. Não incluir fallback automático para Astra, para evitar gasto inesperado. Risco residual aceito pelo usuário: qualidade ainda será avaliada no teste. Rollback: restaurar arquivo de função a partir de `4f12849` e republicar.

## Fontes técnicas

- https://tanstack.com/ai/latest/docs/adapters/lovable
- https://docs.lovable.dev/features/ai
- https://ai.google.dev/gemini-api/docs/pricing

## Pós-implementação

| Perspectiva | Status | Evidência                                                                       |
| ----------- | ------ | ------------------------------------------------------------------------------- |
| Produto     | Pass   | Padrão econômico para teste explicitamente solicitado                           |
| CTO         | Pass   | Mesmo contrato Responses; mock verifica SSE fragmentado/Unicode e JSON          |
| IA          | Pass   | Gemini real no payload; low/strict schema mantidos; prompt intacto              |
| Segurança   | Pass   | Chave server-side, store false, autenticação intacta                            |
| UX          | Pass   | ai-status mostra constante efetivamente usada                                   |
| CX          | Pass   | Erros HTTP/stream/vazio testados; sem fallback caro                             |
| Growth      | Pass   | Contratos e instruções preservados; qualidade real pendente do teste autorizado |
| PMO/QA      | Pass   | Transporte simulado + 19 testes editoriais + pnpm validate; rollback registrado |

Limite: mocks não provam disponibilidade do modelo no gateway nem qualidade editorial. Primeiro artigo será gerado pelo usuário conforme solicitado. Sem chamada de IA paga nesta tarefa. Publicado no Lovable: commit d4987cd7e64a453628a60554c3c45d0d813d4bd2. Arquivo remoto normalizado idêntico ao local; editorial-admin Active, deploy 71, atualização recente; interface Published com Publish changes desabilitado confirma ausência de mudanças pendentes. Nenhum artigo gerado pelo agente.

## Correção de integração após o teste real

Evidência: runs do artigo FT03 falharam `ai_http_400`, modelo Gemini. Log do gateway: “Model not responses”; `/v1/responses` serve apenas OpenAI neste projeto, exige `/v1/chat/completions` para outros modelos. A documentação do adaptador TanStack não provou suporte no gateway efetivo. Teste mock anterior não validou o provedor; revisão técnica anterior foi insuficiente. Transcrição corrigida de 14.108 caracteres persistiu em editorial_videos/HTZASjgUxxQ; formulário usa cadastro do mesmo ID, não extrai YouTube.

### Revisão prévia e decisão da correção

- Produto: corrigir teste autorizado e manter Gemini; prosseguir.
- CTO: usar endpoint Chat Completions para Google, conservar Responses para OpenAI e analisar SSE por contrato; risco de novo payload; prosseguir com testes direcionados.
- IA: mesmo JSON Schema/low/prompt; recusar truncamento e erros; prosseguir.
- Segurança: chave server-side e mesmo gateway; nenhum log de fonte ou segredo; prosseguir.
- UX: mensagem útil para HTTP 400 e indicar origem do texto preenchido sem novas etapas; prosseguir.
- CX: preservar transcrição/draft já salvos; nenhuma limpeza/reimportação; prosseguir.
- Growth: composição editorial e dados reais intactos; prosseguir.
- PMO: mock prova formato Chat Completions e erros; validate; verificar deploy, primeira geração real ainda deve comprovar gateway; prosseguir.
  Trade-off: corrigir sem testar novamente via Responses que já falhou. Nenhum fallback caro. Escopo: transporte, aviso de transcrição cadastrada, erro legível. Rollback: arquivo da função e página do release d4987cd. Publicação autorizada pelo pedido de teste/padrão/publicação na mesma tarefa.

### Revisão posterior da correção

As oito perspectivas: Pass para o escopo técnico corrigido. Produto/IA/Growth mantêm avaliação editorial do primeiro artigo como teste, sem prometer equivalência; CTO verificou formato Chat Completions, sistema/usuário, low e schema; Segurança preserva segredo e ACL; UX/CX mantêm cadastro e mensagens; PMO registra testes de erro, truncamento, SSE fragmentado, OpenAI e Google, 19 testes editoriais e pnpm validate. Publicação pendente de transferência.

# Restauração do modelo VL20 — 28/09/2026

Esta decisão substitui o fluxo de geração da fundação documentado abaixo. Solicitação explícita do responsável: restaurar o artigo VL20, usar thumbnail como capa inicial, retirar arquétipos, reduzir custo/tempo; fluxo link/vídeo + título + transcrição → Gerar artigo → prévia → Publicar. Publicação autorizada na mesma tarefa. Nenhuma chamada paga será usada para testar.

## Revisão prévia — estrutural (IA/SEO/Supabase)

| Perspectiva | Impacto, risco, dependência e recomendação                                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Restaurar a referência aprovada. Risco: manter etapas rejeitadas. Depende do fluxo antigo ainda disponível. Prosseguir com uma geração completa.                                                                                                                             |
| CTO         | Reusar generateInto e layoutArticle sem migration. Risco: draft novo com flag antiga. Converter somente o draft solicitado, com revisão concorrente; preservar publicados.                                                                                                   |
| IA          | Mesmo prompt/modelo v4 da VL20, uma escrita e reescrita condicional. Risco factual permanece; transcrição não confiável, schema, evidência privada e validação determinística preservados. Desativar planejamento/QA pago; IA de capa somente quando acionada separadamente. |
| Segurança   | Manter JWT, papéis, lock por revisão e auditoria. Risco: liberar draft incompleto ao converter. Marcar conversão pendente como erro até escrita concluída. Sem RLS/secrets novos.                                                                                            |
| UX/UI       | Um botão para gerar e outro para publicar. Risco: jargão e espera por capa. Miniatura existente, menu opcional Capa com upload ou geração por IA; feedback simples e retomada por nova geração.                                                                              |
| CX          | Artigos já publicados intocados; drafts novos podem ser regenerados. Risco: falha de créditos. Manter conteúdo salvo e erro legível, sem teste pago.                                                                                                                         |
| Growth/SEO  | Restaurar módulos reais intercalados e voz da VL20. Risco: texto genérico sem contexto. Mesma composição/renderização pública, metadata e entidades; não prometer ranking.                                                                                                   |
| PMO/QA      | Comparar bloco a bloco com VL20, testes de layout/contrato + validate. Risco: build não prova qualidade de nova IA. Documentar limite; deploy autorizado e rollback por release anterior.                                                                                    |

Conflito: QA por modelos e seleção de arquétipos trouxeram custo, lentidão e pior composição. A decisão explícita do responsável restaura o modelo anterior. Mantemos validação determinística e grounding no escritor, sem apresentar isso como revisão factual independente. A skill SEO é referência de revisão, não impõe o fluxo rejeitado pelo responsável.

Decisão: reativar geração completa sem brief; desativar endpoints de etapas extras; capa opcional, após gerar, por imagem enviada ou IA acionada separadamente; preservar prompt v4 usado pelo artigo ideal, miniatura do vídeo, módulos do catálogo, SEO/SSR e botão Publicar. Sem apagar históricos, dados ou imagens existentes, sem alterar texto/slug de publicados. Critérios: criação e regeneração não chamam outline/QA/capa; drafts só publicáveis com corpo válido; módulos intercalados como VL20; validate aprovado. Rollback: restaurar os dois arquivos do release 8c7c8a6; drafts já gerados permanecem legíveis no modo legado.

## Revisão posterior local

| Perspectiva | Resultado e evidência                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produto     | Pass: criação completa e Publicar; geração de capa separada, conforme nova instrução do responsável.                                                                                             |
| CTO         | Pass: caminho legado existente, lock por revisão; nenhum schema, rota pública ou writer do catálogo alterado.                                                                                    |
| IA          | Pass: mesmo prompt v4/modelo registrado na VL20; um writer e eventual reescrita de voz. Etapas pagas extras retornam 410; capa apenas mediante clique. Sem geração paga no teste.                |
| Segurança   | Pass: JWT/papéis, validação de JPG 1280×720/4MB e upload privado preservados; draft em restauração bloqueado até sucesso, fonte mínima conferida antes da chamada.                               |
| UX/UI       | Pass local: Gerar artigo, preview, Publicar; menu Capa com upload JPG/PNG/WebP e IA opcional, indicação de créditos. Sem jargões no processo.                                                    |
| CX          | Pass: falha mantém conteúdo anterior; publicados preservados. Regenerar converte somente o draft solicitado, não modifica o corpus em lote.                                                      |
| Growth/SEO  | Pass: layout testado intercala comparativo, dois Radars, vídeo, Quiz e FAQ como VL20; renderização SSR/metadata/canonical inalterada, fonte e dados reais.                                       |
| PMO/QA      | Pass local: 21 testes direcionados (automação, contrato, composição e capa), 47 regressões em pnpm validate, typecheck e build aprovados. Qualidade de nova resposta IA não medida sem créditos. |

Release: aplicar frontend, função e esta documentação pelo Code Editor, sem prompt pago ao Lovable; publicar conforme autorização existente. Verificar bundle/interface e ausência de mudanças nos dois publicados. Custo de implementação sem chamadas IA; geração futura usa a mesma chamada principal da VL20 (reescrita somente quando necessária). Economia exata em créditos não medida. Rollback pelo release anterior e fontes 8c7c8a6. Artigos antigos do fluxo rejeitado precisam de Regenerar artigo para receber texto novo; não gerar todos automaticamente.

---

# Fluxo simples de artigos no Admin

Decisão de produto em 27/09/2026. Esta decisão substitui a interface de etapas e a proposta de publicação automática descritas no histórico de `EDITORIAL_FOUNDATION_2026-09-26.md`.

## Contrato da experiência

O operador escolhe um vídeo existente ou cola o link, informa o título e a transcrição, e clica **Gerar artigo**. O painel executa em sequência privada: análise da fonte, estratégia específica da intenção, redação, capa e QA. Exibe então a prévia do artigo completo e o botão **Publicar**. A criação e a revisão técnica não publicam. Se uma chamada falhar, o rascunho salvo pode ser concluído no mesmo artigo, sem mostrar as etapas internas. Não existe operação de criação em massa: 100+ vídeos serão processados individualmente.

O plano, arquétipo, notas, evidências e alertas são artefatos internos. Não aparecem na criação, lista ou editor do artigo. A diferença editorial é julgada por artigo frente a publicados, rascunhos e planos privados. A variedade deve seguir o assunto e a fonte; não se deve forçar uma categoria só para preencher cotas nem prometer posição no Google. A orientação oficial do Google prioriza conteúdo original, útil, preciso e relevante, e alerta para geração de muitas páginas sem valor adicional. Ver: https://developers.google.com/search/docs/fundamentals/creating-helpful-content e https://developers.google.com/search/docs/fundamentals/using-gen-ai-content.

## Revisão antes da implementação — estrutural

| Perspectiva | Parecer | Condição incorporada                                                                                              |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| Produto     | Pass    | Fluxo individual de quatro elementos e publicação explícita.                                                      |
| CTO         | Pass    | Reutilizar etapas persistidas e revision lock; nenhuma migration.                                                 |
| IA          | Pass    | Fonte não confiável, evidência literal e QA privado preservados.                                                  |
| Segurança   | Pass    | Somente perfis editoriais; QA atrelado à revisão para publicar.                                                   |
| UX/UI       | Pass    | Sem plano, jargão ou botões técnicos no fluxo principal.                                                          |
| CX/Operação | Pass    | Retomar um rascunho após interrupção, com erro compreensível.                                                     |
| Growth/SEO  | Pass    | Diferenciação por fonte e intenção, sem estrutura fixa ou cota global de arquétipos.                              |
| PMO/QA      | Pass    | Testar compilação, contrato da publicação e tela publicada; créditos insuficientes impedem teste real de geração. |

Conflito resolvido: a antiga prova de cinco intenções era uma avaliação para um conceito de produção em massa que o operador rejeitou. A checagem de semelhança por artigo permanece; a cota global deixa de aparecer e de bloquear a criação. A flag antiga `EDITORIAL_AUTO_PUBLISH` deixa de comandar publicação de artigos novos: a ação **Publicar** exige relatório QA aprovado e revisão exata. O banco mantém o gatilho de segurança.

## Verificação e release

`pnpm validate`: typecheck, 47 testes e build aprovados localmente. Pós revisão: Produto Pass; CTO Pass; IA Pass com teste real pendente por falta de créditos; Segurança Pass; UX/UI Pass local, smoke visual no Lovable pendente; CX Pass local; Growth/SEO Pass para contrato, sem alegação de ranking; PMO Pass local, publicação condicionada à correspondência exata do código implantado e smoke. Nenhum artigo novo será criado com créditos esgotados. Rollback: reverter o commit de frontend e da Edge Function no Lovable; os rascunhos privados permanecem salvos e artigos já publicados não são alterados.

## Evidência de integração

Código aplicado pelo Lovable Code Editor em `src/pages/AdminEditorial.tsx` e `supabase/functions/editorial-admin/index.ts`; HEAD remoto `be8a696`. O checkout limpo deste HEAD passou `pnpm validate`: 47 testes, typecheck e build. Não foram enviados prompts ao agente Lovable nem chamadas de geração, preservando os créditos indisponíveis. Após publicar, verificar a interface autenticada e que nenhum artigo privado foi publicado por efeito colateral.

## Publicação e conferência

O botão **Publish changes** do Lovable concluiu com “Your website was updated”. A URL viva `/admin/conteudos/novo` respondeu HTTP 200 e carregou o bundle `AdminEditorial-GiL0zqes.js`; nele estão “Gerar artigo” e “Publicar”, sem “Gerar somente outline”, “Plano editorial”, “Distribuição por arquétipo” ou “Produção em massa”. Consulta somente leitura ao banco vivo após o deploy: 2 artigos publicados, 5 rascunhos e 1 registro `validation_error`, iguais às contagens anteriores. A geração completa e o QA com IA não foram executados por falta de créditos; esse é o limite da verificação viva. O backend foi salvo no Lovable em `be8a696` e o checkout desse commit passou `pnpm validate`.

---

# Histórico da fundação editorial (26/09/2026)

# Fundação editorial orientada por fonte, SEO e diversidade

**Estado vivo (26/09/2026, 23:40 UTC):** migration `20260926230000_editorial_foundation.sql` aplicada no banco vivo; `editorial-admin` implantada com a correção do corpus de diferenciação; `EDITORIAL_AUTO_PUBLISH` ausente (gate técnico fechado). Cinco outlines piloto gerados pelo painel, todos `ready`, artigos em `draft`, nenhum artigo completo escrito ou publicado. **Frontend do Admin não publicado**: a publicação pela API Lovable devolveu `UNKNOWN` e a ferramenta interna respondeu bloqueio por configurações do projeto — o painel público ainda roda a versão anterior. **Decisão: NO-GO para produção em massa** (ver "Resultado dos cinco pilotos"). As seções abaixo com "NO-GO para migration" são histórico e já não descrevem o estado atual.

## Classificação e decisão prévia

Mudança **estrutural**: IA, SEO, Supabase, Radar, Quiz, Admin e publicação de conteúdo. Escopo: preservar os dois artigos publicados; adicionar artefatos privados de fonte/outline/QA; rotear por intenção em nove arquétipos; compor módulos selecionados; executar SEO e QA antes da publicação automática. Fora de escopo: gerar 100 artigos, modificar os dois publicados, trocar o writer Sheets, reconstruir Quiz/Radar ou mudar domínio. Rollback: voltar ao deployment anterior e desabilitar a nova ação de geração; manter a tabela privada aditiva para diagnóstico, sem excluir dados.

| Perspectiva         | Impacto                                               | Risco                                           | Dependência                                     | Recomendação                                       |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Produto             | Artigos deixam de seguir sequência única              | Volume sem utilidade                            | Fontes reais e contribuição própria             | Prosseguir com QA que bloqueia páginas repetitivas |
| CTO                 | Usa Admin, Edge Function e Supabase atuais            | Schema novo e composição pública                | Migration aditiva, teste de restauração         | Prosseguir condicionado à recuperação              |
| IA                  | Separa fonte, intenção, estratégia, redação, SEO e QA | Afirmação inventada ou instrução na transcrição | Trechos literais, schemas, revisão independente | Prosseguir com falha fechada                       |
| Segurança           | Guarda evidências privadas                            | Vazamento de transcrição/draft                  | RLS e service role apenas no servidor           | Prosseguir com teste de papéis                     |
| UX/UI               | Exibe outline, distribuição e alertas                 | Operador interpretar score como garantia        | Estados claros de bloqueio/publicação           | Prosseguir após smoke autenticado/mobile           |
| CX/Operação         | Vídeos seguem no Admin; Sheets segue comercial        | Erro sem forma de recuperação                   | Logs e reprocessamento por artigo               | Prosseguir sem segundo writer                      |
| Growth/CRO e SEO/IA | Página específica, SSR e links reais                  | Canibalização, schema enganoso e perda de URL   | Auditoria por URL e fontes oficiais             | Prosseguir condicionado ao gate SEO                |
| PMO/QA              | Piloto mensurável antes de escala                     | Auto-publicação com teste insuficiente          | Testes locais e ensaio operacional              | Bloquear release até evidência                     |

**Conflito e decisão:** o P0 exigia revisão humana; o pedido atual a dispensa. A compensação é bloquear automaticamente quando evidência, diferenciação, SEO ou qualidade falharem. Um score não garante ranking nem elimina risco residual de erro editorial. A instrução anterior de apresentar cinco outlines antes de produção em escala segue útil como avaliação de arquitetura, mas só há três transcrições importadas no Admin; não inventar mais duas.

## Releitura da especificação para escala e parecer SEO/IA

O alvo de aproximadamente 100 vídeos é **inventário a avaliar**, não quota de 100 URLs. O Google recomenda conteúdo original, útil e com experiência própria e alerta contra páginas em escala criadas principalmente para manipular resultados; páginas rastreáveis e tecnicamente corretas ainda não têm indexação garantida. Para busca no ChatGPT, conferir acesso real do `OAI-SearchBot` e páginas HTML públicas. Nenhuma técnica isolada de GEO garante citação.

**Parecer SEO/IA: aprovação condicionada da arquitetura; reprovação da produção em massa agora.** O pipeline tem fonte, intenção, outline, módulos opcionais, SSR e QA, mas a prova de cinco intenções não existe, e as duas páginas publicadas já mostram repetição narrativa. Por isso, a nova ação `outline-only` permite analisar vídeo e salvar brief sem criar corpo ou publicar. A triagem de diversidade passou a comparar também sequência de seções, conclusão e frases repetidas, além de abertura, headings e vocabulário. Ela sinaliza risco para o revisor de IA; não é detector de conteúdo gerado nem medição de ranking.

### Operação proposta para 100 ou mais vídeos

1. Manter transcrição revisada e ID de vídeo como fonte; falhar quando a fonte não puder ser lida por inteiro. Não inferir teste a partir de título ou ficha técnica.
2. Agrupar a fila por intenção, Bike e contribuição exclusiva. Um vídeo sem tese própria pode complementar página existente ou não gerar URL.
3. Criar cinco outlines de intenções diferentes antes da redação em escala. No Supabase há três transcrições importadas, duas já ligadas a comparativos publicados; faltam fontes de pelo menos duas outras intenções. Os 103 vídeos do catálogo Sheets são referências de seleção, não transcrições.
4. Após a prova, gerar em lotes pequenos, um artigo por execução, com estado e erro persistidos. O Admin mostra distribuição por arquétipo e bloqueios antes de ampliar o lote. Não acionar 100 chamadas simultâneas na Edge Function.
5. Publicar automaticamente apenas artigos com fonte, diferenciação e QA aprovados. A publicação humana de cada artigo foi dispensada; o monitoramento do corpus e a capacidade de despublicar continuam necessários.
6. Medir por URL indexação, impressões/cliques e consultas no Search Console, desempenho orgânico e referências de IA quando observáveis, além de cliques internos para Radar/Bike/Quiz. Revisar a decisão de escala se o conteúdo ficar repetitivo ou não for indexado.

**Camadas:** TanStack Start serve HTML, metadata, canonical, JSON-LD e links; Supabase guarda vídeo, transcrição, brief, versão, artigo e QA privado; a Edge Function autentica, orquestra seis etapas de IA e bloqueia publicação; Lovable hospeda o projeto existente. Radar e ofertas continuam no writer atual do Sheets. A skill SEO/IA instrui a perspectiva Growth/CRO, sem adicionar um segundo escritor comercial.

## Contratos implementados localmente

- `editorial_briefs` privada: evidências, intenção, arquétipo, tese, outline, módulos, alertas e QA por artigo, sem copiar oferta/preço.
- Nove arquétipos; o modelo lê transcrição e fatos, não apenas título.
- Fonte: trechos literais conferidos contra transcrição. Classificação separa observação, fabricante, experiência, opinião e inferência.
- Novo artigo recebe `foundation_required`. A composição respeita o plano; o leitor público antigo mantém a apresentação atual dos dois publicados.
- SEO/descoberta por IA e QA editorial são etapas separadas. Falha mantém rascunho privado com causa e versão. Passagem por QA permite publicação sem revisão humana.
- A migration só altera a regra de publicação dos **novos** artigos marcados; os dois atuais não recebem esse marcador por backfill.

## Gate técnico antes de aplicar ou publicar

1. Backup restaurável recente e ensaio de restauração proporcionais à migration, conforme guardrails; o registro `GATE0_RESTORE_REHEARSAL.md` é parcial e não fecha esse gate.
2. Ensaio local de migration e rollback lógico; verificar RLS, grants e que duas linhas publicadas continuam com mesmos slugs, status e blocos.
3. `pnpm validate` mais testes direcionados da fundação; executar uma geração controlada com transcrição real e custo autorizado, verificar resultado bloqueado e resultado elegível sem publicar conteúdo de teste indesejado.
4. Comparar HTML/metadata/robots/canonical/sitemap das duas URLs existentes e de um artigo novo; verificar Radar, Quiz, ferramenta, href afiliado direto e mobile.
5. Revisão pós-implementação das oito perspectivas com Pass/Fail, diff final, versão de rollback e publicação do mesmo projeto Lovable.

## SEO e descoberta por IA

A skill pessoal `vitale-seo-ia` foi criada a partir de avaliação da skill MIT `seo-geo` no repositório AgriciDaniel/claude-seo (17.739 estrelas em 26/09/2026). Recomendações são validadas contra fontes primárias:

- Google: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google, conteúdo gerado com IA: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- OpenAI, busca ChatGPT e OAI-SearchBot: https://help.openai.com/pt-br/articles/12627856-publishers-and-developers-faq

A implementação não promete posição em Google ou citação no ChatGPT. Após release, comparar indexação e desempenho por URL, conteúdo útil e referência orgânica real; não usar o score interno como resultado de ranking.

## Revisão pós-implementação (26/09/2026)

| Perspectiva         | Parecer                     | Evidência e pendência                                                                                                                                                                                                                                                                        |
| ------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto             | Pass                        | Nove arquétipos e módulos opcionais substituem o molde nos artigos novos; os dois publicados não são reescritos.                                                                                                                                                                             |
| CTO                 | Fail para release           | Typecheck, testes e build passaram; migration ensaiada em PostgreSQL 17 isolado. Falta backup recente restaurável do banco vivo e ensaio de recuperação correspondente.                                                                                                                      |
| IA                  | Pass local                  | Trechos literais, outline versionado, revisão SEO e QA independentes, publicação com falha fechada; ainda falta uma geração controlada real e a prova com cinco outlines.                                                                                                                    |
| Segurança           | Pass local                  | RLS ligada; anon/authenticated sem SELECT e service_role com SELECT no ensaio SQL. Falta conferir os papéis no projeto vivo após a migration.                                                                                                                                                |
| UX/UI               | Fail para release           | Estados de progresso, bloqueio e relatório no Admin compilam; falta smoke autenticado e mobile do fluxo novo.                                                                                                                                                                                |
| CX/Operação         | Pass local                  | Reprocessamento por vídeo e motivo de bloqueio; Sheets, ofertas e artigos legados não foram modificados.                                                                                                                                                                                     |
| Growth/CRO e SEO/IA | Fail para produção em massa | SSR, canonical, H1 e HTTP 200 conferidos nos dois artigos existentes; robots permite rastreamento e teste HTTP com user agent OAI-SearchBot retornou 200. Faltam cinco outlines de intenções distintas, HTML/metadata de artigo novo e medição por URL no vivo.                              |
| PMO/QA              | Fail para release           | `pnpm validate`: 47 testes, typecheck e build aprovados na primeira revisão; testes direcionados após a revisão de escala passaram. Ensaio isolado da regra SQL aprovou bloqueio sem brief/QA, publicação com QA e preservação dos dois legados. Backup e geração controlada real pendentes. |

**Parecer consolidado: NO-GO para migration, publicação da fundação e produção em massa neste momento.** Riscos materiais não mitigados: backup restaurável do estado vivo e ensaio de recuperação ausentes; prova de cinco outlines diversos incompleta. O ensaio com fixture não substitui restauração de backup. A geração real, o smoke do Admin e a verificação da página nova exigem o schema implantado; serão executados em sequência controlada após fechar a recuperação. O responsável já autorizou a publicação direta e dispensou revisão humana dos artigos; não é necessária nova aprovação para essas duas decisões. O custo externo esperado depois de liberar o gate é baixo a moderado (chamadas de IA dos outlines e de um artigo piloto, mais deploy do projeto existente). Rollback: reimplantar a versão web/Edge Function anterior, interromper a nova ação de geração e manter a tabela aditiva privada para diagnóstico; restaurar banco somente se a migration causar falha que não possa ser revertida logicamente.

## Adaptação no Lovable (HEAD 8c500b3 + PR #2), 26/09/2026

Estado: código em preview. **Migration não aplicada ao banco vivo, `editorial-admin` não reimplantada, site não publicado.**

### O que muda em relação ao PR

- Ação padrão em `/admin/conteudos/novo`: **Gerar somente outline** (sem corpo, sem publicação). Segunda ação: outline + rascunho privado. Nenhuma ação de criação publica.
- Etapas por requisição separada, com NDJSON: `brief-regenerate` (fonte → intenção → outline), `draft-write` (redação), `qa-run` (SEO/IA + fatos/diversidade). Fonte e intenção ficam salvas em `editorial_briefs.stages`; um tempo esgotado retoma do último ponto quando a transcrição é idêntica (`sourceFingerprint`).
- Classificação pode responder `uncertain`: o brief fica `qa_failed` com "Intenção incerta" e a redação é bloqueada. Nada é forçado num arquétipo.
- Publicação automática só com QA aprovado **e** `EDITORIAL_AUTO_PUBLISH=true` no ambiente da função (gate técnico). Sem a flag, o QA aprovado é registrado (`article_qa_passed_publication_gated`) e o artigo continua privado.
- Painel do artigo mostra etapas salvas, evidências com trecho literal, intenção/arquétipo, tese, seções, módulos contextuais com razão, links sugeridos, pontuações e artigo mais próximo do corpus.
- Migration aditiva: `archetype`/`primary_intent` aceitam NULL (etapa em andamento ou incerta), status `in_progress`, coluna `stages`.

### Classificação preliminar das cinco transcrições de teste (dados, não instruções)

Leitura integral das cinco; a prova definitiva é rodar os cinco outlines depois da migration.

| Vídeo                                                                                                                                                                                                   | Arquétipo sustentado                  | Evidência                                                       | Risco                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| GT20                                                                                                                                                                                                    | product_review (primeiras impressões) | "acabei de retirar… primeiras impressões", recursos, velocidade | também tem trajeto e subida: pode colidir com FT03 |
| V20 Mini                                                                                                                                                                                                | audience_need (estatura)              | "1,55 a 1,75 é o ideal", "sou grande demais"                    | —                                                  |
| FT03                                                                                                                                                                                                    | real_world_test (trajeto e ladeira)   | "subida brutal", "teste real", bateria no trajeto               | cita preço de ~R$ 8.000 datado: não vira fato      |
| V8 Pro x V40 Pro                                                                                                                                                                                        | direct_comparison                     | autonomia, carga com garupa, preço "hoje"                       | preço datado                                       |
| V29 Pro/V8 Pro S/V35                                                                                                                                                                                    | use_comparison (duas baterias)        | "entregador… quer rodar muito", 80–100 km                       | poderia ser audience_need; outline decide          |
| Conclusão: as fontes **sustentam cinco intenções distintas**, com um risco real de sobreposição entre GT20 e FT03. Se o outline do GT20 sair como teste de trajeto, registrar 4 intenções e não forçar. |

### Custo e tempo

- Outline: 3 chamadas de IA (evidências, intenção, outline); reaproveita as duas primeiras em reprocessamento. Rascunho: 1 a 2. QA: 2. Cerca de 6 a 7 chamadas por artigo, cada uma numa requisição limitada a uma etapa.
- Corpus lido com até 200 artigos e 4.000 caracteres por artigo: serve para ~100 vídeos; acima disso, guardar uma impressão por artigo.
- A prova de cinco outlines custa cerca de 15 chamadas, sem gerar artigos.

### Sequência de implantação e rollback

1. Backup lógico de `editorial_articles`, `editorial_videos`, `editorial_audit_logs` e snapshot dos dois publicados (id, slug, status, revision, hash de blocks).
2. Aplicar a migration (aditiva). Verificar RLS/grants de `editorial_briefs` e que os dois publicados continuam idênticos (a trava nova só vale para `foundation_required=true`).
3. Implantar somente `editorial-admin`, sem `EDITORIAL_AUTO_PUBLISH`.
4. Publicar o frontend do Admin (as páginas públicas não mudam de contrato).
5. Importar as cinco transcrições e rodar cinco outlines. Relatório de intenção e diversidade.
6. Um rascunho piloto + `qa-run` com o gate fechado.
7. Só então definir `EDITORIAL_AUTO_PUBLISH=true`.

Rollback: remover a flag (volta a não publicar); reimplantar a `editorial-admin` anterior; frontend anterior. A tabela aditiva fica para diagnóstico. Restaurar o trigger anterior (`editorial_article_before_update` sem o ramo `foundation_required`) somente se ele bloquear algo indevido. Restaurar backup somente em falha irreversível.

### Registro de implantação da fundação (26/09/2026)

- Migration `20260926230000_editorial_foundation.sql` aplicada no banco vivo pelo conector Lovable, após snapshot local restaurado em PostgreSQL isolado.
- Verificação pós-migration: 3 artigos, 2 published; digest de id/slug/status/blocks/revision idêntico ao anterior (`b2941f37d646c0ef64421947da833642`) — os dois publicados intactos; todos `foundation_required=false`.
- `editorial_briefs`: RLS ativa; SELECT para anon/authenticated negado; service_role permitido.
- Deploy somente de `editorial-admin` a partir do HEAD `8b3fc0a57b278035ada240011ef9c9ea0a6bc05d`, sem erros de compilação ou deploy.
- `EDITORIAL_AUTO_PUBLISH` ausente do ambiente (gate técnico desligado): QA aprovado registra `article_qa_passed_publication_gated` e o artigo permanece privado.
- Chamada sem autenticação a `editorial-admin` negada com HTTP 403 ("Acesso não autorizado.").
- Não publicado: frontend, importação de transcrições e geração de artigos. Nenhuma outra função, Sheets, Radar, Quiz ou ofertas alterados.
- Próximos passos pendentes: publicar o frontend do Admin, importar as cinco transcrições, rodar cinco outlines, piloto de rascunho + QA com gate fechado, e só então avaliar `EDITORIAL_AUTO_PUBLISH=true`.

### Correção do gate de outline: cautelas x bloqueios (26/09/2026)

- Evidência do piloto real: GT20 `aDLpuoXPofU` gerou outline com evidências e diferenciação 98, mas ficou `qa_failed` e "Escrever rascunho" desabilitado apenas por 8 cautelas apropriadas em `warnings` (ex.: "não apresentar como teste próprio", "60 km/h é painel"). Regra antiga bloqueava qualquer transcrição honesta.
- Correção em `editorial-admin` + `_shared/editorial-foundation.ts`: o outline passa a ter `warnings` (cautelas informativas, mitigadas pelo texto) e `blockingRisks` (riscos materiais sem mitigação). Helper puro `outlineGate` bloqueia somente: risco material declarado, outline sem classificação de riscos (legado/malformado — fail-closed), alertas de similaridade e diferenciação < 45. Continuam bloqueando antes: evidência não literal/insuficiente (`insufficient_grounded_claims`, outline sem claims) e intenção `uncertain`.
- Cautelas não foram zeradas nem ocultadas: ficam no payload, em `quality_report.cautions` e no painel ("Cautelas editoriais", separadas de "Bloqueios").
- Rascunho recebe instrução explícita de respeitar todas as cautelas. QA final recebe `editorialCautions` e retorna `cautionViolations`; `cautionReviewIssues` reprova cautela desrespeitada e falha fechado se a verificação vier ausente/malformada.
- Brief do GT20 salvo antes da correção não tem `blockingRisks` e continua bloqueado; para reavaliá-lo é preciso "Gerar outline de novo" (≈3 chamadas de IA).
- Teste de regressão com as 8 cautelas do GT20 em `src/lib/editorial-foundation.test.ts` (13 testes passam); `pnpm validate` passou.
- Oito perspectivas: Produto Pass (fluxo honesto avança); CTO Pass (helper puro, sem schema/migration); IA Pass (fail-closed para risco material, intenção incerta, fonte insuficiente e verificação ausente); Segurança Pass (sem mudança de auth/RLS; gate de auto-publish intocado); UX Pass (bloqueios x cautelas distintos); CX N/A (nada público mudou); Growth N/A (sem publicação); PMO Pass com pendência: validar com outline real regenerado do GT20.
- `EDITORIAL_AUTO_PUBLISH` continua ausente. Nenhum artigo gerado ou publicado.

## Adendo 26/09/2026 23:40 UTC — bike IDs do piloto e módulos

- **Limitação do piloto:** os cinco vídeos foram semeados a partir do DOCX **sem bike IDs**; por isso os cinco briefs saíram com `modules=[]`. Isso **não** é prova de integração Radar/Quiz — é ausência de contexto. A integração contextual permanece **não comprovada** até regenerar outlines com bikes associadas.
- **Correção de dados (feita pelo operador, não por este commit):** bikes associadas somente nos cinco drafts e nos cinco `editorial_videos`: GT20=`coswheel_gt20`; V20 Mini=`v20_mini`; FT03=`ft03`; V8 Pro/V40 Pro=`v8_pro`+`v40_pro`; triplo=`v29_pro`+`v8_pro_s`/`v35`. Drafts em revision 2; os dois publicados não foram tocados.
- **Código:** o outline grava `stages.outline.bikes` (chave ordenada de bike IDs). Escrever rascunho e QA recusam com `brief_bikes_stale` se as bikes mudaram ou se o outline é anterior a esse controle (fail-closed — os cinco outlines atuais precisam ser regenerados). Evidências/intenção salvas só são reaproveitadas se transcrição **e** bikes forem iguais. Módulos só podem referenciar bikes associadas ao artigo (não o catálogo inteiro); sem contexto, `modules=[]` continua válido e não é forçado.
- **Testes:** chave/obsolescência por bikes e módulo contextual com fonte/bike corretos (bike não associada descartada, lista vazia aceita).
- **Próximo passo do operador:** regenerar ao menos um outline (~3 chamadas IA) e conferir se módulos aparecem com justificativa contextual. NO-GO para produção em massa segue vigente.

## Publicação do painel e limite do piloto (26/09/2026)

- Cinco outlines privados foram gerados pelo painel a partir do DOCX. Classificação real: três `real_world_test` e dois `direct_comparison`. A prova de cinco intenções distintas falhou; não forçar rótulos. Os dois artigos publicados permanecem intactos.
- A correção contextual do Radar exige `radarOmission` no schema, orienta o estrategista a posicionar Radar depois da seção de preço quando houver oferta pertinente e bloqueia outline sem módulo nem justificativa específica. A prévia do Admin mostra somente o plano enquanto o artigo não tem corpo.
- Alterações integradas diretamente pelo Code Editor do Lovable em `main`; teste direcionado do gate: 19/19. `pnpm validate` passou com typecheck, 47 testes e build antes da publicação. O frontend foi publicado pelo botão do Lovable e o smoke autenticado em produção confirmou 'Outline sem artigo escrito'.
- O teste vivo de regeneração do outline V29 Pro/V8 Pro S/V35 parou com `ai_http_402` nos logs de `editorial-admin`: o gateway de IA recusou a chamada por falta de créditos. O outline anterior foi preservado; não há prova viva do novo contrato da função nem do QA de um artigo novo. A função atualizada foi confirmada em produção: a nova mensagem de ai_http_402 apareceu no painel após o deploy. O bloqueio de créditos impede testar geração bem-sucedida e QA.
- `EDITORIAL_AUTO_PUBLISH` continua desligado. Nenhum artigo piloto foi escrito ou publicado. Para liberar escala, é preciso restabelecer o gateway, regenerar os outlines com Bikes associadas, validar Radar/omissão e QA, e comprovar cinco intenções editoriais genuinamente distintas com fontes adequadas.
- Revisão posterior das oito perspectivas: Produto Pass para o painel e gate de QA; CTO Pass para frontend e função ativa, pendente de geração bem-sucedida; IA Pass local, pendente de geração viva; Segurança Pass (RLS e gate preservados); UX Pass no smoke da prévia; CX Pass para etapas privadas retomáveis; Growth/SEO-IA Fail para escala por falta de diversidade e prova Radar; PMO/QA Fail para liberação de publicação em massa por `ai_http_402`. Decisão consolidada: painel publicado; NO-GO para publicação automática em massa.
- Custo para retomar: créditos de IA do Lovable e chamadas de teste; não comprar créditos automaticamente. Rollback do painel: publicar revisão anterior do site; da função: reimplantar versão anterior. O banco editorial é aditivo e os dois publicados não dependem da fundação.

# Voz de especialista e slug editorial — 28/09/2026

## Revisão prévia (estrutural: IA e SEO)

| Perspectiva | Impacto, risco, dependência e recomendação                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Explicar a bike para orientar o leitor. Risco de empobrecer informações; manter exemplos concretos e a estrutura aprovada.            |
| CTO         | Slug do H1 final na geração. Risco de colisão e URLs existentes; sufixo de artigo e preservação de publicados.                        |
| IA          | Organizar por problema/critério, sem cronologia nem ressalvas repetidas. Fonte privada, mesma chamada/modelo, nenhum teste inventado. |
| Segurança   | Sem auth/RLS/schema novos. Fonte não confiável e revision lock preservados.                                                           |
| UX          | Estrutura, capa, módulos e botão único preservados; nenhuma opção nova.                                                               |
| CX          | Instrução corrigida na chamada existente; evitar testes pagos e geração repetida.                                                     |
| Growth/SEO  | Slug acompanha H1 antes da primeira publicação. URLs publicadas estáveis. Voz de especialista não inventa experiência própria.        |
| PMO/QA      | Testar slug novo, publicado preservado, colisão e linguagem de resenha; validate. Rollback ab09dca.                                   |

Decisão: corrigir instrução primária/refinamento existentes e slug do H1 antes da primeira publicação. Preservar URLs já publicadas e disposição dos blocos. Detector sinaliza referências de resenha; não mede qualidade inteira por regex nem bloqueia contextos de teste úteis. Sem score ou etapa nova. Autorização de implementação/publicação persiste nesta tarefa; nenhum crédito IA usado nos testes. Não regenerar corpus. Exemplos de vídeos não constituem taxonomia fechada; tema e necessidade do leitor orientam qualquer artigo, com ou sem bike.

## Revisão posterior

| Perspectiva | Estado e evidência                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto     | Pass: voz orientada ao assunto e ao leitor; nenhuma mudança de estrutura visual.                                                                                                                                                                      |
| CTO         | Pass: slug usa H1 final, mantém URL já pública, colisão usa ID de artigo, revision lock intacto.                                                                                                                                                      |
| IA          | Pass local: instrução qualitativa na chamada principal/refinamento existente; assunto livre, fatos e sourceExcerpt preservados. Nenhum resultado de IA novo foi gerado como teste; qualidade final precisa ser observada nas próximas gerações reais. |
| Segurança   | Pass: sem schema/RLS/auth/secret novo; não há escrita em artigos existentes.                                                                                                                                                                          |
| UX          | Pass: diff sem componentes, sem controles novos ou alteração da disposição aprovada.                                                                                                                                                                  |
| CX          | Pass: não exige classificar vídeo, definir plano ou consumir nova cadeia de IA.                                                                                                                                                                       |
| Growth/SEO  | Pass: título e metadados refletem assunto; slug editorial para não publicados; URLs existentes estáveis.                                                                                                                                              |
| PMO/QA      | Pass local:19 testes direcionados,47 regressões do validate, typecheck/build e sintaxe das duas fontes Edge aprovados.                                                                                                                                |

Limite: a mudança vale para novas gerações; os dois artigos publicados não são reescritos por efeito de deploy. Slugs desses publicados ficam estáveis para manter links/canonical; alteração posterior exigiria aliases/redirect. Rollback: ab09dca. Sem chamada paga, sem nova versão do prompt no banco; regra editorial aplicada pelo escritor no código.

---
