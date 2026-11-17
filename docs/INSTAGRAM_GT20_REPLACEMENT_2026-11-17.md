# Reposição de três janelas e republicação da GT20 Pro

Mudança estrutural na integração. O proprietário informou que apagou a GT20 Pro das 11h45 e pediu a republicação imediata pela integração do Lovable. O histórico original registra `Df2LPJWF5z4`. A fila tem uma reserva, da V29 Pro às 17h45. A reposição atual limita a três, mas sai no primeiro sucesso de cada execução.

| Perspectiva | Decisão prévia |
| --- | --- |
| Produto | A reposição busca completar três reservas. A republicação é uma exceção autorizada deste post, não um novo modo geral de envio. |
| Arquitetura | Manter cron e RPCs. Buscar uma lista limitada e reservar em ordem até ocupar a capacidade. A ação isolada da GT20 usa o cliente Meta existente. |
| IA | Nenhuma geração paga. Reenquadrar o original já verificado da GT20 e reaproveitar a legenda armazenada. |
| Segurança | Ação de republicação somente para admin e ID, capa e post de origem conhecidos. Uma gravação privada imutável impede tentativa concorrente ou replay. Registrar resultado confirmado em auditoria. |
| UX | Prévia local da arte de ponta a ponta e feedback do total reservado. A ação de republicação aponta para a GT20 removida. |
| Operação | Processar até quatro candidatos por passagem. Retornar quantas vagas foram preenchidas. Se faltar arte apta, indicar a pendência e preservar as reservas existentes. |
| Growth | A nova mídia não altera deduplicação, histórico anterior nem as janelas regulares. |
| QA | Testar enchimento a partir de fila vazia, capacidade parcial, revisão manual e fonte inviável. Validar arte, autenticação e fronteira de envio único. |

Rollback de código pela função e pelo painel anteriores. O registro original, a prova privada de tentativa e o histórico da Meta permanecem. Em caso de resposta incerta da Meta, conferir o perfil e a auditoria antes de qualquer decisão de repetição.

## Revisão posterior

| Perspectiva | Resultado local |
| --- | --- |
| Produto | Pass. A fila com zero ou um reservado tenta completar três no mesmo ciclo. A republicação está restrita à GT20. |
| Arquitetura | Pass. Mantidos cron, RPCs, slots e teto de quatro candidatos. |
| IA | Pass. Render usa o original existente. A legenda usa o texto armazenado. |
| Segurança | Pass. Ação admin restrita, conta Meta validada, objeto imutável como trava e auditoria da tentativa e confirmação. Testes cobrem cliques concorrentes e resposta incerta. |
| UX | Pass. Capa local conferida em 1080 × 1350 e painel informa reservas feitas e pendência de fonte. |
| Operação | Pass. Só cria reservas de fontes aptas, não reenvia slots perdidos e evita repetição da correção. |
| Growth | Pass. Mídia nova usa a pauta pedida. Histórico de envio e regras de deduplicação permanecem. |
| QA | Pass local. 53 testes dirigidos, `pnpm validate` com 69 testes, Deno check e diff verificado. Um teste legado de capa social de podcast falha da mesma forma na base anterior. |

A publicação depende da autorização de integração do commit e deploy de `editorial-admin` e do painel Lovable. Depois da publicação do painel, acionar a republicação uma vez no Admin, verificar auditoria e link, abastecer a fila e consultar quantas reservas foram efetivamente gravadas. A publicação imediata é separada dos três horários programados. Sem migração e sem geração paga. Pode haver custo baixo de deploy no Lovable.
