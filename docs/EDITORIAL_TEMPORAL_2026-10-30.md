# Campanhas e ofertas pontuais — 30/10/2026

## Ampliação autorizada — capa sem thumbnail e publicação

O responsável autorizou nesta conversa: “Sim, pode implementar e publicar” e permitiu gerar sem thumbnail, mantendo o vídeo incorporado para quando for liberado. Essa decisão supera a condição anterior de aguardar a publicação do vídeo. A fonte completa continua obrigatória; disponibilidade da miniatura passa a ser opcional apenas para a imagem de referência, sem afrouxar integridade da fonte, foto da Bike, capa final ou QA.

Revisão prévia das oito perspectivas para o delta estrutural:

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Artigo pode anteceder vídeo agendado | Confundir disponibilidade do player com a do artigo | Autorização explícita acima | Prosseguir |
| CTO | Thumbnail opcional no mesmo gerador | Retry de imagem paga ou mudança de estado concorrente | Mesmas leases e checkpoints; uma chamada de imagem | Prosseguir condicionado às guardas existentes |
| IA | Fotos oficiais e assunto guiam capa na ausência da miniatura | Inventar modelo ou usar placeholder como referência | Fotos obrigatórias para bikes associadas; contexto rotulado como dado | Prosseguir |
| Segurança | Falha no download vira ausência de referência | SSRF ou entrada no prompt | Mesma allowlist oficial; dados não confiáveis delimitados | Prosseguir |
| UX | Capa editorial válida antes do vídeo | Player ainda indisponível no YouTube | iframe já usa ID estável; sem promessa de reprodução antecipada | Prosseguir |
| CX | Recuperar somente o rascunho apontado | Repetir etapas concluídas/cobranças incertas | Backup e compare-and-set de estado/revisão | Prosseguir com recuperação individual |
| Growth | Preservar Black Friday sem thumbnail pública | VideoObject com data futura; oferta vencida | Schema atual já omite VideoObject futuro; preço vigente no Radar | Prosseguir |
| PMO | Publicar função e validar artigo real autorizado | Código remoto divergente e rollback incompleto | Testes locais, validate, backup, revisão de diff e deploy comprovado | Prosseguir por etapas |

Decisão: quando thumbnail estiver ausente, retornar erro, não for JPEG válido pelo contrato de tamanho ou falhar na rede, omiti-la da chamada. Manter fotos reais obrigatórias de todas as Bikes associadas; sem Bike associada, permitir ilustração editorial do tema sem inventar produto específico. Registrar modo de referência utilizado. Preservar o iframe por ID e a omissão de VideoObject com data futura, já implementados. Recuperar o artigo informado pelo writer existente com nova instrução; nenhuma alteração em datas/visibilidade no YouTube ou Sheets. Sem retry automático adicional, schema, RLS, cron ou migração.

Rollback: guardar fonte/artigo atuais fora do Git; versão anterior da função em `cd81ab9`. Reverter o commit desta entrega e reimplantar apenas `editorial-admin`. Se houver necessidade de desfazer o artigo recuperado, restaurar somente seus dados sob guarda de revisão, sem tocar no corpus ou capturas de outros vídeos. Custo esperado: baixo para implantação; uma reescrita e uma capa deste artigo, mais QA existente e eventuais correções limitadas. Uso de Lovable restrito à implantação na integração Cloud indisponível pelas ferramentas locais; implementação e testes seguem locais.

### Gate local da ampliação

28 testes direcionados passaram (função real em VM, política temática e contratos de capa), mais 6 testes de schema do artigo, incluindo omissão de VideoObject com data futura. `pnpm validate` passou novamente (typecheck, 64 regressões e build SSR); lint dos dois contratos puros sem regra de formatação e `git diff --check` passaram. A thumbnail falha com 404, placeholder pequeno, MIME incorreto, tamanho excessivo e erro de rede: todos os casos usam só as fotos oficiais numa chamada de imagem. Foto de Bike ausente continua bloqueando; sem Bike associada, o assunto gera ilustração sem produto inventado.

Backup privado de artigo/fonte/vídeo em `/tmp/vitale-temporal-release-20261030-backup.json`, modo 0600. Ensaio PostgreSQL local em transação isolada: payload alterado e restaurado integralmente, igualdade com backup verificada; não é restauração de todo o schema produtivo. Nenhuma migration nesta entrega.

Revisão posterior das mesmas oito perspectivas: Produto **Pass** (autorização explícita para artigo antes do vídeo); CTO **Pass** (leases/checkpoints e chamada única preservados); IA **Pass** (fotos reais/assunto, sem placeholder); Segurança **Pass** (allowlist e autenticação intactas); UX **Pass** (iframe por ID preservado); CX **Pass** (backup e retomada individual planejada); Growth **Pass** (preços atuais nas entidades e schema futuro já protegido); PMO/QA **Pass** (testes, validate, rollback e escopo restrito). **GO para implantação autorizada de `editorial-admin` e recuperação individual**. A confirmação do deploy e o resultado real do artigo serão registrados abaixo após execução.

Estado: diagnóstico e ajuste local; não publicado. Base: `origin/main` em `cd81ab9`, repositório operacional sincronizado com o mesmo projeto Lovable. O checkout raiz continua referência.

## Evidência e diagnóstico

Consulta somente leitura ao banco integrado do Lovable: artigo `31bca5a0-3456-4d27-ad8c-a05235f92a82`, vídeo `U5MzgegMIIo`. Captura oficial em 30/10 às 10h07 (São Paulo), transcrição completa, geração concluída com prompt 10. Artigo em `draft`, `indexable=false`, revisão 2, sem brief. Às 10h08: `automatic_cover_failed`, código `automatic_cover_generation_failed`; fonte em `needs_review`. Nenhum registro de publicação ou QA de publicação nesse caso.

O vídeo tem título “V29 Pro na Black Friday: A Melhor Compra Hoje?” e `published_on=2026-11-30` (data de catálogo, não confirmação de disponibilidade pública). O início e o fechamento da transcrição centram a decisão na promoção e dizem que sua duração é desconhecida. A abertura registra 7.687 no Pix e 8.299 no cartão; há uma ocorrência intermediária divergente de 7.887. Esses números são evidência privada histórica, não oferta atual confirmada.

O prompt ativo pede remover publicidade. A direção final reserva preços atuais aos módulos e o sanitizador remove frases com `R$`. Nenhuma dessas regras deveria apagar o assunto comercial: título, abertura e seções atuais perderam Black Friday e se tornaram avaliação geral de bateria/carga.

Na inspeção atual, as quatro variantes oficiais de thumbnail retornam HTTP 404, JPEG de 1.097 bytes (placeholder). A foto de catálogo da V29 Pro está `ready`. O código encerra a geração de capa quando o download não é HTTP 2xx/JPEG ou tem menos de 2.000 bytes, antes da chamada de imagem. Isso reproduz uma causa compatível com a evidência, mas o log histórico genérico não prova a resposta HTTP exata às 10h08. Não houve chamada paga nesta auditoria.

## Revisão pré-implementação

Classificação: **estrutural**, por envolver IA, SEO e publicação editorial. As oito perspectivas foram examinadas separadamente; não houve delegação a outros agentes.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Reconhecer conteúdo perene, sazonal, oferta pontual e misto | Trocar todo o canal por publicidade sazonal | Intenção sustentada pela transcrição integral | Prosseguir com regra permanente e contextual |
| CTO e Arquitetura | Direção final compartilhada na geração e revisão existente | Novo writer ou schema desnecessário | Contrato de preço atual e cache de QA | Manter writer, sanitização e módulos; mudar versão do QA |
| IA e Agent Engineering | Preservar campanha do H1 à conclusão e na reescrita | Inventar prazo/desconto ou obedecer instrução na fonte | Evidência literal e fonte original | Separar instruções confiáveis de dados; não inferir validade |
| Segurança | Leituras administrativas e geração offline | Expor secrets ou executar escrita produtiva | Mocks sem credenciais e SELECT restrito | Prosseguir sem alteração de auth/RLS/dados |
| UX/UI | Texto responde à decisão de compra pontual | Artigo parecer campanha vigente depois de encerrada | Contexto temporal e preço atual no Radar | Uma condição temporal concreta; sem avisos repetitivos |
| CX e Operação | Ajuste recorrente sem editar prompt a cada data | Retomar vídeo agendado ou pagar capa em tentativas cegas | Disponibilidade pública e thumbnail válidas | Não retomar este item nem ampliar retries nesta tarefa |
| Growth e CRO | Tema comercial e SEO alinhados ao vídeo | Preço histórico como atual; “menor preço” sem histórico | Fonte completa, módulo comercial existente | Preservar tema; oferta numérica atual só nas entidades |
| PMO e QA | Patch pequeno testável sem consumo de IA | Declarar sucesso editorial com mocks apenas | Testes direcionados e `pnpm validate` | Entrega local com limite explícito; release separado |

### Conflitos e decisão consolidada

- Remover publicidade evita chamadas vazias; remover a análise de uma promoção destrói a intenção. Preservar campanha, argumento de valor e condições reais; remover chamadas de inscrição e slogans.
- Efemeridade pede preço específico, mas o contrato vigente mantém preço/link nas entidades. Preservar o recorte de oferta na prosa e usar o Radar para o valor vigente. Uma exceção para preços históricos datados exigiria contrato e validação próprios; não será introduzida silenciosamente.
- A voz independente não pode apagar a incerteza temporal explícita na fonte. Uma frase contextual junto da oferta é condição factual, não disclaimer genérico.
- Escopo: instrução permanente para campanhas/ofertas e QA semântico no fluxo existente; contexto original de título/data no revisor; exemplo revisável deste artigo. Sem nova chamada, campo obrigatório, arquétipo, migration, UI ou schema.
- Critérios: geração e refinamento recebem a mesma prioridade temporal; revisão recebe tema original e reprova perda material da intenção; QA antigo não é reutilizado; preços/links continuam protegidos; sem escrita real nos testes.
- Fora de escopo: publicar artigo/vídeo, corrigir data da planilha, retomar fila, gerar capa, afrouxar falha fechada, modificar artigos já publicados ou resolver agendamento/retomada automática. O bloqueio de capa continua ativo.
- Rollback: reverter somente o diff desta branch e reimplantar a versão anterior de `editorial-admin`. Nenhum dado migrado. Rascunho original permanece intacto.

## Exemplo de direção para o artigo atual

H1: **V29 Pro na Black Friday: quando a oferta vale a pena?**

Abertura proposta: “A oferta de Black Friday da V29 Pro chama atenção para quem precisa rodar muito: as duas baterias removíveis e a traseira adaptável para carga são os principais motivos para considerar o modelo. A promoção combina condições diferentes no Pix e no cartão, e sua duração não está definida. O que decide a compra é combinar a condição disponível no momento com uma rotina que aproveite essa autonomia.”

Sequência sugerida, sem molde obrigatório: condições da campanha e como elas entram na decisão → módulo Radar com valor vigente ou estado honesto de indisponibilidade → por que duas baterias fazem diferença nesse preço → carga e limites do garupa → conclusão de compra vinculada à oferta e ao uso. FAQ pode esclarecer Pix/cartão e validade sem inventar número de parcelas, prazo ou disponibilidade.

Não escrever “menor preço histórico”, “oferta garantida até novembro”, “últimas unidades” ou preço atual por inferência. Não transformar a data de catálogo em data de gravação. Se não há oferta ativa, não criar CTA ou valor substituto. Este exemplo é editorial e local, não registro salvo no Admin.

## Pendência operacional distinta

Transcrição acessível com OAuth não prova que vídeo/thumbnail estão públicos. Antes de uma recuperação real, verificar a disponibilidade pública e a data pretendida de 30/11 no YouTube/planilha. Uma política de retomada automática para vídeos agendados deve aguardar fonte pública válida, preservar etapas pagas e evitar reprocessamento cego. Esta tarefa diagnostica o caso e não muda a máquina de estados.

## Implementação e validação

- `EDITORIAL_TEMPORAL_GUIDANCE` entra ao final da prioridade temática já usada por geração, reescrita e ajuste pontual de voz. O prompt 10 armazenado não foi modificado no banco.
- O QA existente recebe a mesma regra e o título/data originais. Perda material do tema passa a ser motivo explícito de reprovação, usando as até duas correções já existentes. A versão `automatic-publication-v8-temporal-intent` e a chave que inclui sistema/payload impedem reutilizar aprovações anteriores sob política diferente.
- Nenhum sanitizador, preço, oferta, link, writer, rota, cron, schema ou RLS foi alterado. A revisão continua aceitando sobreposição entre artigos da mesma bike conforme a decisão vigente; esta tarefa não restaura gates antigos de diversidade.
- Testes direcionados: **21 passaram**, selecionados por nome em três arquivos. Cobrem fonte/data na geração, refinamento com fonte original, rejeição temática retornando à correção limitada, cache/revisão exata e thumbnail 404 bloqueando antes da IA de imagem. São mocks da função real: comprovam encadeamento e guardas, não que o modelo já produziu o novo artigo corretamente.
- O harness offline da função precisava dos imports de heatmap já presentes em `main`; os adapters reais puros foram conectados ao mock, sem mudança produtiva de heatmap.
- `pnpm validate`: **Pass** (typecheck, regressão selecionada pelo projeto e build SSR). Lint do contrato com a regra de formatação desativada: **Pass**. `git diff --check`: **Pass**. Não foi executada suíte extensa nem teste com credenciais reais.
- O build mantém os avisos existentes de `inputValidator` deprecado e detecção de tsconfig paths. Não há mudança de configuração para silenciá-los.
- Custo nesta tarefa: somente consultas de leitura e downloads pequenos; nenhuma chamada de geração de texto/imagem, email ou retry externo. O novo texto aumenta o input das chamadas editoriais futuras, sem adicionar chamadas ou ampliar tentativas. Custo monetário futuro não medido; estimativa qualitativa baixa, dependente do gateway e do volume processado.

## Revisão pós-implementação

| Perspectiva | Status no escopo local | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Recorte comercial preservado por regra permanente; perenes não recebem campanha obrigatória |
| CTO e Arquitetura | Pass | Mesmo writer, sem schema/rotas; contexto de catálogo explícito; cache de QA versionado |
| IA e Agent Engineering | Pass | Regra final em escrita/refinamento/revisão; fonte íntegra em mocks; sem garantia de resultado real |
| Segurança | Pass | Somente SELECT; testes offline sem credenciais; auth/RLS e dados privados preservados |
| UX/UI | Pass | Proposta de H1/abertura explica oportunidade; sem novo campo ou passo obrigatório; frontend inalterado |
| CX e Operação | Pass | Bloqueio de capa diagnosticado; nenhuma retomada cega ou antecipação de vídeo agendado |
| Growth e CRO | Pass | Tema nos metadados e corpo; preço/link continuam nas entidades; nenhum ganho SEO alegado |
| PMO e QA | Pass | 21 testes direcionados e gate validate aprovados; rollback e limitações documentados |

Fechamento: **GO para revisão do patch local; GO condicionado para aplicação externa**. O artigo produtivo continua em draft e a capa continua pendente. A eficácia editorial será observada na primeira geração autorizada, sem prometer resultado do modelo com base em mocks. Deploy/merge/publicação e eventual regeneração deste artigo dependem de autorização específica nesta conversa, conforme `AGENTS.md` e `EXECUTION_GUARDRAILS.md`. A recuperação deste vídeo depende também de confirmar disponibilidade e data pretendida; isso não bloqueia a revisão local da instrução permanente.
