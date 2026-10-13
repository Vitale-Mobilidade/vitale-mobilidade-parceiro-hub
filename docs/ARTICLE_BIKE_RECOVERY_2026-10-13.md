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
