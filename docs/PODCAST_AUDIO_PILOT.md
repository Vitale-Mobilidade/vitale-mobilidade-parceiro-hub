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

O aceite é escolher um vídeo, anexar o MP3, recarregar a ficha e ouvir o áudio como administrador. Uma falha de upload preserva o áudio anterior. O rollback desativa `PODCAST_AUDIO_ENABLED` na Edge Function, mantendo arquivos e vínculos privados para recuperação.

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
| PMO/QA | Pass no escopo local. Lint direcionado, TypeScript do handler, três testes da integração, ensaio SQL, smoke do Admin com arquivo sintético e `pnpm validate` com 66 testes e build. |

## Gate de release

Estado em 09/11/2026. Implementado na branch `codex/podcast-mp3-upload`, baseada no commit operacional `38553b7`. O responsável autorizou a publicação da opção e pediu arrastar e soltar. A leitura de produção confirmou a ausência inicial do bucket e da tabela. Backup diário listado em 09/11 às 04:28:33 UTC e nova exportação solicitada antes da mudança.

Antes do piloto real, conferir folga de créditos e backup restaurável. Após autorização, provisionar no Storage integrado o bucket privado `podcast-audio` com limite de 52.428.800 bytes e apenas `audio/mpeg`. Aplicar a migration, implantar a Edge Function e publicar a versão do Admin. Habilitar `PODCAST_AUDIO_ENABLED=true` após validar bucket, permissões e configuração. O administrador faz o primeiro upload. Conferir reprodução, respostas parciais do Storage e ausência de acesso público. Se houver falha, desabilitar a flag e preservar os objetos privados. Rascunhos não vinculados por falha e versões substituídas devem ser reconciliados antes de ampliar o volume.
