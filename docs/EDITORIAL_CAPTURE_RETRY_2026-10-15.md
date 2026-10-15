# Retomada da captura editorial — 15/10/2026
Classificação estrutural: integração YouTube/Supabase/IA. Caso 70IK3e8TtUc: needs_review, article_id=null, capture=null. Tentativa manual com bikes falha no INSERT de reserva já existente. Motivo original não foi registrado além do email genérico; não atribuir falha a bikes ou ao provedor sem evidência.

## Revisão prévia
| Perspectiva | Impacto, risco, dependência, recomendação |
|---|---|
| Produto | Recuperar pelo fluxo normal após falha pré-captura; prosseguir. |
| CTO | CAS needs_review sem capture/artigo, versão state_changed_at; preservar exclusão concorrente e reservas incertas; prosseguir condicionado. |
| IA | Não repetir resultados pagos/estágios concluídos; somente captura sem saída; manual bikes mantidas; prosseguir. |
| Segurança | Auth existente, catálogo validado antes de efeito, filtros null e timestamp; prosseguir. |
| UX | Pendências com link direto, explicação e próxima ação; prosseguir. |
| CX | Alertas úteis por causa conhecida; registrar código seguro sem respostas/secrets; prosseguir. |
| Growth | Nenhuma alteração pública; artigos e SEO preservados; prosseguir. |
| PMO | Testar recuperação, corrida, reserva ativa, saída existente, erro DB, seleção; validate; rollback0960a0a; prosseguir. |

Decisão: retomar reserva pré-captura apenas em needs_review com capture e artigo nulos, guardada por timestamp, após consulta comprovar ausência de artigo; captura bem-sucedida segue fluxo existente. Se reserva ativa ou saída existente, manter bloqueio e orientar abrir artigo/aguardar. Dashboard lista links de recuperação. Mapear falhas conhecidas de captura em português e auditar código técnico seguro. Sem migrations, requeue automático, deletion ou geração real neste passo. Trade-off: falhas depois de saída paga continuam nas rotas próprias de retomada para não duplicar custos. Critérios: nova tentativa manual consegue recapturar; só um concorrente vence; futuras falhas preservam reserva e motivo. Rollback reverter arquivos desta mudança.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Formulário recaptura falha sem saída e mantém bikes enviadas. |
| CTO | Pass | CAS usa estado+state_changed_at+nulls; somente conflito23505 tenta retomada; erro DB não é tratado como reserva concorrente. |
| IA | Pass | Reservas com captura/artigo/estado ativo bloqueiam replay; testes sintéticos não chamam serviços pagos. |
| Segurança | Pass | Sem relaxar autenticação, QA ou seleção de catálogo; auditoria guarda código limitado, sem resposta do provedor. |
| UX | Pass | Teste SSR verifica links para novo/artigo salvo e instrução específica de captura. |
| CX | Pass | Erros conhecidos captions/HTTP/OAuth com ação; erro auditável; sem remover alertas legítimos. |
| Growth | Pass | Sem alterações de conteúdo público/SEO. |
| PMO | Pass | 90 testes direcionados; pnpm validate exit0 (61 regressões/typecheck/build); diff check. |

Teste preexistente da base0960a0a exigia invalidar aprovação por corpus, mas implementação publicada deliberadamente exclui corpus da chave. Baseline reproduziu 1 falha/74 pass antes desta mudança. Ajustado somente o teste à política já existente (uma revisão, corpus excluído, checks locais ainda bloqueiam publicação); código de publicação não alterado.

Estado: local pronto, sem push/deploy, geração real ou escrita produtiva. Não há evidência do código técnico original porque a versão anterior não o registrou. A correção libera a retomada deste estado conhecido sem apagar reservas. Publicação exige frontend+editorial-admin, sem migration; rollback revert da mudança em relação0960a0a. Custo de release: implantação Lovable pequena; se autorizada uma geração real do vídeo, consome os créditos normais de texto/capa e continua sujeita à disponibilidade da legenda e ao QA.

## Release e teste real autorizado
Usuário autorizou publicar e tentar gerar vídeo70IK3e8TtUc com v29_pro,v20_ultra,v9_max_s. Main0b5db11 sincronizada; editorial-admin implantado, hash6e040087c49b595280cdae1b5528385b330f20766103e06685a1c12e33ffa6e8, deno check aprovado. Frontend publicado pelo painel Lovable.
Teste pelo formulário real: seleção preservada, retomada conseguiu recapturar (não retornou bloqueio de duplicidade); YouTube retornou portuguese_captions_pending. Audit editorial_generation_failed confirmou código21:20UTC, articleId=null; nenhuma IA de artigo/capa iniciada. Encontrado catch final do modo planilha mascarando stageError; corrigido para retornar motivo específico e referência do artigo quando houver. Alertas de tentativas distintas agora têm eventId distinto, evitando conflito de idempotência quando o motivo muda. Teste offline específico cobre mensagem real,90 testes + validate passaram novamente. Nova implantação necessária para esse ajuste final.
