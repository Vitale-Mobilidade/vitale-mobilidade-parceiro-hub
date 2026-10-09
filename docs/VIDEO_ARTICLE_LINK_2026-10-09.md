# Artigo relacionado no painel de vídeos

Classificação: relevante. Interface administrativa perceptível; reutiliza o workspace e vínculos existentes, sem alterar integração, banco, SEO ou rotas públicas.

## Revisão prévia

| Perspectiva | Impacto, risco e dependência | Recomendação |
| --- | --- | --- |
| Produto | Localizar o artigo do vídeo; depende de video_id existente. | Prosseguir sem inferir vínculo por título. |
| CTO | Reutilizar articles do workspace; evitar chamadas adicionais. | Prosseguir com componente localizado. |
| IA | Nenhum prompt, geração ou contexto alterado. | N/A. |
| Segurança | Clipboard pode ser negado; URLs devem permanecer internas ao domínio oficial. | Prosseguir com feedback e seleção manual. |
| UX/UI | Título, status, URL selecionável e ações; risco de copiar rascunho como público. | Link público somente para published com slug. |
| CX | Reduz procura manual; ausência de vínculo precisa ser explícita. | Prosseguir. |
| Growth | Facilita distribuição; não altera canonical ou indexação. | Prosseguir com URL oficial. |
| PMO/QA | Mudança reversível; verificar publicado, rascunho e ausência. | Teste direcionado e pnpm validate. |

## Decisão consolidada

Escopo: título do artigo na lista; cartão do artigo selecionado com título, status, editor e URL pública copiável. Dependência: dados existentes do workspace. Aceite: publicado com slug tem URL absoluta; rascunho/arquivado não oferecem link público; ausência explica estado; falha de clipboard permite cópia manual. Fora de escopo: publicar, gerar artigos, mudar vínculos, migrações ou chamadas externas. Rollback: reverter componente e inclusão no painel.

Trade-off: copiar apenas artigos publicados restringe compartilhamento de rascunhos, mas evita entregar URLs sem página pública. Nenhum conflito material identificado nesta análise por perspectivas.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Relação por video_id existente; título na lista e cartão no editor. |
| CTO | Pass | Nenhuma nova chamada ou contrato; typecheck e build aprovados. |
| IA | N/A | Nenhuma geração ou contexto alterado. |
| Segurança | Pass | URL com origem fixa e slug codificado; clipboard somente ao clicar; fallback manual. |
| UX/UI | Pass | Input somente leitura selecionável, botão sem submissão, feedback aria-live; inspeção de markup. |
| CX | Pass | Estados sem artigo e sem URL explicados; acesso ao editor preservado. |
| Growth | Pass | URL oficial apenas para publicado; SSR público e metadata intactos. |
| PMO/QA | Pass | 4 testes direcionados; pnpm validate passou (61 testes, typecheck e build); diff check aprovado. |

Estado: implementação local preparada no checkout do repositório sincronizado, ainda não publicada. Revisão visual no ambiente autenticado e teste de clipboard no navegador pendentes para publicação. Avisos preexistentes de depreciação no build não bloqueiam compilação. Sem custo externo. Alteração preexistente em EDITORIAL_COST_REVIEW_2026-10-09.md preservada e fora do escopo. Rollback: remover VideoRelatedArticle e suas três inclusões em AdminEditorial.tsx. Publicação exige autorização específica conforme EXECUTION_GUARDRAILS.md §1 e §13.
