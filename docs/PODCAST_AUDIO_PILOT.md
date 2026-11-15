# Anexar MP3 na Biblioteca de vídeos

## Decisão antes da implementação

Classificação estrutural. O primeiro corte adiciona upload manual, substituição e prévia privada por vídeo no Admin do projeto Lovable existente. A pessoa administradora escolhe o arquivo. O piloto depende de um bucket privado e da folga de armazenamento do projeto. Agendamento, RSS, cadastro nos diretórios e importação em lote são as próximas etapas.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Associar um áudio a um vídeo escolhido. Avançar com um arquivo de teste antes de levar o acervo. |
| Arquitetura | Usar o ID do YouTube existente, upload direto ao Storage e confirmação no banco. Um envio antigo não pode sobrescrever um mais recente. |
| IA | Fora do escopo. O conteúdo é fornecido por quem administra os vídeos. |
| Segurança | Exigir papel de administrador, bucket privado, limites de MIME e tamanho, confirmação de MP3 e prévia assinada. Verificar permissões antes de liberar. |
| UX/UI | Colocar a ação na ficha do vídeo com área para arrastar e soltar e seletor nativo de arquivo. Exibir seleção, andamento, resultado, falha e prévia. |
| Operação | Começar com um envio e acompanhar o consumo. Manter o último arquivo válido disponível durante a substituição. |
| Growth | Fora deste corte. Nenhum feed ou player público é criado. |
| PMO/QA | Testar permissões, arquivo inválido e reenvio localmente. Antes de ativar no Lovable, validar backup e prévia com um MP3 autorizado. |

O piloto usa upload direto de até 50 MiB. A transferência retomável fica para a importação em lote. Objetos substituídos ficam privados para recuperação. Revisar armazenamento e descarte antes de importar o acervo.

O aceite é escolher um vídeo, anexar o MP3, recarregar a ficha e ouvir o áudio como administrador. Uma falha de upload preserva o áudio anterior. O rollback desativa `podcast_audio_settings.enabled`, mantendo arquivos e vínculos privados para recuperação.

## Revisão após a implementação local

| Perspectiva | Resultado e evidência |
| --- | --- |
| Produto | Pass. O administrador seleciona um vídeo e escolhe seu próprio arquivo. O envio funciona sem uma conta em diretório. |
| Arquitetura | Pass. O Admin usa a API editorial existente. A migração local confirmou que uma confirmação antiga não troca o anexo atual e que repetir a confirmação preserva os dados. |
| IA | N/A. Nenhuma geração ou análise com IA. |
| Segurança | Pass no escopo local. Testes de papel, assinatura de MP3, objeto ausente e RLS em PostgreSQL descartável. O teste de rede real com Storage fica no gate de release. |
| UX/UI | Pass. No Admin local com dados simulados, o upload aceitou um MP3 arrastado e recusou a seleção múltipla. O piloto inicial verificou a prévia e a permanência do vínculo após recarregar a ficha. |
| Operação | Pass no escopo local. Upload separado do salvamento de transcrição e vínculo mantido ao falhar. O bucket e o consumo serão conferidos antes do piloto real. |
| Growth | N/A. Sem superfície pública ou distribuição neste corte. |
| PMO/QA | Pass no escopo local. Lint direcionado, TypeScript do handler, quatro testes da integração, ensaio SQL, smoke do Admin com arquivo sintético e `pnpm validate` com 66 testes e build. |

## Gate de release

### Ordem dos campos no Admin

Ajuste pequeno e reversível. O responsável confirmou o primeiro envio no Admin e pediu acesso ao áudio sem percorrer a ficha. Produto, UX e Operação aprovam mostrar o bloco logo após o ID do YouTube, antes do artigo e da transcrição. Arquitetura e QA limitam a mudança à ordem dos elementos no formulário, com a mesma chave e condição de acesso. IA, Segurança e Growth são N/A porque o ajuste não altera geração, permissões nem páginas públicas. O rollback é a volta do bloco à posição anterior.

Revisão local concluída. Produto, UX e Operação conferiram o acesso direto ao bloco na ficha. Arquitetura conferiu a condição de acesso e o vínculo por vídeo. QA validou a ordem no navegador e executou `pnpm validate` com 66 testes e build.

### Contingência de provisionamento

O comando de criação de bucket do Lovable não oferece a lista de tipos MIME. O Admin cria o bucket pela API de Storage na primeira solicitação de upload feita por um administrador, usando o mesmo limite e mantendo o bucket privado. A migration instala primeiro a política restritiva. A ativação fica em uma configuração privada do banco que começa desligada e permite rollback sem editar segredos. O Admin recusa emitir URLs se o bucket existente estiver fora da configuração esperada.

O impacto para Produto e UX é manter a mesma ação de anexar. Arquitetura e Segurança exigem criação idempotente pela API e recusa de configuração divergente. Operação ativa pelo banco após backup. PMO e QA verificam o primeiro envio e a recusa de bucket incompatível. IA e Growth seguem fora deste corte.

Estado em 09/11/2026. Implementado na branch `codex/podcast-mp3-upload`, baseada no commit operacional `38553b7`. O responsável autorizou a publicação da opção e pediu arrastar e soltar. A leitura de produção confirmou a ausência inicial do bucket e da tabela. Backup diário listado em 09/11 às 04:28:33 UTC e nova exportação solicitada antes da mudança.

Antes do piloto real, conferir a folga de créditos e o backup restaurável. Aplicar a migration com o recurso desligado, implantar a Edge Function e publicar a versão do Admin. Verificar os privilégios e habilitar `podcast_audio_settings.enabled`. A primeira solicitação de um administrador provisiona no Storage integrado o bucket privado `podcast-audio`, com limite de 52.428.800 bytes e apenas `audio/mpeg`. O administrador escolhe o primeiro áudio e faz o upload. Conferir reprodução, respostas parciais do Storage e ausência de acesso público. Se houver falha, desabilitar a flag e preservar os objetos privados. Rascunhos não vinculados por falha e versões substituídas devem ser reconciliados antes de ampliar o volume.

## Filtro Sem áudio no Admin

### Revisão pré-implementação

Classificação estrutural por acrescentar uma leitura de metadados do Supabase. O objetivo é identificar na Biblioteca de vídeos os itens que aguardam anexo de MP3.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto e Estratégia | Facilita completar o acervo. Usar o vínculo do MP3 como critério para incluir também vídeos sem artigo publicado. |
| CTO e Arquitetura | Consultar os IDs em `podcast_video_audio` pela Edge Function existente. Paginar para evitar falsos pendentes em caso de truncamento. Ler sob demanda para preservar a carga dos outros filtros. |
| IA e Agent Engineering | N/A. O filtro consulta metadados determinísticos. |
| Segurança | Restringir ação ao papel Admin e retornar somente IDs de YouTube. Aplicar a autorização antes da leitura. |
| UX/UI | Usar o seletor atual e combinar com a busca. Distinguir consulta em andamento, falha e lista vazia. Manter a ficha selecionada para exibir a confirmação do anexo. |
| CX e Operação | Atualizar a lista após o envio manual, a importação do WorkDrive ou o preparo pela fila. Uma busca do WorkDrive pode detectar um MP3 antes da confirmação do vínculo. |
| Growth e CRO | N/A. Escopo restrito à biblioteca privada. |
| PMO e QA | Verificar presença e ausência de vínculo, falha de leitura e atualização após anexar. Validar o frontend e a ação da Edge Function. |

A consulta é separada do carregamento editorial para que falhas na verificação de áudio afetem somente este filtro. A ausência de um ID só conta como pendência após uma leitura bem-sucedida. O filtro reutiliza a busca, a lista e a ficha atuais. O uso do WorkDrive e o preparo da fila mantêm os fluxos existentes. O rollback é reverter o diff do frontend e da Edge Function. A publicação depende da disponibilidade da ação na Edge Function antes da interface e de autorização explícita.

### Revisão pós-implementação

| Perspectiva | Resultado e evidência |
| --- | --- |
| Produto e Estratégia | Pass. O filtro mostrou os pendentes, incluindo vídeo presente apenas no catálogo. |
| CTO e Arquitetura | Pass. Consulta sob demanda na ação administrativa. Ensaio com banco simulado recuperou 1.001 IDs em três páginas e recusou resposta parcial quando uma leitura falhou. |
| IA e Agent Engineering | N/A. Sem uso de IA. |
| Segurança | Pass. O ensaio retornou 403 para o perfil editorial antes de consultar a tabela. A resposta contém apenas IDs de YouTube. |
| UX/UI | Pass. Chrome local em desktop e mobile validou seletor, busca, lista vazia e erro. A ficha ficou aberta ao confirmar o anexo. |
| CX e Operação | Pass. Upload manual e importação do WorkDrive com dados simulados removeram o vídeo da lista após a confirmação. O preparo pelo painel invalida a mesma consulta. |
| Growth e CRO | N/A. Sem mudança nas superfícies públicas ou na distribuição. |
| PMO e QA | Pass no escopo local. `pnpm validate` passou com 69 testes, typecheck e build. Nove testes direcionados passaram. O lint ainda reporta formatação e avisos preexistentes nos arquivos alterados. |

Sem divergência material na revisão. A lista representa o vínculo registrado e pode ficar desatualizada durante a consulta de atualização. Implementação pronta em branch local. O release depende de autorização, conferência da versão em produção e publicação da ação de leitura antes da interface. A confirmação no ambiente publicado deve usar apenas a consulta e os anexos existentes.
