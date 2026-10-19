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
