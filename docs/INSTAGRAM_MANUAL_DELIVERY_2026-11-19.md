# Horário editável e envio imediato — 19/11

O proprietário pediu os controles de alterar horário e postar agora, com reposição automática após cada envio. A implantação e publicação da correção foram expressamente autorizadas na mesma conversa. Classificação estrutural por integração e agendamento.

| Perspectiva | Revisão anterior à implementação |
| --- | --- |
| Produto | Oferecer horário manual e publicação imediata nos posts em revisão ou agendados. Após envio confirmado, repor a fila até três. |
| Arquitetura | Reusar o sender atual para o post selecionado, com claim por CAS. Alterar o agendador existente para checagem por minuto, necessária ao horário manual. |
| IA | Reusar a preparação automática limitada a uma geração por execução e seis tentativas por dia. |
| Segurança | Somente admin, revisão exata, sem tentativa anterior ou lease ativo. Verificar elegibilidade, holds e outros writers antes do claim. Timestamps e conflitos de slot validados. |
| UX/UI | Mostrar horário em São Paulo, campo editável e botões separados de salvar horário e postar agora. Indicar envio em andamento e resultado público. |
| Operação | Cada minuto verifica o próximo envio. Claim e marcadores duráveis impedem reenvio simultâneo ou repetição após falha incerta. |
| Growth | Postar imediatamente libera a janela normal e repõe automaticamente a vaga. Horários manuais aparecem no painel. |
| QA | Testar seleção exata, concorrência, publicação, reposição, horário inválido, conflito, pausa e histórico já enviado. Conferir próximo post real e três reservas. |

Decisão: centralizar o envio em uma função compartilhada usada pelo cron e pelo botão. O cron existente passa a checar por minuto e usa o mesmo endpoint privado com HMAC. O segundo job antigo fica inativo, preservado para rollback. Os horários padrão de reservas continuam 6h15, 11h45 e 17h45. Horários manuais são cumpridos a partir do minuto configurado. Sem mudança de schema ou RLS. Backup do cron e da função de dispatch antes da alteração. Rollback restaura o dispatch, as agendas e o código anteriores. Claims Meta e mídia produzida são preservados.

A recuperação de uma janela já perdida foi solicitada pelo responsável e realizada como ação isolada da nova fonte Z8 Pro, com foto inspecionada, reserva por CAS e auditoria. O agendador original restringe o dispatch aos três horários exatos; a solicitação manual assinada reutiliza o mesmo endpoint com segredo permanecendo no banco.

## Evidências e revisão posterior

A publicação de recuperação Z8 Pro foi confirmada pela Meta às 12h40min20s, com [link público](https://www.instagram.com/p/Df7bIKol_J7/). A preparação inicial gerou foto 4:5 e reservou sem intervenção no gerador. Na reposição do worker foi identificado que service_role não pode ler actor_id da tabela privada de credenciais. O gerador do worker passa a identificar um administrador ativo pela tabela de memberships, cuja leitura é permitida. A assinatura continua validada pela função SQL, que mantém as credenciais privadas. Uma tentativa interrompida antes do gerador permanece registrada e não será repetida automaticamente.

| Perspectiva | Resultado local |
| --- | --- |
| Produto | Pass. Controles de horário e postar agora no detalhe dos posts em revisão ou agendados. |
| Arquitetura | Pass. Sender compartilhado entre cron e ação selecionada; reposição em background pelo EdgeRuntime.waitUntil. |
| IA | Pass. Uma nova geração por passagem, cache e teto diário mantidos. A passagem retorna ao reservar a imagem gerada e continua em outro minuto. |
| Segurança | Pass. Testes cobrem revisão, CAS com lease, conflito de horário, hold, dedupe, pausa e envio já tentado. Identidade do worker usa só a tabela permitida. |
| UX | Pass local. Campo datetime-local com rótulo São Paulo e feedback de envio, erro ou novo horário. A lista se atualiza enquanto a fila é preparada. |
| Operação | Pass local. Reposição inicia após confirmação da Meta; UI retorna com link enquanto a capa seguinte é preparada. Job antigo redundante fica inativo. |
| Growth | Pass. Reservas padrão e deduplicação mantidas; horário manual é explícito. |
| QA | Pass local. 66 testes direcionados, Deno check e pnpm validate (69 regressões, tipos e build). A publicação de recuperação foi confirmada e a foto inspecionada. |

Backup específico da configuração do cron e definição do dispatch em /tmp/vitale-1119-cron-backup.json. A mudança de cron será aplicada pelo mecanismo oficial de migrations do Lovable depois da Edge atualizada. A API do botão exige admin, e ações sem sessão devem continuar retornando 403. Reversão restaura o SQL, configurações e versões anteriores. A referência oficial do trabalho em background é [Supabase Background Tasks](https://supabase.com/docs/guides/functions/background-tasks).

GO para o escopo já autorizado. Validação final de produção deve conferir os dois botões no domínio oficial, três reservas de mídia válida, execução por minuto e a reprogramação de uma reserva com preservação de ID, imagem e legenda.
