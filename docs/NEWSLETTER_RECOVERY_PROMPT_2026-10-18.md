# Recuperação automática, edição por prompt e imagens da newsletter

## Revisão pré-implementação
Classificação estrutural: IA, Supabase, email. Objetivo: geração não deve paralisar entregas por rejeição editorial; prompt no painel; resolução adequada de thumbnails. Descoberta: SQL de campanha ainda usa (1,4)/70h, apesar de agenda TS publicada em três dias. Corrigir com migration e teste PostgreSQL real antes de release.

| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Continuar envio com seleção factual simplificada; edição por prompt com prévia. Não prometer infalibilidade de provedores. Prosseguir. |
| CTO | Agendador existente como supervisor; fallback antes do redator, estado persistido e lease/CAS. Corrigir SQL seg/qua/sex e piso46h. Prosseguir com ensaio SQL. |
| IA | Feedback persistido entre tentativas; no máximo duas execuções pagas por edição automática. Fallback só de resumo publicado, sem conteúdo rejeitado. Prompt não altera fatos/segurança; revisão independente. Prosseguir. |
| Segurança | Pedidos privados admin-only, RLS e service-role; prompt tratado como dado editorial, não instrução para ferramentas. Não enviar email nas provas. Prosseguir com testes. |
| UX | Campo claro, andamento, falha e proposta para aplicar; manter edição manual. Imagens 320px não devem ser ampliadas a568px quando há original maior. Prosseguir. |
| CX | Recuperação sem abrir painel; crash não zera contador. Proposta não sobrescreve ajuste/campanha; erro de geração não desliga automação. Prosseguir com limites observáveis. |
| Growth | Preservar audiência, opt-out, links diretos e data; frequência deve funcionar também no SQL. Prosseguir. |
| PMO | Testar crash, rejeição, quota, idempotência, fonte indisponível, CAS, prompt e SQL; validate antes handoff. Release de schema separado e autorizado. Prosseguir localmente. |

Decisão: salvar fallback válido assim que possível e tentar melhorar via IA com feedback limitado; worker retoma entre processos. Revalidar drafts antes da campanha; se inválido gerar seleção segura sem pausar globalmente. Pedido por prompt persistido e processado pelo mesmo worker, com proposta revisável e aplicação explícita. Não oferecer retries pagos infinitos; retentar recuperação de fontes sem IA até limite da janela. Nenhum envio duplicado para resolver ack incerto. Manter fonte/DB/provedor indisponíveis como risco externo visível. Fora de escopo: nova infraestrutura/agente autônomo com ferramentas amplas. Rollback: reverter app mantendo tabelas/colunas privadas e backup de funções SQL; pausar cron durante rollback incompatível. Implementação e ensaios locais primeiro; nova migration/publicação requer autorização específica.

## Implementação

- O próprio worker assinado */5 é o supervisor; não há um agente com acesso irrestrito. Na véspera ele persiste uma edição simples de fontes publicadas antes de chamar o redator. A edição simples não é um texto rejeitado pela IA nem uma edição enviada anteriormente.
- Duas execuções editoriais automáticas por data, até quatro chamadas de modelo cada; tentativa e cooldown são gravados antes. Feedback do revisor persiste e orienta outra composição na próxima tentativa. Queda do processo preserva a cópia simples e não reinicia o orçamento. Sem fontes válidas, recuperação determinística retenta a cada30min; na janela de envio o worker retenta sem IA. Falhas editoriais e indisponibilidade de fontes não desligam enabled.
- Um snapshot inválido no envio é preservado para auditoria; a campanha recebe uma nova edição simples validada. O ledger e a proteção para resposta incerta do provedor permanecem. Banco/serviço de email indisponíveis ainda podem impedir envio; não prometer infalibilidade ou reenviar ack incerto.
- Prompt vira pedido privado persistido, processado mesmo com entrega pausada; limites de tentativas e feedback iguais. Geração produz proposta revisada; somente Aplicar substitui o draft por CAS. Fechar página não perde pedido. Rascunho alterado/campanha formada/horário a partir de06h20 impedem substituição. Recusas/quota preservam versão anterior. Descartar libera outro pedido. Edição manual mantém seus campos e agora também respeita congelamento no backend.
- Catálogo continua com thumbnails leves. Newsletter testa maxres/sd/hq por host fixo, com timeout e dimensões JPEG mínimas, rejeita placeholder120px mesmoHTTP200; falha de imagem não impede preparação. #4 já teve as duas URLs corrigidas para1280x720 em produção com CAS/backup.
- Histórico de fontes paginado compartilhado por geração e prompts, inclusive além de500 campanhas.

## Revisão posterior local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Fallback válido preserva continuidade; proposta por prompt exige aplicação explícita. |
| CTO | Pass | Ensaios PostgreSQL cadeia real de migrations; ciclo seg/qua/sex/seg, limites06h30/08h30, piso46h, destinatários e idempotência. |
| IA | Pass | Testes de feedback persistido, teto entre processos, revisão independente, dados de prompt separados de instruções e fallback sem modelos. |
| Segurança | Pass | RLS/revokes e unicidade de pedidos ensaiados em PostgreSQL; admin/assinatura existentes, CAS, cutoff e freeze verificados; nenhum segredo/PII novo em artefatos. |
| UX | Pass | Campo, estados/proposta e edição manual renderizados; fixture local desktop1280/mobile390 sem overflow. Interações servidor cobertas por testes; novo fluxo ainda não ensaiado no painel produtivo. |
| CX | Pass | Crash, falha de fonte, cooldown, quota/orçamento e preservação do draft cobertos. Pedido independente da página e do estado enabled do envio. |
| Growth | Pass | Destinatários/consentimento/URLs e opt-out preservados; SQL de frequência testado com destinatário sintético. |
| PMO | Pass | Testes direcionados, continuidade, lint e validate; rollout/backup/rollback descritos. Pass local não equivale a release produtivo. |

Conflito explícito: continuidade absoluta versus indisponibilidade externa e rigor factual. Decisão: não inventar conteúdo nem repetir edição para mascarar falha; manter seleção simples verificada, recuperação limitada de IA e retentativas sem IA quando apropriado. Falha externa permanece observável. Outro trade-off: prompt revisável exige aplicação humana; envio regular continua com a versão válida salva, nunca aguarda indefinidamente uma proposta.

## Release e rollback

Aplicar20261018170000 e20261018171000 no banco integrado ao Lovable após autorização específica; integrar/publicar código e conferir UI/API/worker. Antes, backup de newsletter_dispatch e newsletter_form_campaign já capturado somente leitura em docs/qa/newsletter/recovery-functions-before.sql. Nenhum inscrito ou envio é alterado pela migration.

Rollback de recuperação/prompt: reverter este diff de app, restaurar somente dispatcher anterior e manter tabelas/colunas privadas. **Preservar newsletter_form_campaign de três dias** para continuar compatível com PR52; restaurar função antiga(segunda/quinta70h) exige reverter coordenadamente a agenda no app. Preservar pedidos/backup da #4. Não apagar dados nem reenviar campanhas como rollback. Custos locais de teste zero; publicação usa quota existente; cada pedido por prompt autoriza até duas execuções do pipeline, sem upgrade ou novo serviço. O smoke de prompt em produção deverá ser um pedido real autorizado pelo operador; não gastar modelos por mera inspeção.

### Evidências finais locais
65 testes direcionados aprovados (63 na rodada conjunta e dois casos adicionais de borda) e2 testes de continuidade aprovados. O teste de20 edições passou isolado em2,75s; na execução concorrente anterior excedeu o limite padrão5s, sem falha de asserção. Reexecução isolada com limite15s, sem mudar produção ou enfraquecer asserções. `pnpm validate`:64 regressões, TypeScript e build aprovados. Lint dos21 arquivos TS/TSX afetados e diff check aprovados. Ensaio SQL usa PGlite instalado, cadeia real de migrations e um destinatário sintético; sem chamadas de email/modelos. QA visual somente fixture estática local do editor: desktop1280 e mobile390, sem overflow; fluxo funcional demonstrado por testes de handlers, não apresentado como interação produtiva.

A #4 real está revision3/agent, assunto “#4 — Na subida, motor e pedal fazem dupla”, imagens1280x720; zero campanhas19/10 confirmado após a correção. Nenhuma geração paga adicional nesta implementação local. Aplicação das duas migrations e publicação da recuperação/prompt ainda pendentes.

Casos finais: cooldown anterior não bloqueia recuperação determinística dentro da janela; fingerprint malformado é recuperado sem pausar enabled. Ambos passaram, junto com os13 casos correlatos, e o gate validate foi reexecutado após esses ajustes.
