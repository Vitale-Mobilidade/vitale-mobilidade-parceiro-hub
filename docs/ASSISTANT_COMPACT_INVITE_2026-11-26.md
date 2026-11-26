# Convite lateral compacto — 26/11/2026

Classificação: pequena, correção visual localizada do pacote publicado. Pedido explícito: copy exata “Dúvidas? Fale com o Assistente da Vitale”, remover CTA “Tirar minha dúvida” e colocar convite ao lado do botão.

Revisão prévia e decisão: Produto/UX recomendam copy única e balão à esquerda do launcher, alinhados pelo centro; PMO recomenda teste visual desktop/mobile e gate obrigatório. CTO: apenas markup/CSS, sem novo estado ou dependência. Segurança/CX: preservar clique explícito, X, 10s e supressão 24h. IA e Growth: N/A, sem mudança em modelos, mensagens, métricas, afiliação ou coleta. Sem conflitos materiais. A correção e sua publicação integram a entrega já autorizada nesta conversa.

Escopo: somente markup/CSS do convite no componente compartilhado. Aceite: texto exato, sem CTA textual, balão à esquerda, botão de fechar acessível, sem overflow mobile. Fora do escopo: timers, storage, backend, Campanhas e Wosi. Rollback: reverter este commit de frontend e republicar.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Copy exata e CTA textual removido. |
| CTO | Pass | Alteração apenas de markup/classes; tipos e build passaram. |
| IA | N/A | Não altera agente, prompt, conversa ou carregamento externo. |
| Segurança | Pass | Interações existentes preservadas; sem novos dados ou destinos. |
| UX/UI | Pass | Browser local desktop e 390px: balão à esquerda, centros alinhados (diferença 0px), sem overflow. |
| CX | Pass | X, timer e armazenamento preservados. |
| Growth | N/A | Sem alteração de métricas, links ou campanha. |
| PMO/QA | Pass | 3 testes do convite, pnpm validate (71 regressões/tipos/build), ESLint e diff-check passaram. |

Release de correção visual autorizado na mesma entrega. Nenhuma alteração de backend/banco nem crédito de geração necessário. Rollback: reverter somente o commit desta correção e republicar.
