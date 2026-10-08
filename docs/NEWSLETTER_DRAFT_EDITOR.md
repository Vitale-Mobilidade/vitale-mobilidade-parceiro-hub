# Editor de rascunhos da newsletter

Classificação estrutural: persistência Supabase e fluxo editorial IA. Preparação local; produção continua pausada.

## Revisão prévia — oito perspectivas
| Perspectiva | Impacto, risco, dependência e decisão |
| --- | --- |
| Produto | Edição deve existir no painel e admitir ajustes pequenos sem regenerar. Rascunho separado do histórico enviado. Prosseguir. |
| CTO | Tabela privada de drafts, contrato existente newsletterSchema/renderer; lease existente serializa gravação. Migração aditiva e deploy dependem de autorização. |
| IA | Preservar conteúdo gerado e origem; título positivo no prompt. Ajustes humanos registrados como edição humana, sem alegar revisão factual automática. |
| Segurança | Apenas admin validado no servidor; RLS sem acesso cliente; HTML nunca recebido do formulário; URLs/fotos/números preservados. |
| UX | Assunto/título/abertura e textos por seção, salvar/visualizar sem IA; rascunho de teste aparece imediatamente. |
| CX | Salvamento separado de envio/ativação; confirmar data e estado. Erro anterior não desaparece por edição de texto. |
| Growth | UTMs renderer preservado; nenhuma edição enviada é alterada; título positivo sem prometer resultado. |
| PMO | Regressões autenticação, concorrência, imutabilidade campos, render e persistência. Gate pnpm validate; migração/publish/import têm aprovação final. |

Decisão: GO local para editor e persistência. Não ativar, enviar ou aplicar migração neste corte. Rascunhos editados são revisão humana pendente; salvar não prepara campanha nem consome #N. UI tem acesso à prova real anterior como rascunho inicial, importado apenas na liberação. Rollback reverter aplicação e manter tabela privada/rascunhos recuperáveis.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Rascunhos independentes das campanhas; recuperação do teste com título positivo; nova prévia salva automaticamente. |
| CTO | Pass | Serviços existentes, migration aditiva, conteúdo JSON estruturado, lease existente e compare-and-swap revision. |
| IA | Pass | Prompt/redator e revisor positivos; salvar/visualizar não chama modelo nem afirma revisão IA de edições humanas. |
| Segurança | Pass | Gate admin existente antes das ações; RLS privada, renderer escapa texto, edição estrita não aceita URL/imagem/preço. |
| UX | Pass | Formulário rotulado com assunto/título/abertura/seções, prévia sandbox, feedback e recuperação inicial; teste de formulário. |
| CX | Pass | Sem envio/ativação por salvar; conflitos não sobrescrevem dados; fonte do texto anterior preservada. |
| Growth | Pass | UTMs e relações de origem não editáveis; sem alteração em campanhas enviadas. |
| PMO | Pass | 38 testes direcionados passaram; lint, diff-check e pnpm validate (59 regressões/types/build) passaram. |

Entrega local pronta. Produção não alterada: migration não aplicada, editor não publicado, teste ainda não importado na tabela. Automação segue pausada. Rascunhos não são consumidos pelo worker automático neste escopo: salvar/exportar é separado da publicação da edição. A aprovação/uso de rascunho no disparo deve ser explícito; nunca substituir uma campanha já criada/aceita. Não declarar rascunho editado como automaticamente revalidado.

## Caminho e aceite
Admin → Newsletter → Rascunhos e edição → Recuperar edição do teste (uma vez) → abrir rascunho → editar → Salvar ajustes → Visualizar. Prévia usa cópia estruturada e renderer existente; não recebe HTML livre. Separar parágrafos com linha em branco e tópicos com uma linha por tópico. Edições criadas pelo botão Gerar prévia entram na lista de rascunhos.

Liberação proposta: aplicar 20261008130000_newsletter_drafts.sql no banco integrado Lovable, publicar esta branch e recuperar teste pela UI. Impacto só tabela privada e UI admin; sem novos contatos/envios ou ativação. Custo externo baixo/quota publicação; sem geração IA durante liberação. Rollback reverter app mantendo tabela privada e dados, sem drop.
