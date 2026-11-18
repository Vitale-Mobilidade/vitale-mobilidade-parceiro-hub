# Radar — conciliação dos indicadores

## Classificação e revisão prévia

Estrutural: Radar e contrato de leitura da integração. Não altera schema, filas, dados de clientes ou envios. Correção da apresentação e cálculo do pacote já autorizado em produção nesta conversa.

Diagnóstico confirmado por leitura das duas bases, sem PII: 60 cadastros de alerta, 52 telefones distintos; 60 vínculos locais; 50 pedidos recebidos na Hotpipe. Destes: 17 active, 20 sent, 12 uncertain e 1 failed. Dos 20 sent, 14 têm entrega/leitura confirmada, 5 têm falha de entrega e 1 aguarda recibo. Os 10 pedidos restantes não foram recebidos. Logo: 60 = 17 aguardando preço + 14 entregues + 1 em envio + 28 com pendências. Pendências = 10 sem acompanhamento + 12 para conferência + 1 falha de envio + 5 falhas de entrega. Eventos de outbox não são alertas e não podem ser somados a eles.

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Total de alertas tem divisão completa; pessoas viram contexto | Misturar unidade ou atribuir entrega a aceite | Uma linha por alerta local | Prosseguir com soma explícita e categorias exclusivas |
| CTO | Reconcilia IDs locais e pedido atual | Orfãos, pedidos ausentes ou cadastro concorrente | Leituras restritas e validação de cobertura | Prosseguir sem inferir sucesso; ocultar divisão se leitura incompleta ou total mudou |
| IA | Nenhum prompt ou agente alterado | Reenvio disparado por diagnóstico | Não criar ações de envio | Prosseguir somente leitura |
| Segurança | Consulta adicional apenas id/status/consent | Exportar contatos ou secrets | Auth/no-store existentes | Prosseguir sem PII adicional e sem escrita |
| UX | Total e pessoas separados de estados; falhas na categoria correta | Encobrir pendências ou excesso de KPI | Descrição e soma acessível | Prosseguir com quatro estados principais e encerrados quando presentes |
| CX | Mostra os 28 alertas que exigem revisão | Confundir falha de entrega com aviso entregue | Recibos reais, detalhe de causas | Prosseguir preservando histórico e sem reenvio |
| Growth | Avisado significa entrega confirmada | Inflar alcance | Recibo entregue/lido | Prosseguir sem métrica de compra inventada |
| PMO/QA | Corrigir causa do problema, não só rótulo | Total aparente por subtração | Fixtures 60 alertas, falhas, ausentes, cancelados e indisponibilidade | Prosseguir com testes dirigidos, lint, validate e smoke |

## Decisão consolidada e trade-offs

Mostrar “60 alertas · 52 pessoas” acima dos estados. Cada alerta entra em exatamente um estado: aguardando preço, aviso entregue, em envio, com pendência ou encerrado. Pendência tem quatro causas exclusivas. Pedido sent com recibo failed é pendência; sem recibo é em envio; delivered/read é entregue. Não tratar os 12 envios sem confirmação como sucesso nem como falha definitiva.

Total e estados usam a mesma população de IDs locais, sem contatos. Pedido externo órfão não conta. Cadastro local inativo/sem consentimento ou pedido cancelado entra em encerrados. Exibir encerrados somente quando houver, incluindo-o na soma. Em indisponibilidade, limite excedido ou divergência entre quantidade local e snapshot de métricas, mostrar divisão indisponível, sem saldo estimado por subtração.

Aceite: categorias fecham total; 52 pessoas não entra na soma; 20 aceites não viram 20 entregas; causas explicam todos os pendentes; preservar filtros de data, detalhes, permissões e SSR. Rollback: reverter código para c0a1143 e republicar. Nenhuma migration. Custo: local; publish determinístico Lovable sem geração por créditos. Fora do escopo: reenvio, correção de dados históricos e automações.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Total e pessoas separados; quatro estados exclusivos e soma explícita |
| CTO | Pass | Reconciliação por IDs locais/pedido atual; ausentes contados como pendência; snapshot divergente não é estimado |
| IA | N/A | Nenhuma alteração de agentes, prompts ou ações de envio |
| Segurança | Pass | Consulta adicional apenas id/status/consent; nenhum contato novo no payload de status; permissões/no-store preservados |
| UX | Pass | Prévia local com CSS da build inspecionada: total, contexto de pessoas, quatro cards e equação legível |
| CX | Pass | 28 pendências totalmente explicadas; falha de entrega deixa de contar como pessoa avisada |
| Growth | Pass | Alcance exige recibo entregue/lido; nenhum clique ou compra inferido |
| PMO/QA | Pass | 47 testes dirigidos, lint dos seis arquivos e pnpm validate (69 regressões, TypeScript/build) aprovados |

Trade-off: as consultas locais não são uma transação única; se o total mudar entre as leituras, a divisão fica temporariamente indisponível e solicita atualização. Preferível a fabricar uma categoria por diferença. Limite preexistente de 1000 pedidos mantido também para a população local; excedê-lo não gera contagem parcial aparente.
GO para publicação no Lovable já autorizado. Estado das integrações preservado; nenhuma tentativa automática/manual de reenvio neste ajuste.
