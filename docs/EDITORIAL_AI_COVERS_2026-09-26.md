# Piloto manual de capas de artigos com IA — 26/09/2026

Base: `3c76c59e034e217febc593e3308bcd5cd5a0691b` (Quiz restaurado como rascunho). Frontend **não publicado** nesta rodada (Quiz tem gate de release separado).

## Escopo
- Editor de artigo (`/admin/conteudos/$id`, qualquer status, inclusive publicado): painel "Capa do artigo" com botão **Gerar capa com IA**.
- `editorial-admin` → `cover-generate`: exige JWT, papel `admin`/`content`, UUID e `revision` inteira igual à atual. Lê título do banco; referência = thumbnail oficial do vídeo restrita a `https://i.ytimg.com/vi/{youtube_id}/{maxresdefault|sddefault|hqdefault|mqdefault}.jpg` (thumbnail ≤ 2 MB, timeout 8 s). Gemini de imagem (`google/gemini-3.1-flash-image`, `/v1/images/generations`) cria fundo NOVO 16:9 sem texto; timeout 90 s; 402/403/429 com mensagens claras; audit `cover_generated`/`cover_generate_failed`. **Não escreve no artigo.**
- Navegador compõe por canvas o **título exato** (quebra por palavras, reduz fonte, nunca trunca; recusa se não couber) e a marca "Vitale Mobilidade" em JPG 1280×720 ≤ 4 MB.
- Atual × candidata lado a lado; ações Gerar outra / Descartar (sem escrita) / Aplicar. Aplicar exige checkbox de revisão visual e, em artigo publicado, confirmação de efeito imediato.
- `cover-apply`: mesmos controles + JPG estruturalmente válido 1280×720 ≤ 4 MB; upload `editorial-covers/{articleId}/{uuid}.jpg` (bucket privado, `upsert:false`); `og_image_url` atualizado com lock otimista por `revision`; em conflito o arquivo é removido e a capa anterior permanece. Audit `article_revision` (snapshot anterior) + `cover_applied` (anterior/nova).
- Entrega pública pela função existente `bike-image` (já pública/sem JWT): `?type=editorial-cover&id={articleId}&file={uuid}`. Só serve se o artigo está `published` e `og_image_url` é exatamente a URL canônica; JPEG, cache 1 h/24 h CDN, `nosniff`, ETag. Sem `type`, o fluxo de bikes é idêntico ao anterior. `type` desconhecido → 400.
- SEO: capa aprovada em hero, cards e OG (`og:image:width=1280`, `height=720`, `type=image/jpeg`); Article.image usa a capa; **VideoObject.thumbnailUrl e o player mantêm a thumbnail do YouTube**. Artigo novo não gera capa automaticamente; regeneração de texto preserva capa editorial (lógica existente em `generateInto`).
- Migration versionada `editorial-covers` (guarda: bucket existe e é privado; sem policies em `storage.objects`). O bucket foi criado pela ferramenta de storage (SQL em `storage.buckets` é bloqueado).

## Limitação conhecida
Capa aplicada em **rascunho** não é servida publicamente (por desenho) e aparece como "visível quando publicado" no editor. Aplicar em rascunho é permitido; a candidata é pré-visualizada antes via data URL.

## Revisão das oito perspectivas
| Perspectiva | Pré-implementação | Pós-implementação |
|---|---|---|
| Produto | Capa própria melhora cards/compartilhamento sem trocar a prova (vídeo). | Manual, por artigo; nenhum efeito sem "Aplicar". |
| CTO | Não criar função nova (bloqueada); reaproveitar `bike-image`. | Ramo isolado antes de `sanitizeBikeId`; helpers puros em `_shared/editorial-cover.ts`. |
| IA | Modelo não pode escrever título nem inventar marca. | Prompt proíbe texto; título/marca por canvas; checkbox de revisão contra texto alucinado. |
| Segurança | SSRF, path traversal, arquivo arbitrário, chave no cliente. | Thumbnail em allowlist exata; UUIDs estritos; URL exata; bucket privado; chave só no servidor; body ≤ 6 MB. |
| UX | Comparação clara e reversível. | Lado a lado, estados de carregamento/erro com `role=alert`, botões desabilitados quando inválido. |
| CX | Leitor não pode ver imagem enganosa. | Aplicação só após revisão humana; publicado exige confirmação. |
| Growth | OG com dimensões corretas aumenta prévia em redes. | width/height/type definidos para capas aprovadas. |
| PMO | Sem publicação do frontend; rollback simples. | Funções implantadas; frontend em preview; pendências abaixo. |

## Rollout
> Nota: na data deste documento não há nenhum artigo em `draft` na base (consulta confirmou zero rascunhos). O gate abaixo foi ajustado para usar um artigo antigo publicado.

1. Bucket privado + migration (feito). 2. Implantar `bike-image` e confirmar bikes 200 (feito: `v8_pro_s` GET/HEAD 200 image/png). 3. Implantar `editorial-admin` (feito; chamada sem sessão → 403). 4. Teste real com sessão editorial: gerar uma candidata em um artigo antigo **publicado**, inspecionar atual × candidata lado a lado e **descartar sem aplicar** — confirmando assim zero alteração pública. 5. Só aplicar a um artigo publicado depois de aprovação visual explícita da candidata. 6. Publicar frontend junto com a liberação do Quiz (necessário para OG dimensions e VideoObject no ar).

## Rollback
- Capa: editar "Imagem de compartilhamento" nas configurações avançadas para a URL anterior (registrada em `cover_applied.detail.previous` e no snapshot `article_revision`).
- Código: reverter `bike-image` e `editorial-admin` para o commit anterior e reimplantar; o ramo novo é aditivo.
- Bucket pode permanecer (privado, sem acesso público).

## Validação
- `pnpm validate`: typecheck, testes e build OK. Testes direcionados: `editorial-cover.test.ts` (4) e `cover-compose.test.ts` (3) OK.
- Pós-deploy: bikes 200; `type=editorial-cover` inválido 400, inexistente 404, `type` desconhecido 400; `cover-generate` sem sessão 403.
- **Pendente:** geração real não foi executada — o ambiente de teste estava sem sessão editorial autenticada, e nenhuma capa foi aplicada. Fazer a primeira geração e inspeção pelo editor.

## Revisão corretiva — contrato do endpoint de imagem (HEAD `d28c5a7`)
Risco levantado: `coverGenerate` envia `{model, modalities, messages}` a `/v1/images/generations` e lê `data[0].b64_json`.
Evidência de que o contrato atual é válido (por isso o código **não** foi alterado nem reimplantado):
- Guia oficial do gateway (request formats): Gemini 3.1 Flash Image usa o formato `gemini-chat` = `model`, `messages`, `modalities: ["image","text"]`; o endpoint de imagens traduz corpos `messages` para modelos Vertex e **normaliza o resultado para `b64_json`**.
- Guia oficial de edição: para Gemini chat, enviar instrução e partes `image_url` com data URL numa mensagem de usuário em `/v1/images/generations` — exatamente o corpo atual.
- Guia oficial de fluxos legados: `/v1/chat/completions` com `choices[0].message.images` é padrão legado; código novo deve usar `/v1/images/generations`. Migrar para chat seria regressão de contrato.
- Exemplo oficial do servidor usa `Authorization: Bearer <LOVABLE_API_KEY>` nesse endpoint (o header `Lovable-API-Key` é o padrão dos SDKs de chat).
- Catálogo autenticado `GET /v1/models` (26/09/2026): `google/gemini-3.1-flash-image` existe, entrada texto/imagem/vídeo, saída texto/imagem.
- Parse atual já restringe base64 estrito, tamanho (≤ 8 MB) e mime por assinatura (JPEG/PNG/WebP).
Nenhuma geração real foi feita (sem sessão editorial).

## Revisão pós-implementação — status de release
| Perspectiva | Status | Justificativa |
|---|---|---|
| Produto | Pass | Fluxo manual; gerar/descartar sem escrita; aplicar separado. |
| CTO | Pass | Contrato do endpoint conferido com a documentação oficial e o catálogo; ramo `bike-image` isolado e bikes 200. |
| IA | **Fail** | Modelo nunca chamado de ponta a ponta; qualidade, recusa e ausência de texto na arte não verificadas. |
| Segurança | Pass | Allowlist de thumbnail, UUIDs, URL exata, bucket privado, chave só no servidor; 403 sem sessão confirmado. |
| UX | **Fail** | Painel no editor autenticado não testado com sessão editorial real. |
| CX | N/A | Nenhuma capa aplicada; leitor não é afetado até aplicação revisada. |
| Growth | N/A | OG dimensions/type só entram no ar com a publicação do frontend. |
| PMO | **Fail** | Gate de release: falta teste real do modelo e da UI autenticada; frontend não publicado. |

**Release bloqueada** até: geração real de candidata em artigo antigo publicado com sessão editorial, inspeção visual lado a lado, descarte sem aplicar (zero alteração pública confirmada) e, só então, aplicação em publicado após aprovação visual explícita + verificação do hero/OG. Não há rascunhos disponíveis neste momento.
