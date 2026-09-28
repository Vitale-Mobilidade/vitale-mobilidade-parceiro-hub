# Criar artigo — formulário direto, 28/09/2026

## Contexto e classificação
Estrutural: altera entrada da IA editorial e relações de Bikes, sem migration. Pedido: link, título manual, bikes opcionais com busca/multisseleção, transcrição manual e consentimento via checkbox para gerar capa. Base operacional `4f00b7b`; branch `codex/article-create-form`. Implementação/testes locais, sem publicar, gastar créditos ou tocar dados reais.

## Revisão pré-implementação
| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Formulário único por URL; bikes opcionais | Escolha editorial ser sobrescrita pela detecção | Seleção explícita prevalece; vazio permitido | Prosseguir |
| CTO | Payload de geração carrega IDs de bikes | IDs inválidos ou contrato anterior quebrado | Validar IDs no servidor; parâmetro opcional preserva reprocessamento antigo | Prosseguir com validação antes de efeitos |
| IA | Fontes manuais, capa opt-in | Fonte salva substituir a transcrição; imagem gerada sem pedido | Exigir transcrição enviada; capa apenas após geração bem-sucedida e checkbox marcada | Prosseguir com testes mockados |
| Segurança | Entrada externa autenticada | ID inventado ou alteração de artigo publicado | Catálogo real e roles existentes; published retornado antes de saveVideo | Prosseguir sem alterar RLS/secrets |
| UX/UI | Cinco campos em ordem, lista pesquisável | Perder seleção na busca; campos sobrescritos ao trocar URL | Checkboxes nativas; seleção persistente; título/transcrição independentes | Prosseguir |
| CX | Aviso de artigo existente e acesso ao editor | Falha na capa causar nova geração de texto | Guardar ID e abrir rascunho salvo após falha; não repetir o artigo | Prosseguir com recuperação explícita |
| Growth | Relações curadas alimentam layout existente | Links/entidades sem correspondência real | Validar IDs e reutilizar layout e URLs existentes | Prosseguir; SEO público inalterado |
| PMO/QA | Delta local frontend/Edge Function | Testar IA/produção com custo; liberar sem gate | Testes offline de fluxo e contrato, lint, pnpm validate, patch | Prosseguir localmente |

## Conflitos e trade-offs
- Seleção manual tem precedência sobre detecção automática neste formulário; sem seleção, nenhuma Bike é associada por este pedido. Reprocessamento antigo mantém detecção atual.
- A primeira bike selecionada é principal; até seis adicionais, conforme limite atual do gerador/layout. Explicitar na interface.
- Checkbox autoriza gerar e aplicar capa ao rascunho criado; não publica. Capa desmarcada mantém fallback existente. Nenhum artigo já publicado recebe capa por este formulário.
- Reutilização de rascunhos do mesmo vídeo é preservada; aviso informa existência e oferece editor. Artigo publicado é retornado sem modificar título/transcrição/capa.

## Decisão consolidada antes da implementação
- Escopo: remover biblioteca/autofill apenas em Criar artigo; aviso por video_id; catálogo administrativo de bikes visível e pesquisável; checkbox desmarcada; gerar/aplicar capa após texto, com recuperação de falha.
- Dependências: APIs bikes/workspace e cover-generate/cover-apply existentes; Edge Function deve receber os IDs opcionais e validar antes da escrita/IA.
- Aceite: trocar URL não altera título/transcrição/bikes; conhecido sem artigo não exibe falso aviso; aviso de artigo inclui editor; busca vazia lista bikes e mantém múltiplas seleções; servidor rejeita IDs desconhecidos/excesso; zero seleção permitida; sem checkbox nenhuma chamada de imagem; falha da imagem preserva acesso ao texto salvo; publicado reutilizado não gera capa; pnpm validate aprovado.
- Fora de escopo: deploy, Lovable, produção, migration, nova função, redesign público, troca de modelo/prompt.
- Rollback: reverter delta frontend/Edge Function para base acima e republicar somente com autorização. Sem alteração de schema; sem dado produtivo alterado nesta task.

## Revisão pós-implementação
| Perspectiva | Status | Evidência / justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Cinco campos na ordem pedida; biblioteca retirada; relações opcionais e checkbox desmarcada |
| CTO e Arquitetura | Pass | Payload bikeIds validado no servidor; parâmetro opcional mantém contratos antigos; build/typecheck aprovados |
| IA e Agent Engineering | Pass | Transcrição enviada obrigatória antes de efeitos; seleção manual prevalece na geração; testes mockados cobrem capa opt-in, composição e revisão; modelo/prompts existentes intactos |
| Segurança | Pass | Catálogo valida IDs antes de escrita/IA; testes executam o servidor real em VM offline; publicado é reutilizado antes de salvar vídeo; auth/RLS/secrets intactos |
| UX/UI | Pass | Render do componente real confirma ordem, aviso, campos manuais vazios e lista inicial; inputs/checkboxes nativos, labels, status/alert, lista rolável e largura limitada; seleção é estado independente da busca |
| CX e Operação | Pass | Aviso com link ao editor; ID salvo permite recuperação de falha; botão bloqueia segunda geração após artigo salvo; serviços reais não acionados |
| Growth e CRO | Pass | Relações usam IDs do catálogo e layout existente; nenhuma mudança em rotas públicas, metadata ou links afiliados |
| PMO e QA | Pass | 34 testes dirigidos em sete arquivos; pnpm validate (49 testes, typecheck, build); lint dirigido sem erros e git diff --check aprovado |

## Fechamento
- Testes dirigidos: admin-article-create (6), admin-article-form (3), admin-article-server (4), admin-video-picker (4), editorial-automation (10), editorial-cover (4), cover-compose (3). Todos offline, sem rede, IA, armazenamento, contato ou dado produtivo.
- Gate: pnpm validate aprovado no repositório operacional. Lint com printWidth 120, formato dos arquivos operacionais: zero erros; quatro avisos de hooks já existentes no componente de Vídeos, fora do formulário alterado. Build mantém avisos prévios de dependências.
- Documentação: este registro e referência no ROADMAP.
- Limite da evidência: render e contratos locais; não houve smoke autenticado no domínio nem nova geração real de capa. O gerador de imagem existente não mudou; qualidade de uma nova capa continua sujeita à revisão do operador no rascunho antes da publicação.
- Estado: implementado e validado localmente; pronto para revisão/aplicação. Nenhum merge, push, deploy, migration ou Publish.
- Aplicação deve incluir frontend, editorial-admin e o novo helper compartilhado; apenas publicar o frontend deixaria o backend antigo ignorar a seleção de Bikes. Não é necessária migration.
- Rollback: reverter este delta para `4f00b7b` no frontend e Edge Function; capas já aplicadas futuramente seguem o histórico/revisão existente. Sem rollback de banco nesta task.
- Decisão: GO para handoff local. Publicação/aplicação externa requer autorização específica conforme EXECUTION_GUARDRAILS.md.

## Aplicação no Lovable, 28/09/2026
- Autorização do responsável nesta conversa para aplicar e implantar; Publish do frontend ainda não autorizado (aguarda revisão independente do diff).
- Base atual confirmada: `fa1d2e8c81381b9102e9ba3bec9c9317e0a80c73`, árvore limpa; dry-run sem conflitos; patch aplicado sem alterações de linha (`patch -p1`, pois `git apply` é bloqueado no ambiente).
- Evidência: 7 arquivos dirigidos, 34 testes aprovados; `pnpm validate` aprovado (59 testes, typecheck, build).
- Backend: somente `editorial-admin` implantada, com o helper `_shared/editorial-create-input.ts`; chamada sem sessão retorna 403. Sem migration, RLS, segredos, geração real ou escrita de artigos.
