# Capas independentes — 15/11/2026

Mudança estrutural de geração de imagem, Studio editorial e integração de podcast. A geração automática do artigo, implantada em 15/11 às 12h10 (São Paulo), solicitava o mesmo original 4:5 usado para Instagram. O compositor 16:9 então recortava a altura. A leitura do Storage e do checkpoint identificou o artigo Keepvital Y6, original gravado às 12h14 e artigo publicado às 12h36. A auditoria por data encontrou somente esse checkpoint no intervalo; não constitui verificação visual de todo o acervo.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Artigo, Instagram e podcast ganham enquadramentos próprios. Separar geração e aplicação em cada canal. |
| CTO | Usar a mesma infraestrutura Lovable com finalidade explícita, renderizadores nativos e caminhos de Storage distintos. Sem nova tabela, cron ou mudança em URLs de artigo. |
| IA | Pedir 16:9, 4:5 e 1:1 separadamente, com referências de produto confiáveis. Proibir conteúdo enquadrado para outro formato e rejeitar proporções fora do alvo. |
| Segurança | As ações com IA usam as permissões editoriais existentes; podcast aplica só JPEG quadrado validado, com revisão do artigo no pedido. Nenhum bucket ou permissão muda. |
| UX | Usar legenda e design de cada canal, com prévia antes de salvar a arte quadrada ou agendar o rascunho de Instagram. Identificar o download como sendo do podcast. |
| CX | Manter o cron do Instagram enviando a fila agendada. Novas artes geradas são revisadas no Admin antes da reserva; enquanto não há capa quadrada, RSS mantém sua reserva e tem fallback da marca. |
| Growth | Preservar os posts, episódios, arquivos e URLs já criados. Priorizar versão quadrada publicada pelo operador, depois JPEG quadrado já preparado; sem recortar capa nova do artigo. |
| PMO/QA | Verificar as três proporções, isolamento e compatibilidade de históricos. Separar o deploy de restauração urgente do reprocessamento do Y6 e de eventual IA automática adicional. |

Decisão: restaurar o artigo em 16:9 no fluxo automático e manual. O Instagram prepara fotos 4:5 próprias em ação deliberada no Admin, usa os caminhos e fingerprints próprios e continua enviando nos horários existentes. A nova capa do podcast é produzida e publicada separadamente pelo editor, usando original 1:1. Episódios com arte anterior conservam seus JPEGs quadrados salvos, e novos episódios com arte pendente usam uma composição tipográfica quadrada da marca. Nenhum fluxo de cron ganha chamadas pagas adicionais. Preservar endpoints, versões e caminhos históricos. Rollback pela reversão dos arquivos e restauração das Edge Functions; a arte do Y6 pode ser refeita individualmente quando autorizado.

## Verificação local

| Perspectiva | Resultado e evidência |
| --- | --- |
| Produto | Pass. Os modos de geração e os controles são distintos por destino. O envio automático continua operando sobre reservas explícitas. |
| CTO | Pass. Testes do novo renderer recusam o original de 4:5 no artigo e no podcast e validam JPEGs 1280 × 720, 1080 × 1350 e 1400 × 1400. Nenhuma migração. |
| IA | Pass local. Payloads pedem as proporções independentemente e reaproveitam referências de catálogo. A confirmação visual do Y6 depende de geração real no Lovable. |
| Segurança | Pass. Original do artigo não é lido pela preparação de novo Instagram nem durante entrega da arte quadrada do podcast. A geração e aplicação da arte quadrada exigem admin, revisão atual e JPEG validado. |
| UX | Pass local. Ação dedicada à capa quadrada e prévia antes de salvar. Rascunho de Instagram segue aprovação explícita. |
| CX | Pass com mudança explícita de operação. Criar uma nova arte de Instagram requer ação no Admin. Sem uma capa independente do podcast, usa-se a anterior preparada ou a marca. |
| Growth | Pass. Mesmo cron e reservas do Instagram, mesmos caminhos públicos e feed de áudio. A arte quadrada continua acessível se o artigo trocar de capa. |
| QA | Pass local. 60 testes direcionados, pnpm validate (69 testes, tipos e build), Deno check de editorial-admin e bike-image e diff limpo. |

Antes de produção: autorização específica para implantar Edge e frontend. Depois, gerar e revisar separadamente a capa horizontal do Keepvital Y6 pelo Lovable. Usar uma geração inicial para o Y6 e confirmar visualmente antes de aplicar. O arquivo anterior e o registro de revisão dão rollback para a capa. Nenhum post, artigo, podcast ou crédito de geração foi alterado por esta etapa local.
