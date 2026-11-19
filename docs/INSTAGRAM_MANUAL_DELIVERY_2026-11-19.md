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

## Validação produtiva e fechamento

Autorização de implantação e publicação reiterada pelo proprietário nesta conversa. Código f5ebdb2 e 1c590ee implantado em editorial-admin; migração oficial registrada em 2b9efc6. Hub publicado pelo Lovable (deployment 2ffb06f4-832c-447f-8a69-07c16a17f86b). Botões Postar agora e Alterar horário presentes no domínio oficial. Ambas as novas ações retornam 403 sem sessão. Job 13 ativo a cada minuto, job 14 antigo inativo, com execuções recentes concluídas.

Três reservas criadas pelo worker sem clique de geração: V9 Max (b4333019-b797-49e7-a6d8-e27f11dc11f8), 19/11 às 17h45; OUXI V8 Ultra S (90ea0f9a-c2e9-46a7-9693-d04a386ca066), 20/11 às 6h15; V29 Pro ou V20 Ultra (fa3b1344-4629-4d56-8078-0f4a52f15afa), 20/11 às 11h45. Horários de São Paulo. Teste real do formulário alterou OUXI para 6h16 e depois restaurou 6h15, com feedback e leitura do banco. A terceira reserva foi colocada em 11h45 pelo mesmo controle. Nenhuma nova publicação pública apenas para testar o botão: o sender comum foi testado localmente e a publicação real de recuperação já foi confirmada acima.

Durante o teste foi observada a troca do detalhe padrão quando chega uma nova reserva. Correção pequena dentro do escopo de UX: focar qualquer controle do detalhe fixa o ID selecionado, impedindo que o refetch troque o post durante edição. Produto/UX/Operação recomendam preservar a seleção; Arquitetura mantém estado local existente; Segurança/IA/Growth sem mudança de contratos, permissões ou conteúdo; QA exige validação de tipos/build e smoke. Decisão: handler onFocus no detalhe, reversível por retirada de uma linha, sem custo de geração adicional.

Revisão final das oito perspectivas: Produto Pass (duas ações e fila de três); Arquitetura Pass (sender e cron únicos); IA Pass (cache, limite e preparo nativo ativos); Segurança Pass (403, CAS e credenciais privadas preservados); UX Pass (salvar horário confirmado e seleção fixada); Operação Pass (execuções por minuto e três reservas automáticas); Growth Pass (horários padrão restaurados); QA Pass (66 testes direcionados anteriores e novo pnpm validate: 69 regressões, tipos e build). Risco residual: indisponibilidade externa ou teto diário pode interromper novo preparo, com motivo no painel; tentativa incerta não é repetida automaticamente. Não há garantia de ausência de falhas futuras de terceiros.
