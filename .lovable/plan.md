# Diagnóstico Hotpipe outbox — status 0 (somente leitura)

## O que foi confirmado
- Site publicado está ativo (`is_published=true`). As ferramentas disponíveis não expõem o ID/revisão da publicação; não é possível confirmar por elas se `431cfa5c…` é a revisão servida.
- Três ticks assinados (20:18:16, 20:21:13, 20:25:07 UTC) chegaram em `/api/public/price-alert-outbox` → 200. Portanto HMAC, service role, secret presente e com formato válido, e claim funcionaram (senão seria 403/503/500).
- Evento `5b25293e-b8a1-4c1e-9bd9-927738c96f36`: `pending`, `attempts=3`, `last_http_status=0`, chaves do payload `event_id, operation, request_id, revision` (sem customer).
- Nenhuma linha `[hotpipe-outbox] delivery_failed` nos logs. Os logs do servidor publicado só registram linhas de acesso; nenhuma saída de console aparece para nenhuma requisição na última hora. A ausência não prova que o erro não ocorreu.

## Causa concreta (alta confiança, por código + runtime)
`status=0` só ocorre quando o `fetch` lança exceção antes de qualquer resposta. A chamada usa `redirect: "error"`. O runtime de servidor do site (Cloudflare Workers) aceita apenas `"follow"` e `"manual"`; `"error"` lança `TypeError` de forma síncrona e determinística, antes de qualquer conexão. Isso explica:
- falha idêntica em toda tentativa, antes e depois do patch AbortController;
- testes locais (Node/Bun) passando, porque lá `"error"` é suportado;
- nenhuma requisição chegar ao Hotpipe.

Enum sanitizado esperado: `name=TypeError`.

## Correção mínima proposta (só se você autorizar)
- Trocar para `redirect: "manual"` e tratar qualquer resposta 3xx como não aceita (sem seguir), preservando a mesma garantia de nunca seguir redirect.
- Um teste dirigido que confirme: 3xx não é aceito e não segue redirect.
- Sem migration, dados, cron, secrets ou chamadas reais.

## Boolean diagnóstico mínimo (se quiser prova antes da correção)
Como o console não aparece nos logs publicados, persistir no próprio retorno do tick, sem segredo: `{ delivered, failures: [{ event_id, name, stage: "fetch" }] }`, com `name` limitado ao enum `TypeError | AbortError | TimeoutError | Error`. Nenhuma mensagem, header ou chave.
