# Incidente editorial — 17/11/2026

Classificação estrutural: cron e integração Meta, entrega de capas por Edge e RSS/Spotify. Base: `fbe7611` do repositório conectado ao Lovable. Evidência de produção somente leitura, horário de São Paulo.

- Instagram: `bf76f43` removeu a reposição automática da fila ao separar as capas em 15/11. Os crons continuaram ativos; o banco registrou disparos de 16/11 às 17h45 e de 17/11 às 6h15, com a agenda ligada e nenhuma reserva. O último envio registrado foi o Z8 Pro, 16/11 às 11h45. As execuções SQL do cron comprovam o disparo, não a resposta da Meta.
- Podcast: a mesma mudança escolhia a composição verde com título na falta da capa quadrada independente, e o preparo do RSS salvava essa composição como JPEG v3. Os quatro episódios lançados desde 16/11 às 6h15 (Y6, Z8 Pro, FT07 e V9 Max) exibem esse resultado; dez objetos v3 foram criados no intervalo após a mudança, incluindo seis da fila ainda sem lançamento na leitura. O RSS público anuncia imagens por episódio e conserva os mesmos áudios.

## Revisão prévia

| Perspectiva | Impacto / risco | Dependência / recomendação |
|---|---|---|
| Produto | Restaurar os dois automatismos sem desfazer a separação dos formatos. | Manter a capa nativa aprovada à frente do fallback de podcast e o editor manual do Instagram. |
| CTO | O cron volta a repor sua fila, e a nova arte de RSS ganha revisão própria para evitar o cache antigo. | Reutilizar RPCs, Storage privado, Edge e RSS existentes. Sem novo writer, cron ou SQL. |
| IA | Geração de capa automática paga acrescentaria custo imprevisível e falhas do provedor. | Compor deterministicamente a partir da mídia vinculada ao artigo e usar a legenda fundamentada existente; IA manual segue explícita. |
| Segurança | Evitar SSRF, exposições e duplicação de posts. | Aceitar somente objetos do artigo no Storage; manter autorização, HMAC, dedupe, fingerprint, reserva, lease e marcadores de envio. |
| UX/UI | Banner não pode confundir agenda ligada com fila abastecida; fotos horizontais podem perder a Bike no recorte. | Sinalizar fila vazia e permitir repor uma reserva. Compor formatos finais sem cortar a foto; respeitar revisão já iniciada. |
| CX / Operação | Uma fonte incompleta não deve travar a próxima; bootstrap não deve enviar post atrasado. | Seleção limitada e estado visível; repor antes da próxima janela via painel. RSS continua mesmo sem foto legítima. |
| Growth/CRO | Recuperar cadência e imagens sem republicar nem duplicar episódios. | Somente horários futuros, GUID e áudio intactos, preservar URLs dos episódios anteriores ao incidente. |
| PMO/QA | O cron pode disparar sem publicar e o Spotify pode armazenar a arte antiga. | Testar o comportamento em mocks; exigir smoke em produção e conferência do próximo envio e da atualização no Spotify após autorização. |

Decisão: gerar no máximo uma nova reserva por passagem do worker, usando a mesma regra de elegibilidade, legenda e formato 4:5. Rascunho manual não é aprovado pelo cron. Imagem original 4:5 usa enquadramento nativo; outros formatos usam foto inteira, e o JPEG publicado do mesmo artigo pode ser preservado inteiro quando não houver original. A recuperação de RSS usa revisão de arte v5 para episódios lançados desde 16/11 às 6h15 e para preparo futuro: arte independente aprovada, arte fotográfica preparada, ou foto do mesmo artigo composta em 1:1. A marca fica como último recurso quando não há imagem válida. Custo de geração automática adicional: zero. Aceite: reserva futura sem IA, holds/dedupe e aprovação manual preservados, JPEG quadrado com foto, URLs antigas compatíveis, RSS com GUID e enclosure iguais. A foto completa pode ter margens; preferimos isso a cortar ou inventar parte da Bike. Fora de escopo: replay, edição de mídia da Meta, geração em lote por IA, alterações de credenciais ou migrações. Rollback: restaurar versões anteriores das duas Edge Functions e do Hub; preservar objetos v5 e IDs, reservas e tentativas Meta. Arte do Spotify muda quando a plataforma reler o feed.

## Revisão posterior

| Perspectiva | Resultado | Evidência |
|---|---|---|
| Produto | Pass | Fila volta a reservar automaticamente; o editor manual e a prioridade da arte independente permanecem. |
| CTO | Pass | Reutilização de cron/RPC e assets versionados; Edge confirma a revisão fotográfica antes de gravar v5. Sem migração nem novo agendador. |
| IA | Pass | Reposição usa o compositor e a legenda fundamentada, sem chamar o gerador pago. |
| Segurança | Pass | Testes de fonte ausente e URL externa; somente caminhos internos verificados, HMAC e fluxo de envio preservados, RPC serializa reservas. |
| UX/UI | Pass | Fila vazia explícita e ação de reposição; testes inspecionam a presença da foto nas duas extremidades em JPEG de 1400 × 1400. |
| CX / Operação | Pass | Reposição reserva seu próprio rascunho sem aprovar o manual, conserva slots futuros, e marca sem foto não fica congelada no Storage. |
| Growth/CRO | Pass | Teste RSS mostra nova URL de imagem após o corte e os mesmos GUID e áudio; o histórico mantém a URL anterior. |
| PMO/QA | Pass local | 57 testes dirigidos, `pnpm validate` (69 testes, tipos e build), `deno check` nas duas Edge Functions e diff sem problemas de whitespace. |

A leitura de produção confirmou originais vinculados pelo artigo no Storage para os quatro episódios afetados. Também há fontes de Instagram elegíveis com foto do artigo, incluindo a Ouxi GT20 Pro mostrada no Admin. A produção ainda não recebeu nenhuma alteração deste trabalho.

**GO condicionado à autorização de produção.** Integrar somente este diff, implantar `bike-image` antes de `editorial-admin` e então publicar o Hub. Conferir GET das quatro imagens v5, JPEG quadrado fotográfico, e comparar GUID e enclosures do RSS. Abastecer a próxima janela futura pelo painel e comprovar uma reserva; conferir o envio no horário e a atualização do Spotify após a releitura do RSS. Se houver regressão, restaurar a versão anterior dessas funções e do Hub, mantendo todos os marcadores e históricos de entrega. O único efeito externo esperado, além da capa atualizada no RSS, é a retomada das publicações nos horários configurados; sem reenvio de slots perdidos.
