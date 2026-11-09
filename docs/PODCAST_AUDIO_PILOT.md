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
