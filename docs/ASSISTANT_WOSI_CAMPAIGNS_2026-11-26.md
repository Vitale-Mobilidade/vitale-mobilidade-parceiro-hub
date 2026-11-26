# Convite do assistente e campanha Wosi — 26/11/2026

Classificação: estrutural (integração de assistente, afiliação, Supabase e Admin). Base operacional effbaeb. Pedido: launcher compacto com chat inicialmente fechado, convite inicial que desaparece após 10s, fechamento manual suprime convite 24h na sessão; cliques Wosi em Campanhas.

## Revisão prévia

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Convite discreto e desempenho da campanha | Confundir clique com venda/pessoa única | Métrica nomeada cliques, sem inferir conversão | Prosseguir |
| CTO | Estado local e agregados separados | Hidratação, timers duplicados, contagens truncadas | sessionStorage com fallback e cleanup; agregação SQL | Prosseguir condicionado a testes |
| IA | Somente apresentação, não modelo ou prompt | Carregar/abrir fornecedor automaticamente | Continuar carga só por clique explícito; mocks | Prosseguir |
| Segurança | Agregados sem identidade e leitura Admin | Forjar campos, acesso público ou query/PII | Payload fechado, RPC service_role, RLS e role admin | Prosseguir condicionado à revisão SQL |
| UX/UI | Ícone permanente e convite fechável | Bloquear leitura ou perder acesso ao fechar | Alvos acessíveis, largura mobile, botão sempre presente | Prosseguir |
| CX | Contagem em Campanhas | Falha aparecer como zero | Estado indisponível separado de vazio | Prosseguir |
| Growth | Cliques gerais/artigos por período | Contaminar relevância Radar ou bloquear link | Tabela separada, envio sem await e sem preventDefault | Prosseguir |
| PMO/QA | Frontend, coletor e read Admin | Publicar frontend antes do backend | SQL aditivo preparado, gate local e autorização específica de migration | Prosseguir localmente |

## Decisão consolidada e trade-offs

- Assistente: chat não abre automaticamente; launcher vira ícone. Convite inicial “Ficou com alguma dúvida? Tire suas dúvidas sobre bikes elétricas com o Assistente Vitale.”, CTA para abrir e X separado. Some após 10s sem abrir chat. Dismiss manual/click suprime por 24h em sessionStorage; timer também marca exibição para não repetir em cada rota durante essa sessão. Nova sessão pode exibir novamente. Storage indisponível recebe fallback de memória.
- Wosi: nova tabela agregada diária isolada e RPC de escrita service_role; evento com campanha fixa, origem pública sem query, superfície site/artigo. Sem PII, sessão, IP, visitantes únicos ou vendas. Cliques primário e botão do meio, sem duplicar; teclado usa click nativo. Erros de coleta não impedem navegação.
- Admin: Wosi na página Campanhas, com total, série diária e divisão por superfície; período existente compartilhado. Instagram preservado. Zero significa ausência de registro; erro fica explícito.
- Dependências: aplicar SQL por ferramenta oficial com autorização específica, disponibilizar coletor/read backend antes do frontend; nenhum journal aplicado deve ser editado localmente.
- Fora do escopo: retroagir cliques não coletados, contabilizar conversão externa, alterar Hotpipe/CRM/modelos/prompts ou links.
- Rollback: reverter frontend/Edge; tabela nova permanece preservando histórico, sem DROP automático. Não há transformação de dados existentes.

## Pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Dois pedidos implementados: launcher/convite e Campanhas Wosi com total/período/superfície. |
| CTO | Pass | SSR preservado, cleanup de timers, dependências existentes; typecheck e build passaram. |
| IA | Pass | Browser local: nenhuma carga externa antes do clique, mock abriu somente após ação explícita, sem mensagem/IA real. |
| Segurança | Pass | Testes rejeitam PII/campanha inválida/private paths, role não-admin e período inválido; PostgreSQL isolado confirmou RLS/grants, anon sem acesso e service_role com privilégios equivalentes aos do Supabase. |
| UX/UI | Pass | Browser em desktop e 390×844: convite inicial, auto-hide após 10s, botão mantido, fechamento manual seguido de remount/reload sem convite; sem overflow. |
| CX | Pass | Backend e UI distinguem indisponibilidade de zero; nenhum job/CRM/alerta alterado. |
| Growth | Pass | URL Wosi byte a byte preservada; coleta sem await/preventDefault; campanha separada de Bikes/Growth e limitada a cliques, não vendas. |
| PMO/QA | Pass | 57 testes direcionados, pnpm validate (71 regressões/tipos/build), ESLint dos componentes/arquivos novos, diff-check e ensaio PostgreSQL. |

### Evidências e condição de release

- Testes direcionados: assistant-invite, wosi-campaign, site-analytics-endpoint, site-analytics, WosiBanner, links-campaign e links-journey-admin: 57/57.
- Gate `pnpm validate`: 71/71, typecheck e build concluídos com Node 22.23.5.
- Ensaio PostgreSQL local: incremento atômico 2 cliques site + 1 artigo, relatório total 3; anon não lê/escreve; origem privada/query, superfície inválida e período invertido rejeitados. Transação revertida e servidor local desligado. Primeira tentativa do harness usou service_role sem BYPASSRLS e foi corrigida para reproduzir a permissão real do Supabase; nenhum ajuste de RLS no produto.
- Browser local usou componente real e fornecedor simulado, sem clique real Wosi, CRM, eventos produtivos ou créditos externos. State inicial exibiu zero conversas; após 10s o convite sumiu e launcher permaneceu; novo mount/reload respeitou supressão; abertura explícita acionou apenas o mock. Verificado em desktop e celular.
- Retenção do novo agregado: 365 dias, sem PII; a supressão do convite usa timestamp em sessionStorage, com fallback em memória. Auto-hide também aplica a supressão para evitar repetição a cada rota durante a sessão.
- SQL proposto: `docs/sql/wosi-campaign-2026-11-26/forward.sql`. Sem alteração de journals, schema existente, dados ou RLS de produção. Rollback documentado ao lado do SQL; preservar a tabela nova se frontend for revertido.
- Sequência de release: confirmar snapshot/recuperação e ausência dos novos objetos; aplicar migration por ferramenta oficial; implantar somente `site-analytics` e `editorial-admin` com os contratos novos; conferir leitura admin e coletor sem gravar cliques artificiais; publicar frontend e realizar smoke sem conversa/clique afiliado real.
- Estado: **implementado e validado localmente; ativação e publicação pendentes de autorização específica para este novo escopo de backend**. A autorização anterior cobriu banners e sua correção visual, não esta migration nova.


### Leitura operacional somente leitura

Conexão Lovable do projeto confirmou Supabase ativo. SELECT de metadados confirmou ausência dos três objetos propostos (tabela, writer e report), sem consultar contatos e sem escrever em produção. A extensão de paths para Wosi foi isolada em `wosiAnalyticsPath` para manter a cobertura Growth herdada inalterada; regressão específica passou.
