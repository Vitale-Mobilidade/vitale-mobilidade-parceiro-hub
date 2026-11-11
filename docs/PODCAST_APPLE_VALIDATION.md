# Compatibilidade do RSS com Apple Podcasts

Classificação estrutural: ajusta o contrato público com os diretórios. A Apple rejeitou o RSS com um erro genérico. A [validação oficial](https://podcasters.apple.com/support/829-validate-your-podcast) exige `itunes:explicit` e documenta o namespace `content`. O feed público tinha ambos ausentes; ainda não há prova de que sejam a única causa da rejeição.

| Perspectiva | Impacto e risco | Dependência e decisão |
| --- | --- | --- |
| Produto | Viabilizar a submissão do único piloto; o rótulo deve ser correto. | Titular confirmou que o piloto e a linha editorial não são explícitos. |
| Arquitetura | Alterar apenas o XML, mantendo URLs, GUIDs e MIME. | Seguir a especificação da Apple e verificar saída do servidor. |
| IA | Nenhum efeito em geração ou classificação automatizada. | Não inferir o rótulo por modelo. |
| Segurança | Não expor novos arquivos, dados ou segredos. | Preservar as regras de liberação e o armazenamento privado. |
| UX | A classificação aparece no catálogo; sem alteração no Admin. | Usar o rótulo confirmado pelo titular. |
| Operação | Permite uma nova tentativa de validação. | Agendador permanece desligado; o portal pode continuar com erro. |
| Growth | Compatibilidade adicional sem duplicar episódios. | Preservar os GUIDs, o link e a descrição integral. |
| QA | Verificar namespace, classificação, enclosure do piloto e feed desligado. | Testes de entrega, `pnpm validate` e nova validação Apple após deploy autorizado. |

Decisão: incluir somente o namespace recomendado e o marcador confirmado. Mudanças de CDN, Storage, fila, agenda e metadados dos episódios ficam fora do escopo. A escolha de um marcador no nível do programa reduz o escopo agora; se a linha editorial mudar, será preciso rever a classificação. Se a Apple continuar recusando, investigar a resposta do portal antes de mudar a hospedagem. Para reverter, republicar o commit anterior; nenhum dado ou áudio precisa ser removido.

| Perspectiva | Resultado | Evidência |
| --- | --- | --- |
| Produto | Pass | Classificação confirmada; o piloto continua como única publicação autorizada. |
| Arquitetura | Pass | O XML inclui o namespace e o marcador; URLs, GUIDs e MIME foram preservados. |
| IA | N/A | Nenhum modelo ou regra de classificação automática foi introduzido. |
| Segurança | Pass | O teste do feed fechado passou e as políticas de acesso não foram alteradas. |
| UX | Pass | O feed reflete a classificação acordada sem alterar o Admin. |
| Operação | Pass | A mudança não toca na fila ou no agendador; o procedimento de nova validação está definido. |
| Growth | Pass | O mesmo feed, descrição, link original e MP3 continuam disponíveis. |
| QA | Pass | 3 testes de entrega, `pnpm validate` (67 testes, tipos e build) e `git diff --check`. |

O aceite externo da Apple é pendente e só pode ser avaliado com a versão publicada. O resultado local autoriza propor a correção de compatibilidade, sem afirmar que o catálogo já aceitou o podcast.
