# Newsletter: consultas de desempenho a cada seis horas

Data: 30/10/2026. Base: `origin/main`, `f99870d`. Branch: `codex/newsletter-check-six-hours-2026-10-30`.

Pedido confirmado: reduzir somente a frequência de consulta dos resultados (aberturas/cliques). Preparação e disparos precisam manter o funcionamento atual. O responsável confirma o envio da edição de 30/10 pela manhã.

O cache de `newsletterCampaignReports` é de cinco minutos; a consulta `campaign-reports` no painel também considera os dados antigos após cinco minutos. Isso é separado do cron assinado de cinco minutos que orquestra o envio. A interpretação inicial de reduzir o dispatcher foi descartada após o esclarecimento do responsável, antes de testes ou aplicação externa. Nenhuma migration faz parte do resultado.

## Classificação e revisão prévia

Estrutural por envolver a integração Resend, embora o diff fique restrito à leitura e apresentação de estatísticas.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Resultados atualizados a cada seis horas | Mostrar números antigos como atuais | Preservar horário de consulta visível | Prosseguir |
| CTO | Aumentar validade do cache e intervalo do painel | Invalidar tarde uma edição recém-enviada | Chave muda com nova campanha/estado de envio | Condicionado a testes do cache |
| IA | Nenhuma chamada de IA no caminho de métricas | Alterar geração ao mexer no scheduler | Worker e writer fora do diff | Prosseguir com esse limite |
| Segurança | Preservar autenticação e cache privado existente | Cache fora da sessão ou ampliação de acesso | Sem cache HTTP público, schema ou grants novos | Prosseguir |
| UX/UI | Mostrar cadência de seis horas junto dos resultados | Confundir atraso de métricas com falha de entrega | Manter estados de erro e timestamp | Prosseguir |
| CX | Menos consultas enquanto o painel é utilizado | Precisar repetir consulta após erro | Preservar botão de nova tentativa e cache curto de erro | Prosseguir |
| Growth | Acompanhamento agregado menos frequente | Perder eventos se bloquear coleta | Webhooks e coleta fora do diff | Prosseguir |
| PMO/QA | Mudança isolada, sem migration | Confundir ajuste local com publicado ou com correção do alerta do worker | Testes de limite de seis horas, nova campanha e pnpm validate | GO condicionado à validação |

## Decisão consolidada

Escopo: cache bem-sucedido dos relatórios passa de cinco minutos a seis horas no servidor; painel usa a mesma validade e atualiza a cada seis horas enquanto aberto. Nova campanha ou conclusão de envio invalida a versão dos relatórios. Falhas mantêm o retry manual e não congelam uma resposta indisponível no servidor por seis horas.

Trade-off aceito: números podem ficar até seis horas atrás do provedor. O cache do servidor é o cache em memória já existente; uma nova instância/reinício pode fazer uma consulta inicial adicional. Não é uma quota global persistida de quatro chamadas por dia. Não criar tabela ou migration para impor essa quota nesta tarefa.

Critérios: cache reutilizado até imediatamente antes de seis horas e renovado no limite; nova edição/novo envio é consultado sem esperar o cache anterior; timestamp e aviso de cadência visíveis; nenhuma alteração no worker, cron, geração, envio, consentimento, webhooks ou coleta. Esse ajuste não corrige nem diagnostica a origem do alerta `resend_network` do worker.

Rollback: reverter o diff da branch e publicar a versão anterior se o ajuste vier a ser publicado. Sem dados/schema para restaurar. Preparação local e testes sem chamadas externas pagas; produção não alterada.

## Revisão posterior e evidências

Implementado localmente, sem publicação. Alterados: política compartilhada do intervalo; cache de `newsletter-history.server.ts`; query/copy de `NewsletterCampaignResults`; versão dos relatórios em `AdminNewsletter`; testes relacionados e documentação. Worker, cron e migrations não têm diff.

Validações:

- 33 testes direcionados aprovados: histórico/cache, serviço de envio, webhook e painel. Os novos casos cobrem limite exato de seis horas, novo broadcast, conclusão de envio e recuperação após erro.
- `pnpm validate` aprovado: TypeScript, 66 testes do gate e build cliente/servidor.
- ESLint dos seis arquivos TypeScript/TSX alterados e `git diff --check` aprovados. Build só emitiu avisos já existentes de depreciação/configuração; nenhum erro.
- Nenhuma consulta ao Resend, IA, envio real ou uso de créditos Lovable nos testes: providers simulados.

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Desempenho com cadência de seis horas; horário da consulta preservado |
| CTO | Pass | Limite do cache, novo broadcast e conclusão do envio testados; TypeScript e build aprovados |
| IA | Pass | Writer e worker intactos; testes sem modelo real |
| Segurança | Pass | Autenticação preservada; nenhum cache HTTP público, segredo, grant ou schema novo |
| UX/UI | Pass | Render do painel confirma aviso de seis horas e os resultados existentes |
| CX | Pass | Nova tentativa após erro preservada; estado indisponível testado |
| Growth | Pass | Coleta/webhook intactos, testes de webhook aprovados |
| PMO/QA | Pass | Diff restrito, 33 testes direcionados e gate de 66 aprovados, rollback documentado |

Decisão final: **GO para o ajuste local validado**. O responsável autorizou a publicação nesta conversa: “pode publicar”. Aplicação em curso no mesmo projeto Lovable, com base confirmada `f99870d852defc788bdbc7a688d2d9d8de278e79`. Limitação residual aceita: cache em memória, sem quota global entre instâncias. A falha que originou o alerta do worker continua sem diagnóstico produtivo nesta tarefa e não impede esta mudança isolada de métricas.

O bloqueio de escrita GitHub já foi comprovado nesta conexão e registrado em `RADAR_RELEVANCE_30D_2026-10-30.md`; não repetir tentativas sem mudança de permissão. Aplicar somente o patch validado pelo projeto Lovable, modo normal, consumo esperado baixo. Conferir diff/hash antes de publicar. Rollback de código: restaurar os arquivos anteriores em `f99870d` e publicar novamente; não há migration nem banco para reverter.
