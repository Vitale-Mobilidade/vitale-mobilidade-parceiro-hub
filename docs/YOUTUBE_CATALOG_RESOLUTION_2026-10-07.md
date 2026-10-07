# Resolução do catálogo editorial — 07/10/2026

## Diagnóstico
O vídeo mJeIFZ_B2uY informa `S20 Pro, V20 Max`. Ambas existem em `bikes`, mas o parser editorial só consultava aliases estáticos. A importação ocorreu com associações vazias e a geração foi bloqueada antes da transcrição/IA. A data 07/10/2027 não causou esse bloqueio.

## Governança prévia
Classificação estrutural: Google Sheets, Supabase e automação editorial.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Recuperar o fluxo diário sem operação por artigo; prosseguir preservando publicação automática. |
| CTO | Consultar nomes/IDs canônicos para tokens não resolvidos; evitar correspondência parcial e falhar se consulta falhar. |
| IA | Apenas associação de entidade; preservar transcrição integral, prompt e QA. Prosseguir sem inventar modelos. |
| Segurança | Leitura server-side do catálogo; nenhum segredo ou RLS alterado. Prosseguir. |
| UX | Manter erro de conferência para termos realmente desconhecidos. Nenhuma mudança visual necessária. |
| CX | Bikes novas não devem depender de atualização manual de código. Usar o catálogo sincronizado. |
| Growth | Preservar variantes e links corretos; não associar modelos por substring. |
| PMO | Testar novos modelos, ambiguidade e desconhecidos; validar build e observar cron real. |

Decisão: resolver apenas tokens pendentes por igualdade normalizada com nome ou ID do catálogo atual; ambiguidades permanecem pendentes. Aplicar em reconciliação e geração. Não alterar planilha, artigos existentes ou cron. Rollback: reverter o commit da função. Critério: vídeo reconhecido com os dois IDs e processado pelo trabalhador habitual, sem chamada manual de geração/publicação.

## Revisão posterior local
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Correção no fluxo integrado existente, sem operação manual por artigo. |
| CTO | Pass | Mesma leitura canônica usada pela reconciliação e geração; sem schema novo. |
| IA | Pass | Prompt, transcrição, capa e QA intactos; geração rejeita bikes desconhecidas antes de custo. |
| Segurança | Pass | Leitura autenticada server-side; nenhuma mudança de segredo/RLS. |
| UX | Pass | Mensagem de conferência preservada para erros reais. |
| CX | Pass | Modelos cadastrados reconhecidos sem novo alias estático; primeira bike preservada. |
| Growth | Pass | Igualdade exata, sem mistura de variantes ou alteração de links. |
| PMO | Pass | 80 testes editoriais; pnpm validate com 59 regressões, typecheck e build passou. |

Conflito: operação automática versus associação incorreta. Decisão: consultar catálogo e manter bloqueio em ambiguidades; sem fallback aproximado. Validação produtiva permanece pendente até implantação e execução habitual do cron.
