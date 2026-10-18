# Newsletter — três edições semanais e foco em bikes

## Revisão prévia
Classificação estrutural: integração de email e geração IA. Objetivo: segunda/quarta/sexta 06h30 America/Sao_Paulo; refazer #4 de 19/10 sem destaque EVS/EV1.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Foco em bikes; motos desviam posicionamento. Excluir EVS/EV1 da pauta automatizada; prosseguir. |
| CTO | Agenda e D-1 devem mudar juntos; preservar worker */5 e ledger/idempotência. Prosseguir condicionado a testes de limites. |
| IA | Prompt sozinho não impede seleção errada. Filtrar fontes e validar destaque antes de envio; prosseguir. |
| Segurança | Preservar autenticação, consentimento e segredos; nenhuma nova permissão. Prosseguir. |
| UX | Atualizar frequência no admin/popup; divergência confunde inscritos. Prosseguir com busca das cópias. |
| CX | Draft #4 já salvo não será substituído automaticamente. Regeneração operacional precisa backup e validação do draft correto; prosseguir localmente. |
| Growth | Mais uma edição aumenta consumo e exposição; manter opt-out e foco bike. Prosseguir conforme frequência solicitada. |
| PMO | Testes direcionados e validate obrigatórios; publicação exige aprovação específica. Prosseguir localmente. |

Decisão: implementar agenda, D-1 domingo/terça/quinta, janela de recuperação 06h30–08h30 preservada, filtro EVS/EV1 em fontes/destaques/Radar e instrução editorial bikes. Validar drafts antigos antes de formar campanha. Não alterar catálogo, contatos nem campanhas. Critérios: limites BRT, ausência de envio terça/quinta/fim de semana, exclusão determinística mesmo em fallback. Trade-off: excluir fontes sobre EVS/EV1 evita que virem gancho editorial, reduzindo a pauta disponível; falhar fechado se faltar fonte. Sem conflito material identificado. Rollback: reverter diff; preservar ledger e backup do rascunho. Publicação e regeneração #4 são etapa operacional separada após preparação local e autorização conforme guardrails.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Três datas e prioridade bikes; EVS/EV1 fora da pauta automatizada. |
| CTO | Pass | Agenda e D-1 sincronizados, ledger e cron preservados; testes de janela BRT. |
| IA | Pass | Prompt e revisão editorial orientados a bikes; filtro determinístico na seleção, fallback e validação de draft salvo. |
| Segurança | Pass | Nenhuma mudança de acesso, consentimento ou secrets; testes com mocks. |
| UX | Pass | Admin e popup informam segunda/quarta/sexta; estrutura visual preservada. |
| CX | Pass | Draft inválido bloqueado antes de campanha; #4 requer recuperação operacional explícita. |
| Growth | Pass | Sem alteração de links, audiência ou descadastro; maior frequência solicitada. |
| PMO | Pass | 39 testes operacionais + 36 editoriais (2 fallback repetidos), pnpm validate (61 regressões, types e build), lint direcionado e diff check. |

Estado: implementação local validada; publicação e #4 ainda pendentes. Sem chamadas de modelos, emails ou escrita produtiva. Avisos preexistentes de inputValidator no build. Testes de dispatch migrados da quinta para sexta para manter cenários dentro da nova janela. Arquivos de dependência gerados pelo runtime não integram a mudança.

## Procedimento de edição #4 — 19/10/2026

Antes: confirmar draft edition_day=2026-10-19 e edição #4, preservar conteúdo/revisão/fingerprint e verificar ausência de campanha já formada. Não descartar campanha em envio ou concluída. Refazer usando o writer/revisor existentes, preservando data e número; não apenas renomear a moto como bike.

Brief para regeneração: “Refaça a edição #4 de 19/10/2026 com um foco editorial sustentado por fontes sobre bikes ou temas de bike. Voltz EVS e EV1 são motos e devem ficar fora do destaque, assunto, preheader, título, abertura e bike destacada. Use outras fontes reais elegíveis, respeitando memória, diversidade e revisão factual. Preserve identidade visual, data, número, audiência e horário. Salve somente rascunho revisável, sem disparar emails.”

Depois: confirmar persistência, preview e validação do rascunho, número #4/data correta e ausência das motos. Se já houver campanha congelada, interromper correção operacional e relatar estado antes de modificar. Rollback do rascunho: restaurar backup/revisão anterior sem reenviar email. O novo gate continuará impedindo destaque em motos.
