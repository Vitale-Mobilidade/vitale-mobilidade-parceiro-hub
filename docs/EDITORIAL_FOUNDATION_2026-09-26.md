# Fundação editorial orientada por fonte, SEO e diversidade

Estado: implementação local em `codex/editorial-foundation-20260926`; **não aplicada ao Supabase nem publicada**. O responsável autorizou implementação e publicação nesta thread e dispensou revisão humana de cada artigo novo. A prova com cinco outlines de intenções diferentes continua sendo um critério de arquitetura antes da produção em massa, conforme a especificação original.

## Classificação e decisão prévia

Mudança **estrutural**: IA, SEO, Supabase, Radar, Quiz, Admin e publicação de conteúdo. Escopo: preservar os dois artigos publicados; adicionar artefatos privados de fonte/outline/QA; rotear por intenção em nove arquétipos; compor módulos selecionados; executar SEO e QA antes da publicação automática. Fora de escopo: gerar 100 artigos, modificar os dois publicados, trocar o writer Sheets, reconstruir Quiz/Radar ou mudar domínio. Rollback: voltar ao deployment anterior e desabilitar a nova ação de geração; manter a tabela privada aditiva para diagnóstico, sem excluir dados.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Artigos deixam de seguir sequência única | Volume sem utilidade | Fontes reais e contribuição própria | Prosseguir com QA que bloqueia páginas repetitivas |
| CTO | Usa Admin, Edge Function e Supabase atuais | Schema novo e composição pública | Migration aditiva, teste de restauração | Prosseguir condicionado à recuperação |
| IA | Separa fonte, intenção, estratégia, redação, SEO e QA | Afirmação inventada ou instrução na transcrição | Trechos literais, schemas, revisão independente | Prosseguir com falha fechada |
| Segurança | Guarda evidências privadas | Vazamento de transcrição/draft | RLS e service role apenas no servidor | Prosseguir com teste de papéis |
| UX/UI | Exibe outline, distribuição e alertas | Operador interpretar score como garantia | Estados claros de bloqueio/publicação | Prosseguir após smoke autenticado/mobile |
| CX/Operação | Vídeos seguem no Admin; Sheets segue comercial | Erro sem forma de recuperação | Logs e reprocessamento por artigo | Prosseguir sem segundo writer |
| Growth/CRO e SEO/IA | Página específica, SSR e links reais | Canibalização, schema enganoso e perda de URL | Auditoria por URL e fontes oficiais | Prosseguir condicionado ao gate SEO |
| PMO/QA | Piloto mensurável antes de escala | Auto-publicação com teste insuficiente | Testes locais e ensaio operacional | Bloquear release até evidência |

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

| Perspectiva | Parecer | Evidência e pendência |
| --- | --- | --- |
| Produto | Pass | Nove arquétipos e módulos opcionais substituem o molde nos artigos novos; os dois publicados não são reescritos. |
| CTO | Fail para release | Typecheck, testes e build passaram; migration ensaiada em PostgreSQL 17 isolado. Falta backup recente restaurável do banco vivo e ensaio de recuperação correspondente. |
| IA | Pass local | Trechos literais, outline versionado, revisão SEO e QA independentes, publicação com falha fechada; ainda falta uma geração controlada real e a prova com cinco outlines. |
| Segurança | Pass local | RLS ligada; anon/authenticated sem SELECT e service_role com SELECT no ensaio SQL. Falta conferir os papéis no projeto vivo após a migration. |
| UX/UI | Fail para release | Estados de progresso, bloqueio e relatório no Admin compilam; falta smoke autenticado e mobile do fluxo novo. |
| CX/Operação | Pass local | Reprocessamento por vídeo e motivo de bloqueio; Sheets, ofertas e artigos legados não foram modificados. |
| Growth/CRO e SEO/IA | Fail para produção em massa | SSR, canonical, H1 e HTTP 200 conferidos nos dois artigos existentes; robots permite rastreamento e teste HTTP com user agent OAI-SearchBot retornou 200. Faltam cinco outlines de intenções distintas, HTML/metadata de artigo novo e medição por URL no vivo. |
| PMO/QA | Fail para release | `pnpm validate`: 47 testes, typecheck e build aprovados na primeira revisão; testes direcionados após a revisão de escala passaram. Ensaio isolado da regra SQL aprovou bloqueio sem brief/QA, publicação com QA e preservação dos dois legados. Backup e geração controlada real pendentes. |

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
| Vídeo | Arquétipo sustentado | Evidência | Risco |
|---|---|---|---|
| GT20 | product_review (primeiras impressões) | "acabei de retirar… primeiras impressões", recursos, velocidade | também tem trajeto e subida: pode colidir com FT03 |
| V20 Mini | audience_need (estatura) | "1,55 a 1,75 é o ideal", "sou grande demais" | — |
| FT03 | real_world_test (trajeto e ladeira) | "subida brutal", "teste real", bateria no trajeto | cita preço de ~R$ 8.000 datado: não vira fato |
| V8 Pro x V40 Pro | direct_comparison | autonomia, carga com garupa, preço "hoje" | preço datado |
| V29 Pro/V8 Pro S/V35 | use_comparison (duas baterias) | "entregador… quer rodar muito", 80–100 km | poderia ser audience_need; outline decide |
Conclusão: as fontes **sustentam cinco intenções distintas**, com um risco real de sobreposição entre GT20 e FT03. Se o outline do GT20 sair como teste de trajeto, registrar 4 intenções e não forçar.

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
