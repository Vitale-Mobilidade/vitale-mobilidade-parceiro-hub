# Fotos de anúncios até 15 MB — 05/11/2026

Classificação estrutural: integração de mídia com Storage e conversão no navegador. Pedido: aceitar fotos grandes e otimizar automaticamente; limite original sugerido pelo responsável: 15 MB por foto. Mesmo projeto Lovable e mesmo Supabase. Não armazenar originais grandes nem alterar limites/políticas do Storage por conveniência.

## Diagnóstico

prepareMemberImage rejeita arquivo acima de 10 MiB e tenta apenas uma conversão a WebP. A mesma exceção image_too_large é usada quando canvas.toBlob devolve MIME diferente, mesmo quando pequeno. HTML/MDN documentam retorno PNG quando o tipo solicitado não é suportado: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob . A captura iPhone é compatível com essa falha, embora não prove o MIME retornado naquele aparelho. O contrato existente (RPC, bucket, path e proxy público) exige WebP real até 2 MiB. Aumentar apenas a mensagem/limite original não corrige esse caminho.

## Revisão prévia das oito perspectivas

| Perspectiva | Impacto, risco, dependência, recomendação |
|---|---|
| Produto | 15 MiB por original, até cinco fotos, otimização sem intervenção. Evitar nova trava por formato interno. Prosseguir. |
| Arquitetura | Compartilhar preparo entre usuário, Admin e avatar; manter WebP/2 MiB persistido. Encoder WASM local como fallback quando canvas não codifica WebP; carregar somente nessa interação. Sem migration ou writer paralelo. Prosseguir condicionado à prova do bundle/worker. |
| IA | N/A: compressão determinística, sem IA ou serviço de imagens pago. |
| Segurança | Validar entrada, bytes/pixels, saída WebP real; remover EXIF por recodificação, recursos e URLs temporárias liberados; nada em CDN/serviço terceiro. Preservar auth/reservas/RLS/Storage. Prosseguir. |
| UX | Limite 15 MB visível; mensagem diferente para excesso de entrada e conversão; progresso de preparação/envio por foto, sem aparente travamento. Prosseguir. |
| CX | Mesmo comportamento no Admin/comunidade/perfil; lotes sequenciais para memória mobile e preservação dos envios já concluídos. Prosseguir. |
| Growth | Remover abandono na etapa 1 sem mudar pagamento ou consentimentos; imagens publicadas leves e SSR preservado. Prosseguir. |
| QA | Testar original 10–15 MB e fronteira, fallback PNG/null de canvas com encoder real WebP, redimensionamento/qualidade, saída/pixels/metadados, avatar, cinco fotos, fluxo local de upload e build. Provar Safari/WebKit local quando disponível, registrar limites. Prosseguir condicionado. |

Decisão: ampliar somente entrada para 15 MiB, otimizar para WebP existente até 2 MiB com redução adaptativa e fallback local em Worker via @jsquash/webp fixado; validar compatibilidade real do bundler/worker/wasm. Usar decode por Image quando createImageBitmap não estiver disponível/funcionar. Atualizar texto e progresso. Não introduzir JPEG disfarçado de .webp, originais de 15 MB no bucket ou afrouxar segurança do backend. Trade-off: dependência/WASM adicional apenas no fallback versus migração de MIME/path/RLS/servidor; preferido fallback para preservar contrato e evitar custo de processamento servidor. Fonte do encoder: https://github.com/jamsinclair/jSquash/tree/main/packages/webp (Apache-2.0, derivado de Squoosh/libwebp).

Rollback: reverter conversor, textos e dependência mantendo fotos existentes e contratos do Storage. Custo: pacote open source e testes locais, sem mensagens, anúncios reais, serviço pago, créditos Lovable ou uploads em produção. Preparar PR e pedir autorização de merge/publicação após testes proporcionais; não interpretar aprovação da correção de login como autorização deste novo escopo.


## Revisão posterior

| Perspectiva | Status | Evidência ou justificativa |
|---|---|---|
| Produto | Pass | Entrada até 15 MiB por foto, cinco fotos e otimização automática; perfil e Admin usam o mesmo preparo. |
| Arquitetura | Pass | Canvas nativo quando disponível; fallback real WebP em Worker com WASM de mesma origem. Build e Worker compilado executados em Chromium/WebKit. Nenhuma migration, mudança de MIME/path ou bucket. |
| IA | N/A | Nenhum modelo, prompt ou serviço de IA participa. |
| Segurança | Pass | Limites de entrada/60 milhões de pixels/saída e assinatura RIFF/WEBP verificados; originais e metadados não enviados. Reservas, autorização e validação backend preservadas; testes bloqueiam rede externa. |
| UX | Pass | Limite de 15 MB visível, progresso por foto e erros de entrada separados dos de conversão. Captura mobile local inspecionada; interface responde durante o Worker. |
| CX | Pass | Cinco uploads locais, troca de capa/remoção, avatar e fluxo compartilhado Admin verificados; lote sequencial libera recursos por foto. |
| Growth | Pass | Imagens finais até 1600 px e 2 MiB; SSR público e descoberta existentes passam no fluxo local. Nada de imagens originais pesadas na vitrine. |
| QA | Pass | Fronteira exata 15 MiB aceita e +1 byte rejeitado, arquivo inválido, PNG/null fallback, redução adaptativa, orientação EXIF, avatar, upload UI e Worker de produção verificados. Lint direcionado e pnpm validate aprovados. |

### Evidências e limites

- `tests/member-image.mjs`: Chromium/Chrome e WebKit reais, arquivos sintéticos de 4000×3000 com tamanho exato de 15 MiB; saída WebP real até 1600×1200, orientação retrato 1200×1600, avatar 320×320. Chromium usa encoder nativo sem carregar WASM. WebKit retorna PNG no probe nativo e funciona com fallback. Também simulados PNG/null e indisponibilidade de createImageBitmap.
- Os bytes de preenchimento validam a fronteira de tamanho; o teste não representa entropia de uma fotografia real de 15 MB. Redução adaptativa foi exercitada com saída nativa acima do limite.
- `tests/bike-classifieds-ui.mjs` com `CLASSIFIEDS_TEST_LARGE_PHOTOS=true`: original de 12 MiB, rejeição de 15 MiB +1 antes do upload, fallback real em Worker e cinco fotos recodificadas; passos 1>2>3 e continuação preservados. Backend local falso; zero alteração de anúncios ou mídia reais.
- `tests/member-image-build.mjs`: Worker e WASM emitidos no build servidos localmente com MIME correto e executados em Chrome/WebKit, sem CDN.
- `pnpm validate`: 66 testes, typecheck e build. Lockfile congelado conferido com Bun 1.4.4, sem scripts de instalação.
- Captura de progresso mobile: `artifacts/listing-photos-15mb/large-photo-progress-mobile.png` (artefato local, não incluído no código).
- Teste em motor WebKit local, não em iPhone físico. Suporte declarado continua JPEG, PNG e WebP; HEIC não faz parte deste escopo.
- O fallback adiciona cerca de 281–346 kB de WASM sem gzip, carregado apenas quando necessário; processamento local pode demorar em aparelhos modestos. Há feedback e prazos de conversão, sem custo novo de processamento no servidor.

Estado: implementação local concluída, sem risco material pendente identificado. Publicação exige autorização específica para merge/deploy desta PR, conforme EXECUTION_GUARDRAILS; aprovação da PR #92 não cobre este escopo. Rollback: reverter código/dependência, preservando fotos já armazenadas.
