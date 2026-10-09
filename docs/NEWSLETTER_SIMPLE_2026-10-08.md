# Inscrição simplificada — 08/10/2026
Classificação estrutural por reutilizar integração newsletter. Usuário solicita remover preferência em todas as páginas e colocar subtítulo depois do formulário. Publicação autorizada nesta conversa.

## Revisão prévia pelas oito perspectivas
| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Inscrição para todos os destaques; eliminar escolha; prosseguir. |
| CTO | Componente compartilhado, payload general já aceito; preservar contrato e SSR; prosseguir. |
| IA | Sem prompts ou geração; texto deve refletir cadastro geral; prosseguir. |
| Segurança | Consentimento e honeypot preservados; nenhuma escrita em base existente; prosseguir. |
| UX | Formulário antes do subtítulo no mobile/desktop; reduzir texto repetido; prosseguir. |
| CX | Novos cadastros general; manter inscritos anteriores sem alteração em massa; prosseguir. |
| Growth | Metadata e conteúdo indexável preservados; sem seletor; prosseguir. |
| PMO | Validar componente global, ordem SSR, mobile e gate; rollback por revert e republicação; prosseguir. |

## Decisão
Remover select e estado interest do componente compartilhado; enviar interest general. Na página /newsletter, formulário após H1, subtítulo breve abaixo. Esconder somente introdução repetida do formulário nessa página, mantendo introdução nos rodapés. Atualizar FAQ para refletir inscrição geral. Sem banco, migrations, envio ou alteração de inscritos existentes. Aceite: nenhum seletor de newsletter, formulário antes da descrição, consentimento mantido e validate aprovado. Trade-off: preservar contrato interno general evita alteração backend; preferências de cadastros anteriores não serão sobrescritas.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Novos cadastros sempre general |
| CTO | Pass | Contrato existente, SSR e gate aprovados |
| IA | N/A | Nenhuma geração ou prompt alterado |
| Segurança | Pass | Consentimento e honeypot preservados |
| UX | Pass | 390px sem overflow; formulário e botão inteiros antes do subtítulo; seletor ausente |
| CX | Pass | Componente compartilhado remove escolha em todas as páginas; operação preservada |
| Growth | Pass | Canonical, OG e dados estruturados preservados; texto factual abaixo do formulário |
| PMO | Pass | 2 testes direcionados e pnpm validate (61 testes/typecheck/build); diff --check |

Estado: pronto para publicação autorizada. Risco baixo; sem custo externo adicional ou mudança em dados. Rollback: revert do commit e republicação.
