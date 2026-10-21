# Heatmap visual por elemento — 20/10/2026

## Classificação e revisão prévia
Estrutural: coleta, Supabase, UX e analytics. Refinamento solicitado: ver a página e elementos com maior precisão; a grade v1 não satisfaz essa necessidade. Preparar e testar localmente antes de qualquer nova migration/publicação.

| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Mostrar a página com marcações por elemento; não é replay nem captura histórica; prosseguir com limitação explícita. |
| CTO | Prévia SSR em iframe same-origin, scripts e interação desabilitados; IDs de destino públicos e posição relativa ao elemento; separar larguras e versão; prosseguir com testes. |
| IA | Nenhum modelo ou geração; N/A. |
| Segurança | Não capturar DOM/texto/valores dos visitantes; iframe restrito, URLs públicas permitidas, RPC privada; prosseguir condicionado à validação estrita. |
| UX | Página visível mesmo sem dados, zoom e filtros; tabela de elementos clicados; sem posicionar targets ausentes; prosseguir com QA visual. |
| CX | Explicar cobertura nova, elementos ausentes e página atual; prosseguir. |
| Growth | v1 não recupera precisão histórica; preservar dados e não reinterpretar células como cliques exatos; amostragem mantida; prosseguir. |
| PMO | Novos testes de contrato, isolamento, Admin, SQL e pnpm validate; rollback ao v1; prosseguir localmente. |

## Decisão consolidada e trade-offs
Identificadores gerados apenas a partir de caminhos públicos permitidos e IDs técnicos explícitos; links repetidos recebem ordinal dentro do mesmo destino, portanto reordenações materiais exigem nova versão. Nenhum texto livre, href externo bruto, seletor CSS arbitrário ou conteúdo de formulário é enviado. Agregação por viewport em pixels, versão, target e coordenadas relativas de 0 a 99. Tabela/RPC v2 aditivas preservam v1; não converter histórico antigo. Preview usa HTML público atual, não screenshot da sessão: dados/preços podem ter mudado, e elementos não encontrados aparecem em lista de não posicionados. Iframe sandbox allow-same-origin sem scripts/forms, sem interação e sem navegação pelo usuário. Sem cookie/ID novo. Sem garantia de precisão histórica/pixel idêntico em layout mutável.


## Revisão posterior e liberação da correção
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Página real exibida mesmo sem cliques; contagens sobre elementos e histórico v1 separado. |
| CTO | Pass | Nova tabela/RPC aditivas, frontend v2 e fallback v1; largura exata; SSR preservado; sem dependência nova de produto. |
| IA | N/A | Sem modelos, geração ou transcrições. |
| Segurança | Pass | Schema exato; targets técnicos e coordenadas relativas; nenhum texto/DOM de visitante; exclusão de forms/chat; iframe sem scripts/forms/interação; gates Admin; QA SQL de grants, atomicidade e retenção. |
| UX | Pass | QA com HTML público real a 390px, CSS real e 12 cliques fictícios: marcação sobre CTA correto; página centralizada, zoom, legenda e lista; erro/ausência de cobertura explícitos. |
| CX | Pass | Não posicionados são sinalizados; referência atual identificada; não se promete reconstrução de sessão. |
| Growth | Pass | V1 preservada sem conversão artificial; v2 filtrada por versão e largura; regressão de afiliados aprovada. |
| PMO | Pass | 37 testes direcionados, QA PostgreSQL embarcado e pnpm validate; rollback preserva v1 e desliga flag servidor. |

Correção do mesmo heatmap cuja implementação/publicação foi autorizada nesta conversa, agora refinado pelo pedido de maior precisão visual. Nenhum escopo de GA4/GTM, leads ou rastreamento individual acrescentado. Migration nova apenas para a coleta v2; não altera dados/RLS existentes. Custo: quota existente e operação Lovable restrita às duas funções, consumo esperado pequeno. Rollback: reverter web/funções ao SHA 9cff855 e desligar HEATMAP_ENABLED; preservar tabelas sem DROP.

Limites: 1% de posição relativa dentro do elemento, não coordenada exata histórica; largura efetiva de 240–3840px. Layout atual pode diferir da sessão passada. Links repetidos usam ordinal incluindo ocultos; reordenação material exige nova versão. CTAs do hero e oferta de detalhe recebem IDs explícitos. Menus/carrosséis em estados não presentes na referência podem aparecer como ausentes. Cliques fora de links/botões identificáveis não são capturados nesta versão. Dados fictícios de QA ficaram somente no ambiente local.
