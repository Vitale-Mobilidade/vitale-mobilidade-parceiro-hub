# Preparar a bike antes de concluir o cadastro

Mudança estrutural: a conta autenticada pode preparar um anúncio privado antes de concluir o perfil; cadastro e verificação continuam obrigatórios para pagamento e publicação.

| Perspectiva | Impacto, risco e decisão prévia |
| --- | --- |
| Produto | Mostrar R$50 antes do editor; pedir apenas no final o que falta para publicar. |
| CTO | Reusar as operações de rascunho e as regras de limite existentes. Retorno explícito pelo ID do anúncio já salvo. |
| IA | N/A: nenhuma alteração editorial ou de agente. |
| Segurança | Abrir somente operações de rascunho individual para sessão identificada, ativa e não suspensa. Storage continua privado, restringido ao dono e a reservas existentes. Não conceder adesão implícita nem mudar os gates de cobrança/publicação. |
| UX | Passos de fotos e dados sem bloqueio de perfil. No final, CTA específico para cadastro ou validação e retorno à mesma bike. |
| CX | Não altera pagamentos anteriores, avisos, newsletter ou Admin. A página de erro antiga não permite medir tentativas. |
| Growth | Menos atrito antes da etapa de intenção de pagar; preço e período inalterados. |
| PMO | Testar conta incompleta, isolamento entre contas, mídia privada, retorno e bloqueio financeiro; restaurar funções e frontend sem apagar rascunhos. |

Decisão: aceitar apenas a preparação privada com o perfil incompleto; sem sessão ainda se pede login para vincular o rascunho a um dono. Não usar perfil fictício, não inscrever automaticamente como efeito de preparar a bike, não expor mídia ou permitir publicar e pagar sem cumprir os requisitos. A permissão global e suspensão continuam respeitadas. O rollback restaura as funções anteriores; rascunhos permanecem gravados.

## Revisão após implementação

| Perspectiva | Resultado | Evidência |
| --- | --- | --- |
| Produto | Pass | Oferta de R$50, rascunho primeiro, cadastro e validação antes do pagamento. |
| CTO | Pass | Reusa RPC de rascunho e Storage; retorno ao ID somente quando pertence ao usuário. |
| IA | N/A | Não afetada. |
| Segurança | Pass | Sessão não anônima e não suspensa, acesso de foto por reserva e dono; testado contra outra conta, visitante, cobrança e publicação prematuras. |
| UX | Pass | Teste no navegador com foto, ficha, conclusão, dois códigos, retorno automático à mesma bike e botão de R$50. |
| CX | Pass | Nem cadastro, consentimento, publicação, cobrança ou mensagens reais foram gerados pelo teste. |
| Growth | Pass | O preço continua explícito e o preenchimento acontece antes da etapa de perfil. |
| PMO | Pass | Lint, banco descartável com rollback, jornada simulada e pnpm validate. |

Consultas produtivas de 14/11 às 11h35 (São Paulo): 3 contas ativas ainda não aderiram à comunidade; nenhum anúncio individual criado a partir de 06/11 e nenhum novo pedido de R$50 até a consulta. Sem medição de tentativas daquele erro, esses dados não demonstram que as 3 contas tentaram publicar.
