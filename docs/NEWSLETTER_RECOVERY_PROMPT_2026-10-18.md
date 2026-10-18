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

## Ajuste de release — título genérico de moto

Revisão prévia estrutural complementar: inspeção da #4 mostrou que “Moto elétrica vale a pena?” passou por não citar EVS/EV1. Produto: priorizar bikes também na primeira leitura; IA: filtro determinístico de tema no título, sem nova geração; CTO: reutilizar política/curadoria e validar snapshots; Segurança: nenhuma nova permissão; UX: destaque deve corresponder à abertura; CX: reordenar seções já aprovadas preserva texto; Growth: manter links/fontes; PMO: testar título genérico, comparação bike/moto e snapshots. Todas recomendam prosseguir com esse ajuste limitado. Decisão: excluir pautas exclusivamente de moto na nova curadoria, permitir comparações centradas também em bikes, bloquear primeira leitura exclusivamente de moto em snapshots; mover o artigo V8Pro aprovado para primeira posição da #4 com backup/lease/CAS, sem redigir fatos novos. Catálogo, fontes, URLs, texto e número/data preservados. Rollback: reverter diff e restaurar somente ordem das leituras do backup se necessário.

Ajuste complementar validado:22 testes direcionados e pnpm validate64/types/build aprovados; lint/diff check limpos. Pós-revisão Produto/CTO/IA/Segurança/UX/CX/Growth/PMO: Pass para esse ajuste com as evidências acima e escopo mínimo. A #4 está revision4: leitura V8Pro em primeiro, V29Pro em segundo, artigo genérico de moto mantido apenas como última leitura do acervo; todo texto previamente aprovado e as imagens1280x720 preservados. Nova curadoria não seleciona pautas exclusivamente de moto. Backup privado completo revision3 em /tmp/vitale-newsletter-edition4-before-ordering.json; atualização em transação/lease/CAS com zero campanhas para19/10.

## Coerência do reparo editorial — revisão prévia

Classe estrutural (writer IA). O primeiro pedido real pelo campo foi rejeitado; feedback informa abertura em F6ProS versus assunto/headline em V8Pro. Inspeção comprova que mergeNewsletterCorrection fixa campos editoriais não apontados, enquanto a política exige abandonar um foco rejeitado. Essa combinação permite incoerência quando o redator troca de foco na abertura.

Produto: manter um eixo legível; CTO: alterar somente helper existente, sem schema/job novo; IA: assunto/headline/preheader/abertura podem ser corrigidos como conjunto quando o revisor aponta assunto/headline/abertura, corpo não apontado continua preservado; Segurança: revisão factual completa permanece veto; UX: proposta por prompt continua exigindo Aplicar; CX: retentativa já persistida poderá usar o reparo coerente; Growth: URLs/opt-out intactos; PMO: atualizar testes de preservação e executar validate. Recomendação das oito: prosseguir no escopo descrito. Trade-off: quatro campos editoriais podem mudar em reparo antes limitado; mitigação é revisão completa e preservação do corpo/fontes. Sem novas chamadas ou aumento de orçamento. Rollback: reverter somente este diff do writer.

Coerência — pós-revisão:32 testes do writer, fila e preparação aprovados; novo caso confirma abertura/assunto/headline/preheader coerentes, corpo não apontado preservado e rejeição só de preheader continua localizada. Produto/CTO/IA/Segurança/UX/CX/Growth/PMO Pass para o ajuste, preservando revisão factual e orçamento originais. Publicação permanece no escopo autorizado de corrigir recuperação/edição por prompt.
Coerência: pnpm validate64 regressões/TypeScript/build, lint dos dois arquivos e diff check aprovados após o ajuste.

## Release produtivo autorizado — 18/10/2026

As pendências de publicação citadas acima foram concluídas. PR53 integrada em cab122bfc6c1dd4e6f8fa4f7dbad3427cee46a28; PR54 em eb9e579f90539ca9f86cbb6c693e0e8e1bc1606f; PR55 em e16b05da9b0035ac5e3447bf711883c49023808a. Migrations20261018170000 e20261018171000 aplicadas em transação no banco integrado do Lovable, com registro no ledger. Conferência da função produtiva confirma dias1/3/5 e intervalo46h; RLS da fila ativa, anon sem leitura e authenticated sem escrita.

Deploy53:8a0af73b-470f-4247-965f-2eae8561abbf; deploy54:b5182e42-de8b-4932-a8c8-fd2fbdda9e92, ambos confirmados no painel Lovable. Deploy55:406e8fe1-a9ba-40f6-aee4-e15282d15efc iniciado após confirmar SHA sincronizado. Painel produtivo autenticado mostra segunda/quarta/sexta06h30 e campo de prompt; API admin anônima401. Worker assinado via newsletter_dispatch respondeu200 sem alterar draft existente.

Smoke funcional real autorizado: pedido cdef0634-029f-47ec-ba30-926c04db4c57 criado pelo campo do painel, base revision4. Primeiro ciclo natural do cron executou pipeline, revisor rejeitou incoerência editorial; feedback e retentativa com cooldown persistidos, draft revision4 preservado, enabled=true e zero campanhas19/10. Não houve reset de orçamento ou tentativa manual para simular recuperação. O resultado da segunda tentativa será registrado abaixo.

Deploy55 confirmado pela interface Lovable: “Seu site foi atualizado”. Pós-release das oito perspectivas: Produto Pass (agenda e prioridade bike refletidas no painel/#4); CTO Pass (SHA sincronizado, migrations/worker conferidos); IA Pass com limite explícito (revisor rejeita conteúdo e retentativa persistida; nenhuma promessa de infalibilidade de provedor/modelo); Segurança Pass (admin401 anônimo/RLS/revokes e nenhuma nova exposição); UX Pass (campo, estados e preservação de revisão observados em produção); CX Pass (falha real não pausa envio nem elimina draft válido); Growth Pass (horário e frequência produtivos, sem envio antecipado); PMO Pass para publicação (validate64/build/types e evidências acima). Proposta final por prompt ainda em verificação; não confundir publicação da funcionalidade com aprovação desse conteúdo.

Resultado do smoke: cron natural iniciou segunda tentativa em18/10/2026 às17:00:02UTC, após next_attempt_at17:00:01UTC. Ao final, status failed/attempts2; revisor vetou gancho em pergunta e inferência não explicitada na transcrição sobre sensor de torque. A correção de coerência eliminou o conflito anterior assunto/abertura, mas esta proposta não foi aprovada. Nenhuma aplicação/candidate foi feita. Isso prova recuperação e contenção de falha, não sucesso editorial do pedido. #4 revision4 válida preservada para19/10 às06h30, prioridade V8Pro/F6ProS, imagens1280x720; EVS/EV1 fora do destaque. Não houve envio nem campanha antecipada.

Limite operacional comunicado: duas execuções pagas por pedido/data para evitar gasto infinito; a continuidade regular usa draft válido/fallback determinístico e retentativa de fontes, sem aguardar IA indefinidamente. Disponibilidade de fontes, hospedagem e provedor impede prometer entrega infalível. Não existe agente humano/LLM permanente supervisionando: worker assinado e cron persistente fazem a recuperação.
