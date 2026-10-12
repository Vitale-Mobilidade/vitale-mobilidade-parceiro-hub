# Thumbnail do vídeo nos artigos — 12/10/2026
Classificação: estrutural por imagem pública/integração YouTube; escopo localizado no player editorial.

## Revisão prévia
| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Usar thumbnail original nítida; nenhuma mudança editorial; prosseguir. |
| CTO | SSR começa em maxresdefault; fallback por erro ou placeholder; helper existente; prosseguir. |
| IA | Sem geração ou substituição por capa IA; N/A à inferência, preservar fonte visual; prosseguir. |
| Segurança | Origem i.ytimg.com fixa, ID validado; sem secrets; prosseguir. |
| UX | Evitar esticar 320x180; preservar play/foco/aspect ratio; prosseguir. |
| CX | Vídeos antigos podem não ter maxres; hqdefault como fallback; prosseguir. |
| Growth | Lazy image e iframe apenas por interação mantidos; maior download limitado ao vídeo; prosseguir. |
| PMO | Smoke SSR e testes direcionados, validate; rollback ArticleView; prosseguir. |

Decisão: priorizar maxresdefault (1280x720 quando disponível), fallback sddefault e hqdefault; detectar erro HTTP e placeholder de 120px. Preservar lazy loading, botão acessível e iframe sob clique. Trade-off: qualidade custa mais bytes no player grande; listas pequenas continuam mqdefault. Fora de escopo: banco, covers IA, conteúdo, outros cards, publicação sem autorização específica. Aceite: SSR usa maxres, player continua clicável e fallback limitado. Rollback: restaurar componente da base 31c7b2b.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Thumbnail original do YouTube priorizada no player grande. |
| CTO | Pass | maxres no SSR; fallback limitado sd/hq por erro ou placeholder; iframe continua sob clique. |
| IA | Pass | Nenhum conteúdo ou imagem gerada por IA alterado. |
| Segurança | Pass | Helper valida ID e origem fixa; sem credenciais ou banco. |
| UX | Pass | Resolução 1280x720, acessibilidade/play/layout preservados. |
| CX | Pass | Fallback para vídeos sem versão maxres; sem reprocessar artigos. |
| Growth | Pass | Lazy load, SSR e metadados preservados; não altera cards menores. |
| PMO | Pass | 8 testes direcionados; pnpm validate exit 0 (61 regressões, typecheck e build); diff check limpo. |

Estado: publicado após autorização explícita do usuário nesta thread (“pode publicar”). Commit de código 08c8d06 sincronizado com Lovable e publicação confirmou “Seu site foi atualizado”. Verificação HTTP em produção no artigo cinco-bikes-eletricas-para-delivery-como-escolher-pela-bateria-e-pela-carga confirmou thumbnail do player https://i.ytimg.com/vi/PMxuUNfd8TM/maxresdefault.jpg com dimensões 1280x720 no HTML SSR. Risco residual: fallback depende das imagens disponíveis no YouTube; teste SSR confirma URL inicial, comportamento de fallback inspecionado no código. Sem custo de IA ou migração.
