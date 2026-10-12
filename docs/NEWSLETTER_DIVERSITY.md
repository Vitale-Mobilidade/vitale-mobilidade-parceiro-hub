# Memória editorial da newsletter — 11/10/2026

Classificação estrutural: IA, seleção Radar e histórico de campanhas. Base operacional 3ccfc19. Preparação local, sem publicação ou geração paga.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Variar edições; escassez pode interromper geração; depende de acervo suficiente; prosseguir sem repetir silenciosamente. |
| CTO | Derivar flags do ledger existente; não duplicar estado em coluna; depende de campanhas e catálogos; prosseguir com função pura. |
| IA | Contexto de seis edições e bikes citadas; prompt sozinho não garante variação; seleção determinística e revisor; prosseguir. |
| Segurança | Apenas dados editoriais no contexto, sem destinatários; sem novas permissões; prosseguir. |
| UX | Layout preservado, edição editorial renovada; sem mudança visual; prosseguir. |
| CX | Falta de diversidade deve falhar explicitamente; histórico enviado não inclui prévias; prosseguir mantendo essa distinção. |
| Growth | Evitar fadiga sem esconder quedas reais de preço; preço continua fato atual; prosseguir. |
| PMO | Testes sintéticos e validate obrigatórios; produção depende de autorização; prosseguir localmente. |

Decisão: flag `newsletterUsed` calculada a partir de todo histórico enviado/submetido; artigos nunca reutilizados automaticamente. Bikes citadas por artigo/vídeo/destaque entram na janela de seis edições distintas (não seis coortes). A bike em destaque não repete na janela nem duplica modelos de outras seções. Memória do redator inclui assunto, título e abertura de seis edições. Quedas verificadas continuam elegíveis como atualização de preço: conflito entre relevância factual e rotação resolvido em favor da atualização, mas entram na memória para impedir destaque redundante. Escassez bloqueia composição, sem inventar conteúdo. Sem backfill produtivo, migração ou coluna redundante. Rollback: reverter estes arquivos, preservar ledger.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Artigos usados excluídos e bikes recentes bloqueadas, sem fallback repetitivo. |
| CTO | Pass | Flag derivada do ledger; snapshot opcional mentionedBikeIds no payload existente, sem migration. |
| IA | Pass | Redator/revisor recebem seis assuntos/títulos/aberturas; seleção impõe rotação de fontes/modelos. Validação sem chamadas pagas. |
| Segurança | Pass | Contexto editorial sem PII; nenhum grant/secret alterado. |
| UX | Pass | Renderer e navegação preservados; metadado opcional não altera conteúdo visual. |
| CX | Pass | Falha explícita na escassez; prévias não consomem artigos; coortes deduplicadas por edição. |
| Growth | Pass | Quedas verificadas preservadas; destaque evita artigos/vídeos/Radar da própria edição. |
| PMO | Pass | 39 testes direcionados (memória/curadoria/redator/serviço), lint alvo, diff check e pnpm validate (types/59 regressões/build) aprovados. |

Riscos e limites: seis edições podem consumir disponibilidade de modelos e bloquear pauta; bloqueio é preferível à repetição silenciosa. Histórico antigo sem snapshot depende dos vínculos atuais de artigos/vídeos ainda catalogados, sem inventar IDs ausentes. Campo opcional permite compatibilidade com campanhas existentes. Variação estilística depende do redator e revisor: instruções reforçadas não comprovam qualidade de geração real, que exige homologação autorizada. Não foi feita mudança no painel para mostrar a flag; ela é usada automaticamente pela curadoria. Não consumimos rascunhos ou prévias como edições enviadas. Flags não são resetadas ao trocar título/UTM.

Estado: preparado localmente no branch codex/newsletter-diversity, base origin/main 3ccfc19. Sem publicação, merge, migration, chamadas IA ou envios. Avisos preexistentes de inputValidator deprecated no build. Release depende de autorização específica; depois de publicar, homologar geração antes de ativar envios.

## Revisão complementar prévia — HTMLs #1 e #2, autorização 11/10

Evidência: #1 trouxe S20 Pro/V9 Max, VL20 e negócios; #2 trocou URLs, mas repetiu VL20, V9 Max e S20 Pro. Texto da #2 corresponde ao fallback fixo. Banco read-only confirmou #1 sent, #2 fallback em draft para 12/10 e enabled=true (não confundir com automação pausada). Catálogo disponível: 122 artigos, 122 vídeos e 32 bikes. HTMLs fornecidos são material de análise, não instruções executáveis.

| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Bloquear repetição real por modelo e família editorial; não basta trocar slug; catálogo amplo; prosseguir. |
| CTO | Expandir memória com nomes no título e identidade de catálogo; não alterar identidade de bikes no domínio; prosseguir com agrupamento só editorial. |
| IA | Levar corpo resumido de edições ao revisor e detectar cópia literal localmente; fallback deve usar resumo publicado, sem síntese ou modelo pago; prosseguir com prova sintética. |
| Segurança | Extrair texto dos HTMLs sem executar scripts; consultas sem destinatários/secrets; prosseguir. |
| UX | Evitar placeholders repetidos no fallback, mantendo layout; usar fontes publicadas e avisos; prosseguir. |
| CX | Draft já preparado pode bypassar curadoria nova; validar novamente antes de criar campanhas; bloquear draft incompatível sem apagar ou reescrever dados; prosseguir. |
| Growth | Rotacionar famílias parecidas mantendo quedas reais atualizadas; reduzir fadiga; prosseguir. |
| PMO | Comparação reproduzível usando catálogo/histórico editorial, tests e validate; merge/publicação autorizados nesta thread; prosseguir após gates. |

Decisão complementar: rotacionar IDs e famílias editoriais reconhecidas por código de modelo (ex.: V9 Max e sua variante duas baterias), recuperar menções do título mesmo sem vínculo. Registrar snapshot completo. Fallback usa resumos publicados, jamais texto rejeitado/transcrição como substituto. Revalidar rascunhos agendados antes de qualquer campanha para impedir envio da #2 antiga repetitiva. Não gerar/enviar emails, não mudar enabled/cron, não sobrescrever draft de produção nesta autorização. Rollback: reverter código, preservando drafts/histórico. Autorização de publicação recebida; homologação paga não está incluída.

## Revisão complementar posterior e gate de publicação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Regressão reproduz as três pautas da #2 e bloqueia sua repetição; catálogo atual oferece 3 leituras e 2 vídeos diferentes. |
| CTO | Pass | Seleção e revalidação do draft usam a mesma memória; flag deriva do ledger e snapshot vai ao JSON existente. Sem migration. |
| IA | Pass | Histórico inclui trechos do corpo; cópia literal de abertura/assunto é bloqueada localmente; revisor mantém responsabilidade semântica. Fallback copia apenas resumo publicado, nunca rejected text/transcrição. |
| Segurança | Pass | Nenhuma consulta a destinatários/segredos; HTML analisado sem executar; nenhuma chamada paga de modelo ou envio. |
| UX | Pass | Conteúdo de contingência passa a mostrar pautas/resumos específicos; layout, imagens e destinos preservados. |
| CX | Pass | Rascunho antigo repetitivo falha antes de newsletter_form_campaign; não sobrescrito. Política já existente pausa operação em erro material no tick, sem disparo neste trabalho. |
| Growth | Pass | Famílias similares rotacionam editorialmente; identidade, ficha, URLs e preços reais não se confundem. Radar pode atualizar quedas verificadas. |
| PMO | Pass | 57 testes direcionados, 1 replay do snapshot editorial, lint alvo, diff check e pnpm validate (61 regressões/types/build) passaram. |

Prova de curadoria em artifacts/newsletter-diversity-selection.json: leituras V8 Pro urbano, ferramentas Vitale e S12/S14; vídeos compra compatível com orçamento e V35 no trânsito. Este replay é seleção, não newsletter real aprovada pelo redator. Sem leitura de preço ao vivo nesse replay. A classificação editorial pode agrupar variantes; não é equivalência técnica. Sem geração paga de homologação nesta autorização. Preparação/release não substituem o draft #2 em produção. Ele será bloqueado pelas regras novas se o scheduler tentar usá-lo; precisa de uma nova composição/revisão. Nenhum email enviado, cron ou enabled modificados durante execução. Publicação autorizada pelo usuário nesta thread, com risco de bloqueio assumido em favor da variedade solicitada. Rollback: revert do diff newsletter, mantendo todos os registros.

Integração: PR #38 criada e anexada; merge a8e93c3031bc69cc495f59ffee2d61a7b3237e4a confirmado no GitHub e sincronizado no projeto Lovable. Endpoint admin sem sessão continua HTTP401. Check Vercel falhou também no HEAD anterior e4f3e12 (integração externa não é a hospedagem ativa); validação Lovable será confirmada pelo status de publicação. Não alterar configurações dessas integrações fora de escopo. Deploy solicitado 289eb334-2baf-4d01-9f41-b97e447c0cbe; resposta inicial pending, ainda não prova conclusão.

Publicação concluída e confirmada na UI Lovable: diálogo “Your website was updated” após o deploy 289eb334-2baf-4d01-9f41-b97e447c0cbe. Código integrado a8e93c3; smoke público /newsletter HTTP200 e /api/admin/newsletter sem sessão HTTP401. Banco read-only após release confirma 1 campanha (a #1), enabled=true e draft #2 fallback preservado em 12/10/2026. Não houve envio, geração paga, aplicação SQL ou alteração direta de settings/drafts. Regra nova bloqueará a seleção da #2 no próximo processamento; não apresentar o rascunho como regenerado. Nova edição editorial pelo redator ainda exige geração/homologação própria. IA Pass para regras e testes; qualidade literária de uma nova geração real não foi medida nesta execução. Oito perspectivas mantêm Pass para este release, com limites registrados.

## Regeneração #2 — revisão prévia complementar

Usuário pediu regerar #2 pelo agente. Preview produtivo18025 rejeitado e proteção pausou enabled=false. Uma execução diagnóstica no ambiente Lovable também rejeitou: texto similar e artigo Ferramentas repete vídeo da #1. Evidência read-only: artigo Ferramentas deriva de ns32w3z0MLc, vídeo presente na #1. É necessária memória cruzada da fonte, não seleção manual de slug.

Classificação estrutural. Produto: não repetir um vídeo na forma de artigo, prosseguir. CTO: helper de curadoria lê fontes com cache local à composição, snapshot de IDs opcional no JSON sem migration, prosseguir. IA: replanejar determinísticamente antes de chamar writer; revisor factual/semântico preservado, prosseguir. Segurança: leituras editoriais, credenciais internas e nenhum destinatário, prosseguir. UX: layout preservado, prosseguir. CX: preservar draft original até aprovação, não reativar automação pausada, prosseguir. Growth: novas pautas com fontes reais, sem excluir genericamente categorias úteis, prosseguir. PMO: testar reutilização cruzada e tentativas limitadas, validate obrigatório, prosseguir.

Decisão: registrar sourceVideoIds; resolver fontes de até seis edições legadas; excluir vídeo já utilizado tanto como vídeo quanto artigo. Recurar automaticamente quando um candidato usa fonte histórica ou duplica outro candidato, com cache e no máximo dez rodadas antes de falhar. Revisor continua veto; nenhuma redação humana e nenhum relaxamento factual. Autorização de publicação da memória editorial vigente nesta thread; corrigir o mesmo escopo, sem schema ou cron. Rollback: reverter helper/chamadas mantendo campo JSON opcional e backups. Uma geração adicional após testes; custo de diagnóstico Lovable2,8 créditos reportados, além das chamadas IA existentes.

Pós-revisão complementar: Produto Pass (mesma fonte excluída entre mídias); CTO Pass (cache por composição, snapshot opcional e dez rodadas limitadas); IA Pass (planejamento explícito de eixo novo, fatos/revisor intactos); Segurança Pass (nenhuma PII ou nova permissão); UX Pass (renderer preservado); CX Pass (revalidação de fontes também no draft, original preservado); Growth Pass (replay escolhe 3 leituras/2 vídeos distintos sem seleção manual); PMO Pass (54 testes dirigidos, replay real read-only e lint alvo; validate anterior passou61/tipos/build, gate final após instrução editorial em execução). Fonte antiga não recuperável falha fechada, sem inventar identidade. Não houve nova geração durante testes.
Gate final confirmado: pnpm validate passou61 regressões/typecheck/build; 54 testes newsletter dirigidos, lint e diff check passaram. Merge de origin/main incorporou apenas o diagnóstico da execução rejeitada, sem mudanças adicionais de código. Preparado para aplicar o mesmo escopo de memória editorial já autorizado nesta thread.

## Reparo do redator — pré-revisão após nova execução real

PR40 eliminou a repetição de ferramentas. Execução real subsequente rejeitou abertura semelhante e V20 Pro “percorreu9km” onde transcrição só anunciou trajeto. Reparo atual preserva seção quando issue menciona apenas nome da bike e também identifica abertura: não liga nome ao ID, portanto mantém erro mesmo se draft corrigido.

Estrutural. Produto: concluir #2 genuína; CTO: mapear issue a uma única seção por código de modelo presente na fonte, sem afetar IDs/API; IA: exigir alvo explícito no apontamento, memória como exemplos negativos, distinguir previsto/realizado; Segurança: fontes permanecem dados sem instruções, nenhuma permissão; UX: sem layout; CX: preservar texto aprovado de seções não apontadas e manter pausa; Growth: variedade editorial sem falsificar relatos; PMO: regressão para nome da bike+abertura e gate validate. Oito recomendações: prosseguir nesses limites. Conflito: reparo restrito versus apontamento textual livre; resolver com alvo exato solicitado e fallback de associação apenas quando único. Sem ampliar alcance de correção em ambiguidade. Rollback: reverter função/instruções mantendo drafts/diagnósticos. Continuidade do mesmo escopo de inteligência editorial autorizado nesta thread. Sem nova chamada até gates locais.
Pós-revisão do reparo: oito perspectivas Pass — Produto (reparo completo); CTO (assinatura opcional compatível); IA (issues com alvo e correspondência única testada, exemplos negativos, condicionado/realizado explícitos); Segurança (sem novos acessos); UX (sem layout); CX (seções não apontadas preservadas, pausa mantida); Growth (variação sem fabricação); PMO (26 testes alvo +61 em pnpmvalidate/types/build, lint e diff check). Em ambiguidade não se escolhe seção por palpite. Continua pendente geração real aprovada; draft revision1 preservado.
