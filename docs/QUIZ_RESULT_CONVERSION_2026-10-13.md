# Home e entrega do Quiz — 13/10/2026

## Revisão pré-implementação
Classificação: estrutural (Quiz, Radar, alerta de preço e integrações). Pedido: CTA desktop da home “Faça o Quiz e descubra a bike ideal”, Radar abaixo; resultado do Quiz com alerta por bike, sem bloco “Por que não recomendamos só pela ficha técnica?”, com seção visual do Radar, banner aprovado de grupo e newsletter.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Resultado oferece próximos passos contextuais depois da recomendação; preservar principal e alternativa. Prosseguir. |
| CTO | Reutilizar componentes e consulta pública existente; preservar SSR da home e motor do Quiz. Prosseguir. |
| IA | N/A: nenhuma alteração de modelo, prompt, geração ou grounding. |
| Segurança | Alerta/newsletter com consentimento próprio, sem cadastro automático nem transferência de PII. Reutilizar endpoints existentes. Prosseguir. |
| UX/UI | CTA desktop em uma linha, Radar abaixo; alerta acessível por bike; validar desktop/mobile e teclado. Prosseguir. |
| CX | Alertas usam referência de preço real; sem preço válido, não oferecer formulário sem referência. Prosseguir. |
| Growth | Manter eventos do grupo e compra; Radar ligado à bike recomendada; CTA principal prioritário. Prosseguir. |
| PMO/QA | Testes dirigidos de alerta, layout e preservação do Quiz; mockar escritas, não cadastrar leads reais; pnpm validate e preview visual. Prosseguir. |

Decisão: implementar localmente. Sem alteração de schema, motor de recomendação, links afiliados ou envio real. Reutilizar RadarPanel, OffersBanner, NewsletterSignup e PriceAlertDialog; nenhuma arte nova paga. Conflito: novos próximos passos versus excesso de CTA; manter compra e recomendação no topo, retenção após comparação. Rollback: reverter diff dos componentes. Critérios: copy exata no desktop, Radar abaixo, alerta com bike/preço certo, bloco educativo removido, visual aprovado de Radar/grupo e newsletter no resultado. Deploy desta mudança depende de autorização específica; a autorização anterior era para a correção editorial.

## Revisão pós-implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Copy desktop exata, Radar abaixo; retenção após comparação e CTA de alerta em cada recomendação. |
| CTO | Pass | RadarPanel extraído sem mudar comportamento da home; mesma consulta pública, endpoints e motor de recomendação. Typecheck/build aprovados. |
| IA | N/A | Sem alteração em prompts, geração ou modelos. |
| Segurança | Pass | Consentimento próprio do formulário, newsletter inicialmente desmarcada; dados de lead não são copiados; nenhuma escrita real nos testes. |
| UX/UI | Pass | Verificações Playwright em 1440x1000 e 390x844: sem overflow, modal com bike/preço corretos e fechamento por Escape; screenshots inspecionadas. |
| CX | Pass | Alerta oculto sem preço real positivo/finito; formulário existente de preço preservado. Grupo em nova aba mantém o resultado aberto. |
| Growth | Pass | Eventos de compra intactos; whatsapp_group_clicked preservado; Radar aponta à recomendada e banner à rota existente. |
| PMO/QA | Pass | 29 testes dirigidos, lint dos componentes novos, Playwright sem chamadas externas e pnpm validate (61 testes, typecheck/build) aprovados. |

Preview local isolado em /tmp/vitale-quiz-ui, usando componentes reais com roteador real e mocks de catálogo/backend/chat/analytics. Preços são simulados; assets da plataforma Lovable que não existem localmente mostram fallback (não substituir imagens produtivas). Imagens registradas em artifacts/quiz-result-20261013; nenhum novo recurso gráfico pago. A retirada do bloco educativo não altera os motivos da recomendação em cada bike.

Estado: implementado e validado localmente; preparado para revisão e autorização do merge/publicação. Arquivos produtivos: HomeB2C.tsx, EscolherBike.tsx, DecisionBanners.tsx, novos RadarPanel.tsx e QuizPriceAlert.tsx. Rollback: reverter o commit e republicar versão anterior. Sem migration, alteração de dados ou disparo de newsletter. Custo externo de desenvolvimento: nenhum. Publicação: usar sincronização GitHub e hosting Lovable existente, sem novo serviço nem geração paga.
