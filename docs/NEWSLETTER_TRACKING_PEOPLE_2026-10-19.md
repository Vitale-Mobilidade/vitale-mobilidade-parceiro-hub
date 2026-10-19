# Tracking e pessoas da newsletter — 19/10/2026
Classificação estrutural (DNS, provedor, integração e dados pessoais). Usuário autorizou configuração Resend/HostGator, implementação, publicação e teste. Base 25ef5d1.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Entregar medição e nomes por campanha; não prometer retroatividade; prosseguir. |
| CTO | Usar API oficial de recipients com cursor e autenticação existente; falha do provedor explícita; prosseguir condicionado a testes. |
| IA | Sem geração ou agentes; N/A. |
| Segurança | Dados nominais somente no admin, no-store e secrets no servidor; DNS adicionar apenas CNAME solicitado, sem trocar MX/SPF/DKIM/site; prosseguir. |
| UX | Botões Abertos/Com clique, lista paginada e estado vazio honesto; prosseguir. |
| CX | Verificar tracking real e teste restrito ao responsável; nunca reenviar lote; prosseguir. |
| Growth | Tracking de newsletter permitido pelo usuário; preservar links afiliados públicos diretos. Privacidade/robôs afetam números; prosseguir. |
| PMO | Testes dirigidos, validate, DNS público e teste de evento real; rollback documentado; prosseguir condicionado. |

Decisão: concluir subdomínio links.news.vitalemobilidade.com com registro exibido pelo Resend, ativar abertura/clique; implementar leitura por campanha de pessoas que abriram/clicaram, sem novo schema. Teste de email restrito ao responsável confirmado na conta/painel; não enviar campanhas a assinantes. Custos: DNS/controles existentes, envio de teste pequeno na quota atual, sem contratação. Nenhuma alteração de credencial ou ampliação de acesso. Dependência: sessões Resend/HostGator e DNS autoritativo. Aceite: configuração verificada, listas protegidas e paginadas, publicação e evento observado ou limitação concreta registrada. Conflito: tracking redireciona links dos emails; manter CTAs para páginas Vitale e não alterar afiliados públicos. Rollback: reverter código; desativar tracking e retirar apenas CNAME novo se necessário, preservando demais registros e dados históricos. Revisão posterior obrigatória.

## Evidência antes da publicação
CNAME adicionado na HostGator com TTL 14400: links.news.vitalemobilidade.com -> links2.resend-dns.com. Resend confirmou domain e tracking Verified em 19/10 às 12h28 São Paulo; switches abertura/clique ON. Consultas DNS 1.1.1.1 e 8.8.8.8 confirmam destino. Demais registros inalterados. Captura no checkout de referência: artifacts/resend-tracking-enabled-2026-10-19.png.

Implementação: leitura server-side de /broadcasts/{resend_id}/recipients?type=opened|clicked&limit=25, ID resolvido na tabela de campanhas após autenticação admin. Cursor opaco validado, nomes por e-mail, links http(s), falha do provedor distinta de vazio, sem cache público. UI por campanha com Quem abriu / Quem clicou, contagens de eventos, links clicados, Anterior/Próxima e atualização explícita. Nenhuma migration. Testes: 28 dirigidos passaram (paginação, nomes, filtro de URL, input inválido, falha, ausência de campanha e bloqueio content-editor); pnpm validate passou com 64 testes/typecheck/build.

Revisão posterior local: Produto Pass; CTO Pass (contrato oficial, paginação e testes); IA N/A; Segurança Pass (admin/no-store, segredo no backend, DNS isolado); UX Pass em renderização automatizada (controles presentes), inspeção produtiva pendente; CX Pass local (vazio e falha distintos), evento real em validação; Growth Pass (somente newsletter); PMO Pass no corte local, publicação/smoke ainda pendentes. Autorização de publicação presente; teste de entrega em execução não permite declarar sucesso de evento antes da prova.

## Teste real e smoke produtivo
Conector Lovable confirmou por API domínio/tracking verificados e ambos flags true, mas POST email foi bloqueado por confirmação própria indisponível nesta sessão: nenhum envio pelo conector. Custo reportado: 1,2 crédito. Teste realizado pela interface normal do Resend: rascunho técnico b0525802-c111-43ef-ab3f-4484758d7848, SEM audiência selecionada, Test email exclusivamente ao responsável (destinatário único conferido antes do envio). Rascunho permanece identificado como teste/não enviar a assinantes, sem campanha de produção criada.

E-mail técnico 01a154ca-9c02-77ae-a001-c0b4e2d7b573: Sent/Delivered às 12h32 e Opened/Clicked às 12h33 (São Paulo), confirmados na linha do tempo do Resend. Mensagem aberta pelo Spark; link passou por links.news.vitalemobilidade.com e chegou ao Radar com UTM preservado. Captura: artifacts/resend-tracking-test-events-2026-10-19.png no checkout de referência. Não foram gerados eventos artificiais nas campanhas de inscritos.

Release e6e2d22 publicado (deployment a5b4b5f0-fe72-4a65-8ce9-0f4dfccc2a22); painel real exibe Quem abriu/Quem clicou e ambas consultas retornam vazio válido nos broadcasts antigos, sem falha do provedor. API sem sessão responde 401. Amostra positiva de linhas/paginação validada com mocks; email de teste nativo não foi inserido nas campanhas do banco para não contaminar histórico. Esta é a limitação do teste de lista nominal produtiva até o próximo broadcast rastreado.

Ajuste de fechamento: métricas zeradas de broadcasts Vitale enviados antes da ativação conhecida (19/10/2026 12h28) permanecem indisponíveis, mesmo com flags atuais ligadas. Timestamp de provisionamento explicitamente documentado no leitor; eventos positivos, se existirem, são preservados. Sem schema ou alteração dos dados de campanhas. Teste adicional comprova comportamento histórico: 29 dirigidos e pnpm validate (64 testes/typecheck/build) passaram novamente.

Revisão final das oito perspectivas: Produto Pass (requisito e limites claros); CTO Pass (endpoint oficial produtivo, mocks positivos e paginação); IA N/A (não alterada); Segurança Pass (401 e 403 testados, admin/no-store, DNS exclusivo); UX Pass (layout produtivo inspecionado e estados claros); CX Pass (teste real entregue, aberto e clicado, nenhuma campanha reenviada); Growth Pass (tracking só em emails, links públicos afiliados preservados); PMO Pass (29 testes dirigidos e validate, evidências e rollback). Ajuste de histórico será publicado na mesma autorização antes do encerramento. Custos: uma mensagem de teste na quota atual, sem contratação. Rollback: reverter commits da task e republicar; se necessário desligar tracking e retirar exclusivamente CNAME links.news, preservando domínio e demais registros.

## Encerramento
Correção 2ccdd46 publicada e conferida no painel real às 12h37: broadcasts anteriores à ativação mostram “—” em aberturas/cliques, enviados/entregues preservados; controles nominais presentes. Deployment final solicitado após confirmação de sincronização do commit: 788b0ffa-7f4e-4fca-9723-1df263916b7d. Task concluída: DNS/Resend verificados; painel publicado; entrega/abertura/clique reais confirmados no teste individual; listas consultadas contra API produtiva e casos positivos/paginação nos testes. Não houve reenviar edição, alterar inscritos, migration, contratação ou ampliar permissões. Nenhuma pendência funcional conhecida. Limite permanente: tracking não retroage, e privacidade/robôs afetam interpretação de eventos. Evidência final do painel em artifacts/newsletter-tracking-people-published-2026-10-19.png no checkout de referência. Todos os oito pareceres finais mantidos (IA N/A); validate e targeted já aprovados nesta revisão.
