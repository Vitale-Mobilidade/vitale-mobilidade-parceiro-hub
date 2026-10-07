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

## Evidência produtiva final
- Implantação exclusiva editorial-admin: Deno check aprovado, Lovable 0,8 crédito; commit 96bca22, integrado em f3f1fba.
- Atualização automática de dependência feita pelo ambiente Lovable foi revertida em e8d5690, preservando as versões anteriores; alterações independentes do usuário no Code Editor foram preservadas.
- Sem chamada manual de geração, dispatch, publicação ou alteração de dados/cron.
- Cron reconheceu `s20_pro` + `v20_max`, registrou 07/10/2026 (corrigida pelo usuário) e capturou 8.742 caracteres da transcrição.
- Artigo 0f2d9ce3-80a4-413b-b18e-8919bdbdb3aa: texto → capa → composição → QA → publicado às 15:16:11 BRT. Fonte em estado done; QA automatic-publication-v5 pass=true, issues=[], diversidade94, corpus115 publicados.
- Título: Zurbe S20 Pro ou Zurbe V20 Max: banco, aro e bagageiro definem a escolha.
- URL: https://vitalemobilidade.com/conteudos/zurbe-s20-pro-ou-zurbe-v20-max-banco-aro-e-bagageiro-definem-a-escolha
- Revisão posterior das oito perspectivas: Pass, confirmada pela execução produtiva integral. Risco residual: nomes inexistentes ou ambíguos continuam corretamente bloqueados antes da geração.
