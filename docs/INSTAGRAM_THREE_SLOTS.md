# Fila contínua de três janelas
Mudança estrutural. Produto: até três reservas futuras, uma por janela, fontes elegíveis inéditas; nenhuma publicação imediata. Arquitetura: alterar somente as funções de fila, preservar tabela, cron, histórico, piloto e lease; repor a fila após envio confirmado e permitir abastecimento agora. IA: reaproveitar legenda grounded sem gasto de IA. Segurança: manter autorização admin, assinatura, deduplicação e contenção de envios incertos. UX: foto original inteira com extensão suave nas áreas vazias quando não há recorte aprovado; mantém tipografia, dimensões e legibilidade. Operação: 06:15, 11:45 e 17:45 São Paulo, não inventar postagem sem fonte. Growth: não republicar histórico nem publicar OUXI em revisão. QA: ensaio SQL de três reservas simultâneas e bloqueio de quarta, testes de geometria e validação. Rollback: pausar flag existente e restaurar funções por nova migration, sem alterar registros publicados.

Evidência de produção antes da mudança: Mobylette já agendada para 14/11 às 06:15. V9 Max à noite e V29 Pro são as duas próximas na ordem, ambas com original, artigo e transcrição. Não houve mudança nos posts nem publicação ao preparar este incremento.

Revisão posterior local: Produto Pass (limite e preenchimento crescente); Arquitetura Pass (somente duas RPCs substituídas, sem reescrita de 0016 ou cron adicional); IA Pass (evidência e rodapé preservados); Segurança Pass (RPCs preservam grants, gates e deduplicação); UX Pass local (geometria mantém foto completa, painel permite abastecer a fila); Operação Pass local (três posições, quarta rejeitada); Growth Pass (preserva hold e histórico); QA Pass local (24 dirigidos, 69 regressões, build e ensaio PostgreSQL). Release ainda requer migração oficial, deploy da Edge, publicação web e confirmação das reservas no Admin. Sem novas chamadas de IA ou posts de teste.

## Reposição quando a fonte precisa de trabalho editorial

A reposição automática tenta até quatro fontes em ordem. Capa original ausente, enquadramento incompatível ou evidência insuficiente inviabilizam uma fonte; a próxima mantém o preenchimento da fila. A fonte omitida volta a concorrer assim que for corrigida. Falhas de leitura, gravação e reserva param a execução e evitam que indisponibilidade temporária seja interpretada como ausência de material. As exclusões por histórico e revisão permanecem na seleção e nas RPCs. O histórico do worker registra a fonte omitida e o motivo, sem divulgar o conteúdo.

Classificação estrutural pelo uso do worker integrado ao Supabase. A decisão foi manter a prioridade por data entre fontes aptas e limitar a quatro tentativas por execução. O limite protege o tempo do worker e pode deixar a fila incompleta quando todas as fontes examinadas exigirem revisão. Corrigir o material faz a fonte voltar a concorrer.

| Perspectiva | Status | Verificação |
| --- | --- | --- |
| Produto | Pass | O worker mantém os três horários e reaproveita a próxima fonte apta. |
| Arquitetura | Pass | Busca limitada, com as mesmas RPCs para preparar e reservar. |
| IA editorial | Pass | A geração usa as validações existentes de capa e legenda. |
| Segurança | Pass | Permissões, storage privado, locks e deduplicação continuam na mesma fronteira. |
| UX | Pass | O Admin recebe o aviso quando nenhuma das fontes examinadas está apta. |
| Operação | Pass | Falha de storage mantém a prioridade. A falta de original passa à próxima fonte. |
| Growth | Pass | A publicação mantém o histórico e respeita as retenções editoriais. |
| QA | Pass | Três testes verificam avanço, aviso e falha temporária. O gate do projeto também passou. |

Rollback: reimplante somente a função editorial-admin da versão anterior. As reservas já gravadas permanecem no banco.
