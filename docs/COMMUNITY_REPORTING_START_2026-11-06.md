# Início dos indicadores reais — 06/11/2026

Pedido: desconsiderar as duas compras de teste de R$150 em 05/11 e iniciar contagem dos perfis hoje. Interpretação: zerar somente o histórico analítico anterior da comunidade/anúncios, mantendo contas, anúncios, direitos pagos, Asaas, notificações e lista operacional completos. Não apagar nem estornar pagamentos.

Classificação estrutural: contrato Supabase de indicadores privados e configuração de apuração.

## Revisão prévia

| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Marco de 06/11/2026, calendário São Paulo, para cadastros e anúncios; dois pedidos de teste fora de pagamentos/receita/estornos analíticos. Lista operacional continua completa. Prosseguir. |
| Arquitetura | Uma configuração privada de apuração estende a RPC de métricas, sem mudar writers ou dados comerciais. Data inicial opcional preserva comportamento anterior até ativação. Prosseguir condicionado a teste do contrato. |
| IA | N/A: não altera modelos/agentes. |
| Segurança | Configuração e IDs de exclusão sem leitura ou escrita pelo navegador. Não versionar IDs de compras reais; ativação privada em produção. Backup da definição anterior. Prosseguir condicionado aos grants. |
| UX | Mostrar data inicial nos dois painéis e explicitar que usuários anteriores permanecem na lista. Não exibir dias anteriores como vendas reais zero. Prosseguir. |
| CX | Histórico financeiro/prazos preservados; exclusão é somente de apuração. Nunca reiniciar os 90 dias nem cancelar/reembolsar por causa do reset. Prosseguir. |
| Growth | Contagem real a partir do lançamento, sem alterar newsletter, Radar, vídeos ou outras métricas independentes. Prosseguir. |
| QA | Validar corte de dia São Paulo, exclusão de pedidos, somas/contagens, role Admin, ausência de mudanças em pagamentos, rollback e pnpm validate. Prosseguir condicionado. |

Decisão: implementar localmente configuração privada `member_reporting_settings`, com marco de data e exclusões por UUID de pedido. Migração desativada por padrão (sem marco/exclusões); ativar para 06/11/2026 e exatamente os dois testes após o gate de release. Totais de perfis/anúncios/ativos consideram registros criados desde o marco; faturamento/contagem de pagamentos/estornos excluem pedidos marcados e respeitam marco e período escolhido. Diárias começam no maior entre marco e janela selecionada. Listagem de usuários/anúncios, assinantes da newsletter, catálogo e direitos comerciais continuam completos. Um aviso nos painéis explica o marco para não confundir total analítico e lista operacional.

Rollback: restaurar configuração anterior ou desativar o marco/exclusões; preservar registros financeiros, usuários e anúncios. Função anterior guardada e revert possível sem apagar tabelas. Critério de aceite: receita dos dois testes ausente, histórico anterior excluído dos indicadores, contagem de hoje correta, nenhuma alteração de direito/pagamento, data explícita e permissões intactas. Migration/publicação dependem de autorização específica após preparação local.

## Revisão posterior

| Perspectiva | Resultado | Evidência |
|---|---|---|
| Produto | Pass | Marco único para os indicadores da comunidade/anúncios, com exclusões explícitas de pedidos de teste; lista operacional completa. |
| Arquitetura | Pass | Mesma RPC; configuração nova nasce inerte e contrato anterior permanece compatível. Zero mudança no writer financeiro ou de cadastro. |
| IA | N/A | Nenhum modelo/agente afetado. |
| Segurança | Pass | Tabela privada/RLS; sem privilégios de navegador para configuração ou RPC. IDs reais de pedidos não constam de arquivos versionados. Role Admin e intervalo 1–90 validados. |
| UX | Pass | Data exibida em Comunidade e Visão geral, sem conversão UTC que mude o dia; calendário começa no marco e não inventa histórico de zeros. Desktop/mobile, troca de período, zero e falha/retry testados. |
| CX | Pass | Clientes antigos continuam no diretório, com pagamentos/direitos/prazos íntegros. Exclusão de testes só altera apuração, inclusive se o provedor atualizar a data da compra posteriormente. |
| Growth | Pass | Novo baseline não zera newsletter, Radar, catálogo, vídeos ou histórico de operação. |
| QA | Pass | SQL descartável: compatibilidade inativa, isolamento, limite de período, fronteira 02:59/03:00 UTC (São Paulo), contagens, exclusão persistente, snapshot financeiro intacto, rollback e restauração da definição anterior. Dois smokes UI, typecheck e pnpm validate (66 testes/build) aprovados. |

Lint do módulo de contrato e Comunidade aprovado. `AdminEditorial.tsx` já tem formatação global legada fora do padrão; não reformatar o arquivo inteiro por uma linha. Lint sem a regra de formatação produziu zero erros e os mesmos quatro avisos de hooks da base. Diff limitado à descrição do card.

Evidências locais: `/tmp/vitale-reporting-{db,ui,overview-ui,typecheck,lint,editorial-lint,editorial-baseline-lint,validate}.log`; `artifacts/community-reporting/community-metrics-desktop.png` e `community-metrics-mobile.png` (dados fictícios). Runner: `python3 tests/member-community-db.py --reporting`. Smokes: `tests/community-reporting-ui.mjs` e `tests/community-reporting-overview-ui.mjs`, com bloqueio de requisições externas. Nenhuma mensagem, cobrança ou alteração de produção no desenvolvimento.

Preflight somente leitura confirmou exatamente duas compras de R$150 no dia 05/11/2026. Configurar os UUIDs somente no banco durante ativação autorizada; nenhuma modificação desses pedidos. Com o estado consultado, há um perfil e um anúncio criados em 06/11; a contagem é dinâmica, não fixada nesses números.

Estado: implementação local validada, pronta para PR e autorização de migration/publicação/ativação. Primeiro guardar definição e ACL atuais da RPC, aplicar migration inerte, publicar o frontend e então ativar marco 06/11/2026 e as duas exclusões na configuração privada. Rollback só desativa configuração, sem apagar registros nem reiniciar direitos.
