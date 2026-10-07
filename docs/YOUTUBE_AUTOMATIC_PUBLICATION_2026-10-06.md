# Publicação automática — 06/10/2026

Mudança estrutural: fila, IA, Supabase e SEO público. O usuário autorizou explicitamente publicação automática dos artigos gerados; os oito novos artigos entram na mesma fila diária. Os 107 publicados e o piloto histórico não são reprocessados.

## Revisão prévia e decisão

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Resultado publicado; risco de publicar conteúdo incompleto. GO com gate de texto+capa. |
| CTO | Nova etapa persistente na fila; risco de repetição. GO com lease exclusivo e revisão CAS. |
| IA | Revisão contra transcrição integral e catálogo; risco de invenção/voz distante. GO com bloqueio e relatório privado, sem reescrita automática. |
| Segurança | Apenas cron assinado/service_role; risco de cliente publicar lote. GO sem endpoint público de claim ou alteração de RLS. |
| UX | Admin explica publicação e mostra falhas; risco de promessa falsa. GO com status real da fila. |
| CX | Mesmo cron e Sincronizar tudo; risco de falha silenciosa. GO com needs_review e log, sem repetição paga incerta. |
| Growth | Metadata, trechos verificáveis, diversidade e módulos; risco de canibalização. GO com revisão factual/contextual e conferência SSR pública. |
| PMO | Oito existentes mais futuros; risco de alterar legado. GO com migration restrita a inventário não histórico, testes e rollback. |

Decisão: publicar pela fila após validação determinística, capa privada válida e revisão automática independente do texto completo contra fonte e corpus. Custo: uma revisão IA por artigo, sem regenerar texto/capa. Lovable necessário somente para aplicar migration/deploy no Cloud integrado. Divergência: alertas lexicais não provam duplicação entre testes da mesma bike; o revisor recebe corpus e alerta, bloqueando similaridade material. Não há cinco intenções diferentes neste lote: sete textos são de bikes (avaliação, subida, autonomia e velocidade) e um de negócio. Não inventar diversidade.

Rollback: desativar worker/jobs; reverter código; se necessário arquivar apenas IDs publicados pelo novo log automatic_article_published. Nunca restaurar todo o corpus ou apagar transcrições.

## Evidências e revisão posterior

Revisão local: Produto Pass (publicação no mesmo fluxo); CTO Pass (lease/CAS); IA Pass (fonte integral, voz e evidências, revisor sem editar); Segurança Pass (claim somente service_role, cron assinado); UX Pass (copy e estados); CX Pass (falhas registradas, sem replay pago); Growth Pass local (metadata, evidências, módulos e corpus; conferência SSR de produção após execução); PMO Pass local (55 testes do servidor, 59 regressões do gate, typecheck e build em `pnpm validate`).

Release autorizado pelo pedido explícito nesta thread. Migration enfileira oito, não modifica status editorial. Snapshot dos 107 publicados: hash 18146aac3feea06926c4eec170f750b2. O resultado público ainda depende da execução real; não declarado pronto antes da conferência.


## Descoberta no cron real

Primeiro ciclo 00:25 UTC bloqueou referências internas que a geração condensou. A legenda tem sobreposição/repetição de linhas e alguns excerpts eram paráfrases. Fonte integral permaneceu correta. Gate v2 executa uma extração automática restrita dos trechos faltantes, verifica correspondência literal e CAS, sem alterar texto, título, capa ou original. Depois executa a mesma revisão factual/contextual integral. Mudança consolidada nas oito perspectivas: mantém o bloqueio factual; risco de extração inventada mitigado por correspondência determinística e whitelist; custo adicional somente quando referências não são literais. Recuperação enfileira apenas falhas determinísticas pré-QA v1 com esse motivo exato, sem repetir QA paga incerta.

Segundo ciclo (VL20) terminou QA com apontamentos conhecidos, sem timeout. Gate v2 enfileira uma única correção automática pelo mesmo escritor com fonte integral e apontamentos privados, preservando título/capa. O revisor considera também os dados estáticos explicitamente cadastrados (não medições) e os títulos/CTAs dos módulos renderizados. Se a segunda revisão reprovar, needs_review; não há repetição indefinida. Recuperação de cf-AF7LgqpY registra esse limite antes de enfileirar. Todas as oito perspectivas recomendam GO condicionado a verificar o limite e a nova QA; não dispensar revisão factual para publicar.

QA real também revelou um defeito determinístico: assunto de negócios era classificado como teste de bike, ganhando título de módulo inadequado e Quiz sem bike associada. Corrigido no classificador/layout, testado sem editar dados de artigos manualmente; a correção automática existente reconstruirá o layout. Gate v3 distingue orientação/explicação geral derivada dos fatos de número, especificação, experiência ou generalização sem suporte. Não exige reprodução literal da prosa nem introdução redundante de CTA renderizado. A regra de evidência literal continua nos campos privados e a revisão factual continua obrigatória. Risco/trade-off registrado: rigor excessivo amputava orientação útil; não relaxar suporte para fatos específicos. Revisão das oito perspectivas: GO condicionado ao smoke real, preservando SSR, entidade Bike, catálogo e 107 publicados.

Gate v4: IDs reais mostram que as sinalizações de GT2000/V9 comparam vídeos diferentes. A revisão precisa comparar corpos completos, não inferir mesmo teste por título/headings; cinco pares mais próximos recebem body completo, e bloqueio exige passagens concretas. O escritor de correção recebe os pares explicitamente citados (somente corpus autorizado, no máximo três), nunca como fonte factual. CTA padrão de bike agora é neutro (“Veja a bike em vídeo”), pois content_type=test não prova teste prático. Preserva texto e módulos dos 107 já publicados. Decisão nas oito perspectivas: GO com essas mitigacões, sem dispensar diversidade ou inventar outro assunto para cada vídeo.

Gate v5: a extração da última VL20 retornou texto que não passava correspondência exata; não foi publicada. Referências agora selecionam IDs de spans contíguos reais (800 caracteres, sobreposição 400) que cobrem a transcrição inteira; o servidor copia a substring original, a IA nunca escreve a citação. ID inválido/sem suporte bloqueia; a QA semântica continua independente e obrigatória. Recuperação restringe-se ao y5JP4N88giM, falha estruturada conhecida v3; não retoma timeout. Revisão das oito perspectivas: GO com seleção por ID/whitelist, evidência preservada, CAS e sem modificação da prosa/capa. Custo da extração é equivalente ao anterior; não refazer imagem/artigo.

Nova QA do texto de negócios corrigido apontou um problema técnico diferente e concreto: diferença em reais entre compra e venda chamada margem bruta, em vez de lucro bruto. Não publicado. Limite ajustado para no máximo duas correções concluídas por artigo (contador persistido); a segunda corrige este apontamento conhecido pela própria fila, sem edição manual, e continua sujeita a QA. Timeout/402/CPU sem resultado não é retomado por esta regra. Recuperação apenas do 4jUW7M7Iz1s/v4, com contador=2 antes da escrita. Oito perspectivas: GO; trade-off de uma rodada extra de escritor/revisor versus publicar erro técnico; teto explícito impede loop pago.
