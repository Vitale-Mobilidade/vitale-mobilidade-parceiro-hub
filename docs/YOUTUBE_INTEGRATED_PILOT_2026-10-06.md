# Piloto integrado no projeto ativo

> **Estado vigente após autorização de publicação automática:** oito pendentes publicados pelo cron, 115 publicados + 1 piloto antigo em draft; artigo+capa+QA→publicação automática, jobs ativos e fila zerada. Conferência completa em [YOUTUBE_AUTOMATIC_PUBLICATION_2026-10-06.md](./YOUTUBE_AUTOMATIC_PUBLICATION_2026-10-06.md). Referências abaixo a entrega draft, cron pausado ou publicação fora de escopo documentam marcos anteriores, não o contrato atual.

Classificação: estrutural (Sheets, OAuth, IA, persistência). O teste local anterior comprovou download, não comprovou o fluxo Lovable. A conferência posterior encontrou 115 vídeos e 107 artigos publicados associados por ID, oito pendentes sem correspondência exata por título. Não gerar histórico em lote.

## Decisão e revisão anterior à liberação

| Perspectiva | Impacto | Risco | Dependência / recomendação |
|---|---|---|---|
| Produto | Um piloto no Admin e futuros vídeos pela mesma entrada | Disparo do acervo | Baseline transacional; oito históricos só por escolha explícita |
| CTO | `generate-from-sheet` e `youtube-hourly` chamam o writer atual | Corridas manual/automático e interrupções | Reserva única persistida; revisar execução incerta; prosseguir condicionado ao teste cloud |
| IA | Transcrição original capturada no servidor | Resumo/truncamento/ASR errado | Sem modelo na captura; arquivo e cues preservados; sem fallback |
| Segurança | OAuth somente em secrets do projeto | Tokens públicos / cron aberto | RLS sem grants clientes; chave privada do worker; owner Admin válido |
| UX | Opção no formulário dispensa copiar texto | Operador supor sucesso em falha | Progresso por estágio; rascunho aberto; erro explícito |
| CX | Falha requer conferência | Repetição paga após timeout | Reserva durável; nunca replay automático; registrar origem privada |
| Growth | Writer/SEO existente preservados | Publicar conteúdo não revisado | Nenhuma publicação automática no piloto |
| QA | Mesma Edge Function na entrada Admin/horária | Declarar validação real com mock | Testes locais antes; teste integrado só após instalação no projeto |

## Escopo e conflitos

- Criar artigo pela entrada Admin de um vídeo selecionado, com título/bikes da planilha e legenda oficial obtida pelo servidor. Browser envia somente o ID; não envia resumo/transcrição manual nesse modo.
- Fonte integral fica em tabela privada antes da chamada de IA. Reserva exclusiva por vídeo também cobre a criação manual de novos artigos quando integração habilitada. Falha incerta permanece reservada para conferência; não liberar/repetir automaticamente.
- Artigo existente de qualquer status ativo é reutilizado no modo automático, sem regenerar IA. Links diferentes mantêm o mesmo ID.
- Entrada horária privada consulta a planilha e usa o MESMO generateStream. Primeiro snapshot guarda histórico; máximo um candidato novo por execução; flags horária e captura separadas.
- Capa do formulário continua pelo compositor browser atual. Isso **não equivale a capa autônoma no servidor**. O cron preparado nesta etapa gera somente rascunho de artigo. Publicação/capa sem browser dependem de implementação e validação próprias; não afirmar fluxo completo artigo+capa+publicação pronto.
- Divergência: automatizar capa agora requer mover renderização de título/crop para runtime server, mudança além da captura. Escolha: provar pipeline integrado do artigo primeiro, mantendo requisito de capa autônoma pendente e explícito.
- Rollback: desligar YOUTUBE_HOURLY_ENABLED e YOUTUBE_EDITORIAL_ENABLED; desativar somente cron novo, manter fontes/artigos/fluxo manual. Não excluir fontes nem artigos.

## Instalação pendente

Migration privada; secrets YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, flags; deploy editorial-admin e frontend. Chave/owner/cron apenas após piloto. Nenhuma migration/deploy/geração desta etapa executados até o registro do teste cloud. O agendamento não está incluído na migration de fontes para impedir ativação acidental.


## Evidências da preparação e segunda revisão

- 55 testes dirigidos aprovados: entrada Admin/horária, autenticação do worker, flags, baseline sem IA, recusa de snapshot parcial/duplicado, reserva concorrente, captura e persistência antes do writer, reuso sem gasto, erros sem fallback, parser/OAuth e catálogo.
- pnpm validate aprovado: typecheck, 59 regressões e build SSR.
- Lint de regras de código sem erros; quatro avisos de hooks preexistentes. Formatação geral preexistente não foi reescrita (checagem dirigida com prettier/prettier desativado).
- Consultas read-only do ambiente Lovable: 107 artigos publicados, nenhum ID de vídeo ativo duplicado; cron existente apenas catálogo de bikes e workers de imagens/perfis. Nenhum job de vídeo foi encontrado.
- Config de gateway preparada com verify_jwt=false: Admin continua verificando JWT com getUser e associação ativa; a entrada horária verifica chave privada e owner Admin. Necessário para o job não depender de sessão humana. Deve ser instalado junto do código, nunca isoladamente.
- Migration acrescenta índice único por vídeo ativo como segunda barreira contra duplicação; tabelas sem acesso anon/authenticated. Nenhuma migration executada nesta preparação.
- Falha na captura fica em conferência, sem retentativa automática neste piloto. A política de retentativas preparada anteriormente ainda não está conectada a essa reserva. Isso precisa ser tratado antes de liberar operação horária contínua.

| Perspectiva | Resultado da preparação local | Evidência/limite |
|---|---|---|
| Produto | Pass | Um vídeo explícito; nenhum histórico em lote; flags desligadas por padrão |
| CTO | Pass | Caminho compartilhado Admin/worker, reserva e índice; execução cloud ainda pendente |
| IA | Pass | Fonte oficial persistida integralmente antes de IA; nenhum resumo aceito do cliente |
| Segurança | Pass | Secrets só servidor, RLS privado, autenticação própria para ambos os caminhos |
| UX | Pass | Opção localizada no formulário, progresso/erro/reuso explícitos; revisão visual cloud pendente |
| CX | Pass | Falha incerta bloqueia replay pago; retentativa contínua ainda pendente |
| Growth | Pass | Só rascunho; writer existente; publicação automática não liberada |
| QA | Pass | 55 testes dirigidos + validate; preparação não é prova integrada de produção |

Estado: código preparado localmente para instalação e piloto de artigo no Lovable. NÃO validado em cloud. NÃO concluído o fluxo autônomo de capa/publicação nem liberado cron. Nenhum GO para operação editorial contínua; somente instalação controlada e teste unitário real após autorização de escopo.

## Mudança de escopo solicitada — capa obrigatória no servidor

Usuário exige geração de capa automática, sem marcar checkbox e sem navegador aberto. Classificação estrutural. A limitação anterior de compositor browser deixa de ser escopo aceitável para o novo piloto.

| Perspectiva | Impacto / risco | Dependência / decisão antes da implementação |
|---|---|---|
| Produto | Artigo só conclui com capa; crédito adicional de uma imagem | Um piloto; acervo não disparado |
| CTO | Composição 1280×720 no servidor; CPU/memória/WASM | Assets locais empacotados, dimensão/bytes limitados, smoke real pendente |
| IA | Reaproveita coverGenerate e modelo/prompt/referências atuais | Não trocar modelo nem chamar imagem em teste offline |
| Segurança | Decodificar imagem do provedor e carregar font/WASM | Pacote fixado, proveniência/hash/licenças; sem rede na composição; limite antes de decode |
| UX | Capa obrigatória na entrada automática | Checkbox fica só no manual; mostrar etapa e falha, sem fingir sucesso |
| CX | Falha de capa conserva artigo e reserva para conferência | Nunca repetir article/cover pagos automaticamente após resultado incerto |
| Growth | Preservar marca e título exatos; imagem no rascunho | Nenhuma publicação pública no piloto; validar aparência |
| QA | Testar compositor offline e caminho compartilhado | Testes de bytes/dimensões/fidelidade e revisão de imagem sintética, validate e cloud depois |

Decisão: mover somente regras comuns de quebra de título para helper puro; implementar compositor server com codecs WASM fixados e Inter ExtraBold local licenciado; integrar coverGenerate → composição → coverApply dentro do generateStream no modo da planilha, usado igualmente pelo job. Não introduzir segundo gerador nem dependência de API de renderização paga. Risco residual de runtime Cloud só se resolve no piloto. Rollback por flags/code; preservar fontes/artigos. Sem ativar cron nem publicar conteúdo automaticamente nesta etapa.

## Capa no servidor — preparação implementada e segunda revisão

- generateStream no modo da planilha agora executa coverGenerate (modelo/prompt/referências existentes) → composeServerCover → coverApply (mesmo storage privado e lock de revisão). O job usa o mesmo caminho; nenhum checkbox é enviado/necessário. A interface não chama novamente a geração/composição browser nesse modo.
- Estado cover_generating salva o ID do artigo antes do custo de imagem; só marca done depois de aplicação confirmada. Falha conserva artigo/capa anterior e reserva em needs_review, sem repetir texto/imagem pagos.
- Compositor server: recorte proporcional com interpolação, gradiente, marca, Inter ExtraBold e título exato sem truncar; JPG 1280×720 até 4 MB. PNG/JPEG de entrada até 12 MB e 4,2 MP; WebP ou glyph ausente falham explicitamente, sem fallback pago ou perda do título.
- Fontes/codecs locais fixados e licenciados, hashes em PROVENANCE.json. Assets embutidos em TypeScript, sem fetch/arquivos em runtime; evita depender do bundle de arquivos estáticos/Docker no deploy por API Cloud. Regeneração offline: python3 scripts/build-cover-assets.py.
- Referência técnica verificada: https://supabase.com/docs/guides/functions/wasm (suporte a WASM e restrição do deploy de static_files via API). Codecs ImageScript 1.3.0 sob opção MIT, somente loaders adaptados para assets embutidos; Inter sob OFL incluída.
- 66 testes dirigidos aprovados; pnpm validate aprovado (typecheck, 59 regressões, build SSR); lint de código sem erros, mesmos quatro avisos preexistentes de hooks. Testes renderizam PNG/JPEG reais com dados sintéticos offline, sem chamar modelos. Saída visual conferida: título/brand legíveis e sem corte. Não é uma capa real do vídeo piloto.

| Perspectiva | Resultado da preparação da capa | Evidência / limite |
|---|---|---|
| Produto | Pass | Capa obrigatória no fluxo automático, apenas um piloto proposto |
| CTO | Pass | Composição sem navegador/rede, WASM/assets embutidos, armazenamento atual; runtime Cloud ainda pendente |
| IA | Pass | Mesmo gerador/prompt/referências; título aplicado por código; zero chamadas pagas em testes |
| Segurança | Pass | Limites antes do decode, assets fixados, fonte/storage privados, sem secrets novos públicos |
| UX | Pass | Sem checkbox no modo automático; etapa/falha claras; revisão visual offline realizada |
| CX | Pass | Artigo salvo sobrevive à falha da capa, reserva bloqueia replay pago |
| Growth | Pass | Marca/título exatos e imagem 1280×720; nenhum conteúdo publicado no piloto |
| QA | Pass | 66 testes dirigidos, validate e render real offline; teste Cloud não declarado concluído |

Estado atual substitui a limitação de capa browser do escopo anterior: artigo+capa preparados no servidor, ainda não instalados/testados no projeto Lovable. Próxima ação relevante: instalar migration/function/secrets/frontend e gerar um único rascunho com capa, usando os créditos atuais; não ativar cron contínuo nem publicar artigos. Rollback por flags/código, preservando registros.

## Piloto real e correção da rejeição — 06/10, 18:33

Deploy/migration/secrets/frontend executados sob autorização nesta thread. Captura real no backend: Xn8ZUQn_HGk, pt, 5.682 caracteres. Gerador recusado antes de tokens: gateway request 01a11321-26fd-7630-a213-85bb77c91e43, invalid_model / openai/gpt-6-sol, HTTP 400 em 4 ms. Rascunho vazio 4aae208f-d65e-4a90-8d3f-96c31adaf582 preservado; 107 publicados intactos; capa ainda não chamada. Diagnóstico exclusivo de logs/catálogo Cloud: 2 créditos de construção; deploy anterior: 1,1. Catálogo real difere da documentação pública e contém openai/gpt-5.6-sol. Decisão: manter família Sol/strict schema/low, corrigindo somente ID para o modelo disponível, sem fallback automático.

Revisão prévia estrutural da correção: Produto — retomar somente piloto vazio; CTO — compare-and-set exclusivo na reserva; IA — mesma fonte oficial persistida/mesmos prompts, modelo Sol disponível; Segurança — só rota autenticada, validação do canal/fonte, não registrar resposta bruta do provedor; UX — mesma entrada, erro específico; Growth — rascunho sem indexação/publicação; CX — nenhuma recuperação de resultado incerto/timeout/capa ou artigo preenchido; PMO — testes negativos e pnpm validate antes de deploy. Decisão consolidada: permitir retomada por nova ação humana apenas para rascunho vazio com todos os runs recusados HTTP 400, reserva needs_review e captura válida; não repetir resultados pagos concluídos ou incertos. Agendamento segue desativado.

Correção local validada: 38 testes de servidor passaram, incluindo recuperação autorizada de rejeição e bloqueios para timeout, runs concluídos, artigo preenchido/publicado, reserva concorrente, fonte alterada, canal/vídeo/vínculo divergente. pnpm validate passou (typecheck, 59 regressões e build SSR). Revisão posterior pelas mesmas oito perspectivas: Pass no escopo local, mantendo validação Cloud de texto/capa pendente e No-Go para ativação horária/publicação automática. Rollback: reverter correção e desativar YOUTUBE_EDITORIAL_ENABLED; não apagar fonte/rascunho.

## Revisão do resultado real — 18:39

Pipeline chegou a done, artigo draft revisão 3 com 13 blocos e capa privada aplicada pelo servidor (fd4fac54-61ab-430c-8f0a-5c2397af5c19). Encontrado defeito pré-existente no saneamento de preços: ponto de milhar interrompia remoção da frase, deixando `472 parcelados em dez vezes**`. Outro trecho usa `A transcrição associa`, não coberto pelo detector atual. Correção local determinística sem nova chamada paga; rascunho será ajustado pelo editor com histórico/revisão. Revisão prévia oito perspectivas: Produto/UX — não entregar trecho truncado; CTO/IA — corrigir somente tokenizer e detector, preservar fonte; Segurança — sem dados/secrets novos; Growth — preços vêm das entidades e manter draft; CX — sem repetição de artigo/capa; QA — regressões para milhares/decimais e narração de fonte. GO para reparo no piloto; operação contínua/publicação seguem No-Go. Capa funciona tecnicamente, mas fidelidade visual da bicicleta exige conferência editorial antes de publicação.

Revisão posterior do reparo pelas oito perspectivas: Pass no escopo determinístico (84 testes dirigidos + pnpm validate); fonte/capa preservadas; edição autenticada salva como revisão 4 com histórico. Sem nova geração paga. Cloud fez 3 correções mínimas de tipagem Deno no deploy anterior, commit dc048197, deno check + pnpm validate aprovados; custo dessa implantação/validação 1,7 créditos. Diferença reportada e será incorporada sem descartar alterações.

## Evidência final do piloto integrado

- Entrada efetiva: painel de produção /admin/conteudos/novo, login Admin existente, URL curta Xn8ZUQn_HGk + checkbox da planilha. Sem texto/título/bikes fornecidos pelo cliente.
- Fonte: API oficial do canal UC9LuObKw8ZLoQBk6qHydEeg, pt/asr, 305 cues, 5.682 caracteres, MD5 563a99a378e10ae6652e31eb2cf08f03 idêntico à captura original local. Original VTT + cues + transcript persistidos antes da IA. Captura foi feita no servidor do próprio projeto; OAuth local não participa da execução.
- Artigo único: 4aae208f-d65e-4a90-8d3f-96c31adaf582, draft, título “V9 Max vale a pena? O que conferir antes de comprar”, 13 blocos, prompt v10, openai/gpt-5.6-sol. Audit article_generated 21:37:56 UTC, sem rewrite. Ajuste determinístico humano pela UI em 21:39:42 UTC, revisão 4.
- Capa: google/gemini-3.1-flash-image, referência maxresdefault do próprio vídeo e foto real da bike, gerada 21:38:11 UTC e aplicada 21:38:13 UTC pela MESMA Edge Function, JPEG 196.856 bytes, título composto pelo compositor server, chave fd4fac54-61ab-430c-8f0a-5c2397af5c19. Nenhum segundo clique ou composição browser. Confirmada visualmente no painel. Não houve repetição paga de texto/imagem.
- Fonte final done; contagem final 107 publicados + 1 draft. Nenhum publicado alterado. Vídeo reutilizado por ID canônico, independente de formato do link; não processados os demais pendentes.
- Evidência de tela: ../vitale-youtube-piloto-2026-10-06.png. Artigo /admin/conteudos/4aae208f-d65e-4a90-8d3f-96c31adaf582 mantido aberto.
- pnpm validate final após integrar casts Deno passou; logs /tmp/vitale-final-integrated-validate-oct06.log. Deno check Cloud aprovado anteriormente; novo deploy determinístico pendente de confirmação do ambiente.

Revisão Cloud posterior: Produto Pass para piloto único em draft; CTO Pass (captura/write/composição/apply no projeto, sem dependência local); IA Pass para origem original e grounding básico, Fail para liberação automática sem aprovação do tom e fidelidade visual do modelo na imagem; Segurança Pass (secrets Cloud, original privada, autenticação, reserva); UX Pass (link+uma escolha); Growth Pass no draft/no publicação, N/A para SEO de novo conteúdo público; CX Pass para piloto, Fail para operação contínua até ligar retentativas pré-custo/alertas e cron; PMO Pass para execução/teste/evidência, No-Go para release contínuo. Não confundir sucesso técnico do piloto com aprovação da publicação automática. Autorizações atuais cumpridas sem cron/produção de conteúdo público.

Deploy final confirmado: HEAD 6f9f4dda, deno check exit 0, editorial-admin implantada com sucesso; POST anônimo `{}` → 403. Custo da última operação Cloud: 0,7 crédito de construção; total conhecido desta etapa de operações exclusivas Lovable: 5,5 (1,1+2+1,7+0,7), separado do uso de IA do artigo/capa, cujo débito exato não foi exposto pelos registros consultados. Frontend publicado pelo conector na mesma autorização; original/capa/rascunho seguem preservados.
