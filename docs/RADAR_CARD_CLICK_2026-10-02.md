# Clique no card do catálogo Radar — 02/10/2026

## Revisão pré-implementação

**Objetivo e classificação:** tornar toda a área dos cards em “Todas as bikes monitoradas” um link para o detalhe e histórico da mesma Bike. Estrutural pelo critério de Radar, embora a alteração seja localizada no frontend. Fluxos afetados: catálogo `/radar` → detalhe `/radar/{bikeId}`; sem mudança de dados, oferta, afiliado ou publicação.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Facilita chegar ao detalhe canônico. | Destino inconsistente entre imagem e CTA. | Usar o mesmo `bikeId` do CTA atual. | Prosseguir. |
| CTO e Arquitetura | Troca a área do link no componente React. | Link aninhado ou diferença entre SSR e hidratação. | Preservar o `Link` e a rota existentes. | Prosseguir com um único link sem evento imperativo. |
| IA e Agent Engineering | Nenhum fluxo de IA é alterado. | Nenhum risco material identificado. | Nenhuma. | Prosseguir; N/A na validação funcional. |
| Segurança | Sem mudança de entrada, permissão ou segredo. | Introduzir destino dinâmico fora da rota atual. | Manter a composição de URL já usada. | Prosseguir. |
| UX/UI | Foto, texto e CTA passam a ter a mesma ação, também no teclado. | Perda de foco visível ou affordance. | Foco explícito e CTA visual preservado. | Prosseguir com link semântico único. |
| CX e Operação | Reduz tentativa frustrada de abrir a Bike. | Nenhum processo interno afetado. | Nenhuma. | Prosseguir. |
| Growth e CRO | Aumenta a área de acesso ao detalhe do Radar. | Interferir no link direto de oferta. | Escopo limitado ao card do catálogo. | Prosseguir. |
| PMO e QA | Aceite requer destino único em toda a área do card. | Regressão de layout e navegação. | Typecheck, teste dirigido e `pnpm validate`. | Prosseguir. |

**Conflito e decisão:** ampliar a área clicável poderia levar a um `onClick` no contêiner, enquanto acessibilidade e navegação nativa favorecem um link único. Escolhido link único, sem links ou botões aninhados. Não há risco material sem mitigação.

**Escopo:** apenas `RadarBikeCard`, nos cards da grade “Todas as bikes monitoradas”. **Critérios de aceite:** imagem, textos, espaço vazio e CTA abrem o mesmo `/radar/{bikeId}`; o card é um único foco de teclado com indicador visível; aparência e dados são preservados. **Fora de escopo:** destaque, rankings, ofertas, dados e publicação. **Rollback:** reverter o componente ao estado anterior.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Todo o card usa o mesmo detalhe canônico que o CTA anterior. |
| CTO e Arquitetura | Pass | Um `Link` existente envolve o conteúdo; typecheck e build passaram. |
| IA e Agent Engineering | N/A | Nenhum fluxo de IA foi alterado. |
| Segurança | Pass | URL preserva a composição anterior com `bikeId`; sem entrada ou permissão nova. |
| UX/UI | Pass | Imagem, conteúdo e CTA dentro do mesmo link; foco visível; teste de marcação aprovado. |
| CX e Operação | Pass | Clique na imagem agora tem o destino esperado; sem rotina operacional alterada. |
| Growth e CRO | Pass | Acesso ao detalhe facilitado; links de oferta não foram modificados. |
| PMO e QA | Pass | Teste dirigido aprovado; lint dos arquivos, typecheck e `pnpm validate` aprovados. |

**Validações:** `pnpm exec vitest run --config vitest.config.ts src/components/radar/RadarBikeCard.test.tsx` (1 teste), ESLint dos dois arquivos, `pnpm exec tsc --noEmit`, `pnpm validate` (59 testes existentes e build), `git diff --check`.

**Trade-off residual:** o CTA é uma representação visual dentro do link único, não um segundo foco de teclado. A ação e a etiqueta continuam acessíveis pelo card. Sem risco material pendente. **Estado:** alteração local validada. **Autorização de release:** o responsável pediu “publique” nesta conversa em 02/10/2026, após receber o escopo, testes, risco e rollback. Integração e verificação em produção serão registradas após a execução.
