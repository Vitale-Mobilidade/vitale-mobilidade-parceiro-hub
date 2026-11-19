# Preparação automática do Instagram — incidente de 19/11

Classificação estrutural por integração, IA e Storage. A produção está em `8533553`. A leitura do banco confirmou V29 Pro enviada em 17/11 às 17h45 e Y6 em 18/11 às 6h15. Depois disso, a fila ficou vazia, com automação ligada e cron disparando. O último motivo salvo foi `instagram_original_missing`. As quatro próximas fontes têm legenda válida em reprodução local. Três têm original horizontal, sem recorte verificado, e uma não tem original. O fluxo automático só compõe uma arte existente. A geração 4:5 existe no editor manual e nunca foi conectada à reposição. A declaração anterior de recuperação completa foi insuficiente.

## Revisão anterior à implementação

| Perspectiva | Impacto e risco | Dependência e recomendação |
| --- | --- | --- |
| Produto | O objetivo é manter três reservas futuras com foto de ponta a ponta. Exigir preparação manual impede o automatismo. | Conectar geração 4:5 ao fluxo existente quando a mídia disponível não serve. |
| CTO | Modelo e compositor já usados no editor. Risco de estouro do worker, replay e trabalho concorrente. | Uma geração por execução, arte em cache por revisão, marcadores privados imutáveis de tentativa e limite diário. Reusar RPCs e cron. |
| IA | Novas chamadas de imagem têm custo e podem falhar ou devolver proporção errada. | Mesmo prompt 4:5 e referências oficiais do editor. Rejeitar proporção inválida e registrar o motivo. Legendas continuam exigindo evidência literal. |
| Segurança | Uma repetição pode cobrar duas vezes ou criar posts duplicados. | Claim via criação exclusiva no Storage antes da chamada, cache só de JPEG validado, fonte revalidada antes de preparar e reserva serializada pela RPC. HMAC e checagem de admin preservadas. |
| UX/UI | “Agenda ativa” não comprova estoque. O aviso atual não distingue limite, geração e revisão. | Mostrar o motivo da pendência em linguagem de operação. Conferir visualmente as primeiras artes antes de abastecer produção. |
| CX | A fila precisa se repor após cada envio, usando duas vagas existentes como margem. | Bootstrap de três reservas pelo mesmo endpoint. Uma geração por passagem cabe no tempo máximo de 90 segundos do modelo. Falha incerta fica registrada para reconciliação. |
| Growth | Precisamos manter cadência, contexto da fonte e rotação sem repetir histórico. | Expandir a seleção limitada para ultrapassar fontes com pendência. Não alterar elegibilidade, legenda, horários ou deduplicação. |
| PMO/QA | A entrega anterior validou o sender e não a preparação contínua. | Testar falta de original e paisagem sem recorte, timeout, chamadas concorrentes, cache, limite diário, fila cheia e abastecimento. Validar três reservas reais após autorização e inspeção visual. |

## Decisão

A fila reaproveita uma foto nativa ou um recorte verificado. Quando a foto não serve ou está ausente, usa a geração nativa 4:5 existente. Só uma chamada paga por execução e no máximo seis por dia de São Paulo, incluindo falhas. A operação normal repõe um post após cada um dos três envios diários. O limite de seis permite preparar a fila inicial e continuar o dia. Todas as tentativas são vinculadas à revisão da fonte. Resposta incerta não libera repetição automática da mesma revisão. Arte pronta pode ser reutilizada sem cobrar outra imagem.

As fontes são lidas em lote limitado de 24. O preparo verifica legenda antes da chamada de imagem e confere novamente a revisão e a elegibilidade antes de gravar o rascunho. O endpoint de preparo não publica imediatamente. Os horários seguem 6h15, 11h45 e 17h45. O cron e as RPCs permanecem os existentes. Não há migração.

A geração de imagem acrescenta custo do provedor do Lovable, limitado a seis tentativas diárias, normalmente três. Esse custo precisa de autorização específica antes da ativação. Até essa autorização, geração real e deploy ficam pendentes. Rollback pela versão anterior de editorial-admin e do painel. Marcadores de geração, JPEGs e histórico Meta devem ser preservados. Para suspender a operação, usar o gate de automação existente com autorização.

## Revisão posterior local

| Perspectiva | Resultado e evidência |
| --- | --- |
| Produto | Pass local. Teste preenche três reservas distintas com chamadas limitadas e para ao atingir capacidade. |
| CTO | Pass local. Reusa renderer, modelo, cron, RPCs e bucket. Deno check nas dependências da Edge e pnpm validate passaram. |
| IA | Pass local. Geração é apenas para fotos que não servem e usa o propósito Instagram, com imagens oficiais. O modelo real será conferido após autorização. |
| Segurança | Pass local. Testes de concorrência, cache, origem por revisão, falha de Storage, limite diário e timeout sem replay. A fonte é conferida antes de staging; o ator do worker é admin ativo em produção. |
| UX/UI | Pass local. Motivos de créditos, limite, preparo e tentativa incerta têm mensagens específicas no Admin. Foto segue o compositor nativo 1080 × 1350. |
| CX | Pass local. Bootstrap de três fontes distintas testado. Limite de uma geração por execução preserva a duração de cada chamada. |
| Growth | Pass local. Legendas das quatro próximas fontes passaram na reprodução local. Seleção avança por até 24 candidatos e mantém histórico e holds. |
| PMO/QA | Pass local. 45 testes dirigidos, pnpm validate (69 regressões, tipos e build), Deno check e git diff --check. Nenhuma geração real ou mudança produtiva realizada nesta etapa. |

O bucket privado já aceita os marcadores JSON (allowed_mime_types sem restrição, limite 8 MB), verificado sem escrita. A implementação distingue objeto inexistente de erro de acesso/infraestrutura pelos campos statusCode/status do SDK. Referência primária: [Supabase Storage error codes](https://supabase.com/docs/guides/storage/debugging/error-codes).

GO condicionado à autorização do custo e da implantação. Proposta de ativação: integrar este commit, implantar editorial-admin, publicar o painel e abastecer três reservas pelo mesmo endpoint. Cada preparação paga retorna no máximo uma imagem e grava cache. Conferir as três primeiras capas no Admin antes das janelas. O cron confirma os envios nos horários regulares e repõe uma vaga com a mesma função. Monitorar a primeira reposição em produção conforme o horizonte solicitado pelo responsável.

Rollback: reimplantar editorial-admin e Hub da base 8533553. Preservar cache de imagens, claims, registros de quota e marcadores Meta. Um claim incerto é conferido individualmente antes de qualquer nova tentativa. Os registros de quota são por dia de São Paulo; o limite diário não deixa um claim de fonte que bloqueie amanhã. Claims concorrentes podem consumir uma posição de quota sem produzir imagem, sempre respeitando o teto de seis.

## Ativação autorizada e resultado

O proprietário autorizou o custo limitado e reiterou implementar e publicar nesta conversa. Ativado em produção em 19/11: geração nativa com cache, teto de seis tentativas/dia e reposição por minuto. A primeira arte Z8 Pro foi inspecionada e publicada às 12h40min20s, [publicação confirmada](https://www.instagram.com/p/Df7bIKol_J7/). O worker posteriormente gerou e reservou três fontes distintas (V9 Max, OUXI V8 Ultra S, V29 Pro versus V20 Ultra) sem intervenção de geração. A restrição de leitura do ator privado encontrada na primeira reposição foi corrigida por leitura de membership admin ativo; assinatura e segredos continuam privados.

A evolução de horário manual e worker contínuo inclui a migração oficial descrita em INSTAGRAM_MANUAL_DELIVERY_2026-11-19.md; a afirmação anterior de ausência de migração refere-se apenas à primeira etapa do fallback de arte. Revisão produtiva consolidada das oito perspectivas e testes registrados nesse documento. O cron está ativo, o painel mostra três reservas e o envio confirmado inicia o preparo da vaga seguinte.
