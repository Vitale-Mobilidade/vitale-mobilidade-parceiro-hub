# Admin: audiência e newsletter — 16/10/2026

Classificação: estrutural, por leitura de Supabase e métricas do Radar.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Foco em conteúdo e audiência; evitar confundir pessoas com alertas; prosseguir com rótulos explícitos. |
| CTO | Agregação no servidor autenticado, paginação completa; sem migration; prosseguir. |
| IA | Writer preservado; geração manual fica nas configurações; prosseguir. |
| Segurança | Telefone usado apenas para deduplicação no servidor; retornar só contagens; manter gate admin. Prosseguir. |
| UX/UI | Reduzir altura, gráfico com valores acessíveis e lista compacta; prosseguir. |
| CX | Preservar filtros de entrega e descadastro; ocultar configurações sob demanda; prosseguir. |
| Growth | Separar total histórico, ativos e alertas ativos; novos cadastros por dia não são saldo líquido; prosseguir. |
| PMO/QA | Testes focados, validate e rollback por reversão do diff; prosseguir. |

## Decisão consolidada
Escopo: seis KPIs principais na visão geral; newsletter com métricas, série de 30 dias em São Paulo, cadastro com hora, edições enviadas apenas no histórico e configurações recolhidas. Contar pessoas no Radar por telefone distinto com alerta ativo e consentimento; informar também total de alertas. Não confundir inscrição com entrega habilitada. Não alterar consentimentos, campanhas, banco, writer ou agendamentos. Sem dependência nova nem custo externo. Rollback: reverter este diff. Critérios: dados agregados privados, sem truncamento silencioso, dias sem inscrição em zero, histórico e filtros preservados.

Trade-off: o Google não é fonte de confirmação de entrega do Resend; o painel usa os webhooks existentes. Migrar o provedor seria outra mudança. Cadastros antigos sem evento individual continuam sem confirmação; não inventar entrega. Datas históricas refletem created_at já registrado.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Visão geral com conteúdo, total da newsletter e pessoas no Radar; newsletter separa ativos e descadastros. |
| CTO | Pass | Endpoint privado existente, ação metrics validada, paginação explícita com falha em limite; typecheck e build. |
| IA | Pass | Writer e geração preservados; controles manuais recolhidos. |
| Segurança | Pass | Autorização admin precede nova ação; telefones não saem do servidor. Sem migration, RLS ou escrita de dados. |
| UX/UI | Pass | Gráfico com tabela alternativa, estados de erro, lista recolhida, horário explícito; renderização coberta por teste. |
| CX | Pass | Filtros de pessoas e entrega preservados; datas com hora; edições antigas deixam de aparecer como botões de edição. |
| Growth | Pass | Pessoas deduplicadas por telefone; cadastros diários incluem descadastrados posteriores; zero diário preservado. |
| PMO/QA | Pass | 20 testes focados, 62 regressões no pnpm validate, typecheck e build aprovados; lint do escopo aprovado. |

## Fechamento
Implementado localmente na branch `codex/admin-newsletter-dashboard`, a partir de `f16b545`. Nenhum envio, chamada Resend/Google, deploy ou mudança de banco executado. `pnpm validate` passou. Avisos preexistentes de depreciação do TanStack e configuração do Vite não impedem build. Teste adicional confirma paginação de 501 cadastros e deduplicação de dois alertas da mesma pessoa. Diff sem erros de whitespace.

GO local. Publicação condicionada à autorização específica e smoke autenticado das duas telas no ambiente alvo após release. Rollback: reverter os arquivos deste diff para `f16b545`; não há rollback de dados. Consulta limitada a 50 mil linhas por fonte: se exceder, falha explicitamente em vez de exibir contagem parcial. Telefone é a identidade disponível do alerta, não uma identificação civil de pessoa. Novas métricas não reconstituem eventos históricos ausentes. A data de cadastro é a data persistida, sem inventar horário anterior a uma eventual importação.

## Release autorizado e verificado — 16/10/2026
Usuário autorizou explicitamente implementar e publicar nesta conversa. PR #49 integrado em main como `07671525933a9eca86a9baeb0771b724cd053a5a`; árvore integrada idêntica à validada localmente. Lovable confirmou esse mesmo latest_commit_sha antes da publicação. Publicação solicitada pela ferramenta deploy_project, deployment `63d2950a-9815-4385-a780-e8c26b5139e8`.

Smoke autenticado no domínio https://vitalemobilidade.com confirmou a versão nova efetivamente publicada:
- `/admin`: 128 vídeos na planilha, 128 com artigo, 128 artigos publicados, 34 bikes, 43 cadastros de newsletter e 13 pessoas com alertas ativos. Sincronização existente em estado ok.
- `/admin/newsletter`: 43 cadastros, 41 ativos, 2 descadastrados; série diária de 17/09 a 16/10, 43 entradas no período e 4 hoje. Gráfico inspecionado visualmente sem sobreposição.
- Botão de inscritos ativos abre lista filtrada com 41 pessoas e data/hora persistida, formatada em São Paulo. Configurações recolhidas; abertura confirma nenhuma edição futura disponível e ausência de botões das três edições antigas.
- Histórico preserva três campanhas e contagens: 15/10, 25 entregas de 25 destinatários; 12/10, 23 de 23; 08/10, 19 de 21 com 2 falhas. Relatórios são do Resend integrado.
- API administrativa sem sessão responde HTTP 401; página `/admin` HTTP 200. Sem cadastros de teste, disparos, alteração de cron, migração ou mudança de dados.

As oito revisões pós-implementação permanecem Pass, agora com smoke e inspeção visual em produção. GO, release concluído. Aviso editorial `newsletter_writer_review_failed` já existia antes deste release e continua preservado nas configurações; não foi tratado como falha nova da interface ou como motivo para reenviar campanha. Rollback de código: reverter #49 e republicar, sem tocar nos inscritos. Nenhum agente de geração Lovable foi usado nesta publicação.
