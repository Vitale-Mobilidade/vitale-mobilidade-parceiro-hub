# Recuperação de bikes editoriais — 13/10/2026

Classificação estrutural: IA/Supabase/integração editorial. Evidência: artigo 878819e4-7710-4662-8323-0419da69e3a4 vazio, revisão 1, título original sem marca; transcrição oficial PqDo-8IdVlM contém OS/O/Ost/Old em lugar de Ouxi. GT20 tem candidatos Ouxi e Coswheel. Editor exige dois trechos para qualquer save e gerador detecta pelo título do vídeo, ignorando título editado.

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Destravar correção antes da geração; preservar escolha; prosseguir. |
| CTO | Save de preparação restrito a draft vazio, lock de revisão e auditoria; sem migration; prosseguir condicionado. |
| IA | Usar título corrigido e transcrição; marca exata antes/depois do modelo; não adivinhar OS=Ouxi; prosseguir. |
| Segurança | Validar IDs, permissão e revisão; não relaxar publicação/QA; prosseguir. |
| UX | Gerar salva edição primeiro; impedir geração com save falho; prosseguir. |
| CX | Mensagem de ambiguidade orienta selecionar/salvar; não exige corpo inexistente; prosseguir. |
| Growth | Artigos públicos e SEO preservados; preparação permanece privada; prosseguir. |
| PMO | Testes offline de save/locks/geração/detecção; validate; rollback base 7a866b2; prosseguir. |

Decisão: salvar título/bikes de rascunho vazio sem inventar corpo, preservar QA/source/capa; gerar após salvar alterações com nova revisão; identificação usa título do artigo e transcrição com marcas explícitas em ambas as ordens. Critérios: save privado vazio funciona, IDs inválidos/concorrência bloqueiam, artigo preenchido continua exigindo corpo, seleção chega ao gerador. Trade-off: não associar sílabas OS/O a uma marca; fonte genuinamente ambígua continua exigindo seleção. Fora de escopo: publicação/geração real e alterações de banco em produção. Rollback restaurar arquivos da base.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Save de preparação funciona sem corpo; gerar salva antes. |
| CTO | Pass | Apenas draft nunca publicado e blocks vazio admite save vazio; eq revision e auditoria preservados. |
| IA | Pass | Título do artigo no detector; marca explícita na transcrição em ambas as ordens; alias genérico não derrota marca explícita. Testes mantêm ambiguidade quando ASR perde marca. |
| Segurança | Pass | IDs desconhecidos recusados antes de update; preparação permanece indexable=false e preserva validation_errors. QA/publicação não relaxados. |
| UX | Pass | Erro orienta seleção/salvamento; gerar usa artigo retornado pelo save e aborta se save falha. |
| CX | Pass | Rascunho original não exige texto artificial nem nova captura; original preservado. |
| Growth | Pass | Nenhuma alteração pública, canonical/metadata ou associação publicada em testes. |
| PMO | Pass | 93 testes direcionados offline; validate exit 0 com typecheck/61 regressões/build; diff check. Base atual origin/main d5d9bf8 integrada localmente antes da validação. |

Estado: somente local, sem push/deploy, geração IA ou mutação produtiva. Commit de implementação 286f7dd; integrado à base atual. Rollback de release: restaurar os arquivos alterados a d5d9bf8 (substitui base inicial 7a866b2). Documentação anterior preserva histórico da decisão. Risco residual: transcrição sem marca distinguível não resolve GT20 automaticamente; requer escolha manual, conforme regra segura. Release exige publicar frontend e implantar editorial-admin; sem migration. Geração real/publicação de artigo não incluídas sem autorização específica.

## Release autorizado e verificação em produção
Usuário autorizou “pode publicar”. Main recebeu 2633b18. Lovable confirmou deploy somente editorial-admin (SHA-256 f2fe7f90d4852633f692e3977faa484072353e004919337560a753bcf904c9a3), sem reimplementação ou migration. Uso do agente de implantação: 0,8 crédito informado pelo conector. Publicação frontend confirmou “Seu site foi atualizado”.
Smoke autenticado no artigo indicado: título corrigido para Ouxi GT20 e seleção V8 Pro, V8 Ultra, Ouxi GT20 salvos com corpo vazio. UI confirmou “Salvo.”. Leitura SQL confirmou revision=2, primary=v8_pro, related=[v8_ultra,ouxi_gt20], blocks=0, status=draft, indexable=false. Nenhuma geração de artigo/capa ou envio de email foi iniciado. Rascunho preparado para geração pelo usuário.
