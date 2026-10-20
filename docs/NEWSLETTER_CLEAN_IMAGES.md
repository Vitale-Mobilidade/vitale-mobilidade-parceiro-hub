# Newsletter: capas sem título (#6+)

Classificação estrutural por leitura do Supabase. Autorização de publicação: responsável nesta conversa em 20/10/2026.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Remover duplicação somente no e-mail #6+; preservar #5; prosseguir. |
| CTO | Reutilizar compositor e base existente; endpoint somente leitura, cache; prosseguir com limite de bytes e validação de caminho. |
| IA | Sem geração ou prompt novo; base existente; prosseguir sem custo de modelo. |
| Segurança | Servir apenas derivados de artigos publicados; nunca expor captura, path ou credencial; validar UUID/caminho; prosseguir condicionado. |
| UX/UI | Marca no topo e título no HTML; remover gradiente de leitura sem título; conferir imagem local. |
| CX | Não reescrever campanhas existentes; indisponibilidade da base omite a imagem do artigo, mantendo título e conteúdo; prosseguir. |
| Growth | Site/OG, vídeos e links preservados; prosseguir. |
| PMO/QA | Testes de composição e acesso, validate, publicação autorizada; prosseguir após gates. |

Decisão: endpoint público restrito para derivado sem título, selecionado somente em nova preparação #6+. Sem migrations, escrita produtiva ou chamadas de IA. Descoberta: alguns artigos antigos não possuem base. Decisão revisada de CX/Produto/CTO/UX: omitir apenas sua imagem no e-mail; preservar conteúdo e envio, sem retornar à capa com título. Trade-off: esses blocos terão título e texto sem imagem. Rollback: reverter commit e republicar. Campanhas existentes não são regravadas.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Seleção nova somente #6+; nenhum update de campanha. |
| CTO | Pass | Build e typecheck; compositor padrão preservado; rota server-only e cache HTTP. |
| IA | Pass | Nenhum modelo chamado; composição determinística da base existente. |
| Segurança | Pass | Testes de UUID, caminho, MIME e filtro published; resposta só JPEG; credenciais no servidor. |
| UX/UI | Pass | JPEG 1280×720 inspecionado localmente: apenas marca superior, sem gradiente de título. HTML e alt existentes preservados. |
| CX | Pass | Ausência de base omite somente imagem; sem regenerar #5 ou enviar e-mails. |
| Growth | Pass | Nenhuma alteração de URL de destino, OG ou thumbnail de vídeo. |
| PMO/QA | Pass | Testes direcionados de composição/imagens/endpoint e pnpm validate passaram. Rollback por reversão deste commit e republicação. |

Validação: 13 testes direcionados; `pnpm validate` (TypeScript, regressões de rotas/Quiz/Radar e build). Nenhuma migration ou chamada paga. Consulta somente leitura confirmou bases PNG existentes e a exceção de artigos antigos sem base. Risco residual: cache pode manter a imagem até 24h; indisponibilidade transitória na preparação omite imagem. Publicação autorizada, smoke em produção pendente no momento deste registro.
