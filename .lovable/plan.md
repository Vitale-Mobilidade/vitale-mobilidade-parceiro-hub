# Revisão: fundação editorial (PR #2) no painel /admin/conteudos/novo

Esta é a revisão pedida. Nada foi editado ou publicado. Aprovar este plano significa só iniciar a Fase 0 abaixo, sem publicar nada.

## Resumo
- **Arquitetura:** boa base. O PR adiciona `editorial_briefs` privada, 9 arquétipos, a ação `outline-only`, um score de diversidade contra o corpus e uma trava no banco para publicação. Mas o PR está **aberto, não mesclado**, e foi escrito sobre uma base anterior. Estes arquivos mudaram depois (capas, funil do Quiz): `editorial-admin/index.ts` (+293 linhas no PR), `AdminEditorial.tsx` e `ArticleView.tsx`. Por isso ele precisa ser adaptado ao HEAD `8c500b3`, e não aplicado às cegas.
- **Prova de cinco outlines sem escrever artigos:** **o painel atual não permite.** Hoje `generate` sempre escreve o corpo completo. O painel proposto permite, pela ação `outline-only`. Só que o botão principal do PR é "Analisar, escrever e publicar", o que é arriscado demais como padrão.
- **As cinco fontes suportam cinco intenções?** **Não.** Classificação honesta:

| Vídeo | Intenção provável | Observação |
|---|---|---|
| GT20 (aDLpuoXPofU) | primeiras impressões / teste real | review |
| V20 Mini (9FklzW-rpQU) | review de unidade emprestada | sobrepõe o GT20 |
| FT03 (HTZASjgUxxQ) | review de produto | sobrepõe também |
| V8 Pro vs V40 Pro (okTQuDvRlB8) | comparação direta + preço de jun/2026 | preço citado é datado, não pode virar fato atual |
| V29 Pro vs V8 Pro S vs V35 (uhq6h4IIjyE) | necessidade de público (entregador, duas baterias) / comparação por uso | intenção de fato distinta |

Resultado: **3 intenções claras** (review/teste, comparação direta, necessidade de público). As três reviews só podem se diferenciar por ângulo, por exemplo teste de rua com velocidade máxima e chuva, ou autonomia. Isso é diferenciação de outline, não de intenção. A prova deve registrar "3 intenções + 2 variantes de review", sem forçar cinco.

## Revisão pelas oito perspectivas
- **Produto — Pass condicional.** Separar "outline" de "redação" é o ganho certo. Manter os dois artigos publicados intocados: a trava do PR só vale para `foundation_required=true`.
- **CTO — Fail até adaptar.** Há conflito com o HEAD. A trava substitui `editorial_article_before_update` inteira. É preciso comparar com a versão viva (capas, revisão otimista) antes de trocar, ou os comportamentos atuais se perdem. `status` em `editorial_briefs` sem trava de revisão na escrita do brief é um risco de corrida.
- **IA — Pass condicional.** Transcrição entra como `untrusted_source_json`, e as evidências têm IDs. Duas lacunas: ninguém mede se cada afirmação do texto aponta para um trecho literal, e a classificação precisa poder responder "intenção incerta" em vez de escolher à força um dos 9 arquétipos.
- **Segurança — Pass.** A tabela é só `service_role`, com RLS ligada e sem acesso público. Links `meli.la` e preços ficam fora do brief. Um ponto: a trava do banco aceita publicar quando `articleQaPass='true'` no JSON. Esse valor tem de ser gravado só pela função, nunca vir do cliente.
- **UX — Fail na proposta.** O botão padrão publica. Deve ser "Gerar outline" → mostrar outline, arquétipo, alertas de diversidade → "Escrever rascunho" → a publicação automática só acontece se o QA passar. Faltam mensagens para bloqueio de QA, tempo esgotado e intenção incerta.
- **CX — N/A.** Nenhuma página pública muda nesta fase.
- **Growth + SEO/IA (decisivo) — Fail para produção em massa, Pass para a fundação.** Está alinhado ao Google Search Central (conteúdo útil e original, sem conteúdo em escala para manipular ranking, FAQ sem rich result garantido) e ao FAQ de publishers da OpenAI (acesso do OAI-SearchBot via robots, sem promessa de citação). Sem llms.txt "mágico" e sem FAQ forçado: o outline do PR já trata FAQ como opcional. O risco principal é o de "scaled content abuse": três reviews com o mesmo esqueleto. O score de diversidade é heurístico (abertura e títulos iguais) e **não detecta paráfrase**. Ele precisa bloquear, não só alertar.
- **PMO/QA — Fail até existir recuperação.** O próprio PR declara NO-GO: faltam backup restaurável e o ensaio de restauração.

## Lacunas concretas
1. **Escala e tempo:** um `generate` do PR faz em série classificação, outline, redação, revisão SEO e QA, ou seja, 4 a 5 chamadas de IA numa única requisição em streaming. Com transcrições de 12 a 17 mil caracteres, dá para estimar vários minutos por artigo. Isso pode estourar o tempo de uma Edge Function e perder o que já foi feito. As etapas precisam ser gravadas uma a uma e poder ser retomadas.
2. **Corpus:** o corpus é lido com `limit(200)` e 4.000 caracteres por artigo, a cada geração. Serve para 100 artigos, mas o custo em tokens cresce. Melhor guardar uma "impressão" (headings, abertura, conclusão) por artigo.
3. **Custo:** para 100 vídeos, cerca de 500 chamadas. Não há fila, limite por dia ou pausa quando os créditos acabam.
4. **Recuperação do banco:** ainda não há backup lógico das tabelas editoriais nem ensaio de restauração. Existe `docs/GATE0_RESTORE_REHEARSAL.md`, que deve ser reaproveitado.
5. **Fontes:** a quantidade de transcrições já importadas no Admin ainda precisa ser conferida. O PR citava 3. As cinco deste anexo precisam ser importadas pelo Admin (`video-save`), sempre como dado e nunca como instrução.

## Sequência segura (próximas rodadas)
```text
0. Conferir no banco quais transcrições existem e fazer backup lógico das tabelas editoriais
1. Adaptar o PR ao HEAD atual (unir a trava do banco com a versão viva)
2. Migration aditiva -> verificar se os 2 artigos publicados ficaram idênticos (slug/status/blocks/revision)
3. Deploy só de editorial-admin, com outline-only e etapas retomáveis
4. Painel: "Gerar outline" como ação padrão, publicação desligada por padrão
5. Importar as 5 transcrições -> gerar 5 outlines -> relatório de intenção/diversidade (sem corpo)
6. Um rascunho piloto não publicado -> QA automático falhando fechado
7. Só então publicar o site; produção em lote apenas depois
```

## Detalhes técnicos
- Base: HEAD `8c500b3`. PR #2 sobre a branch `codex/editorial-foundation-20260926`, 12 arquivos, sem mesclar.
- Mudança pedida na trava do banco: exigir `brief.article_revision = OLD.revision` (o PR já faz) e acrescentar um `quality_report.stage='final'` gravado só pelo servidor.
- A classificação ganha a saída `uncertain`, que bloqueia a etapa de redação.
- O score de diversidade passa a bloquear abaixo de um limite, para artigos novos com `foundation_required`.
