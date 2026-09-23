# Contrato de intenção de página e sinergia — Vitale Mobilidade

> Documento de governança. **Não autoriza implementação nem publicação.** Cada mudança continua exigindo tarefa própria, escopo aprovado e decisão explícita do responsável para publicar.
>
> Origem: revisão com oito perspectivas (Produto, CTO, IA, Segurança, UX, CX, Growth, PMO), 23/09/2026. Status vigente de etapas fica em `docs/ROADMAP.md`.

## 1. Modelo central

- A Vitale é um **hub B2C de decisão de compra** de bikes elétricas.
- **Bike é a entidade central**, identificada por `bikeId` estável (`BIKE_ID_RE`, `src/lib/bike-identity.ts`). Ela liga Oferta, Observação de Preço/Radar, Vídeo, Artigo (futuro), Comparação (futura) e ferramentas. O **slug editorial** (`/bikes/{slug}`) é distinto do `bikeId` e nunca o substitui em relações.
- Papéis no funil:

| Camada                                         | Papel                                    |
| ---------------------------------------------- | ---------------------------------------- |
| YouTube, Google, busca por IA, redes sociais   | Aquisição                                |
| Home `/`                                       | Orientação: escolher a jornada           |
| Bikes, Radar, Conteúdo                         | Evidência e avaliação                    |
| Quiz `/escolherbike`                           | Conversão terminal de compra             |
| Mercado Livre                                  | Destino da compra (link afiliado direto) |
| Grupo de ofertas WhatsApp (só admins publicam) | Retenção                                 |
| Dados e analytics                              | Alimentam o futuro loop editorial        |

- Podcast, newsletter, calculadora e Hotpipe são **consumidores futuros** deste grafo. Hoje não são links funcionais e não devem aparecer como tal.

## 2. Matriz de decisão por página

Estados: **Publicada**, **Prévia** (rascunho, não publicada), **Futura** (não existe; proibido linkar).

| Página                                          | Pergunta única do usuário                    | Papel no funil         | Intenção de entrada            | Resposta acima da dobra (mobile)                  | CTA primário                                                                 | Até 2 próximos passos contextuais                                                        | Evidência / fonte                                              | Estado              |
| ----------------------------------------------- | -------------------------------------------- | ---------------------- | ------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- |
| Home `/`                                        | "Por onde começo a escolher minha bike?"     | Orientação             | Marca, direto, social          | Headline + escolha entre Quiz e Radar             | Quiz (`/escolherbike`) — Radar (`/acompanhamento`) é secundário por intenção | Bike em destaque (`/bikes/{slug}`); catálogo `/bikes`                                    | Catálogo Radar read-only (até 5 cards), vídeos reais           | Publicada           |
| `/bikes`                                        | "Quais modelos devo considerar?"             | Descoberta/avaliação   | Busca genérica, Home           | Busca + atalhos só com dados reais                | "Conhecer a bike" → `/bikes/{slug}`                                          | Análise no Radar (só se monitorada); Quiz                                                | Aba de bikes da planilha (ponte) + Radar por `bikeId` + vídeos | Prévia              |
| `/bikes/{slug}`                                 | "Esta bike é para mim e vale comprar agora?" | Avaliação → compra     | Busca por modelo, YouTube      | Foto, nome, specs, preço com fonte, CTA de oferta | "Ver oferta no Mercado Livre" (só com link válido)                           | Análise de preço (`/acompanhamento/{bikeId}`, se monitorada); Quiz ou alternativas reais | Planilha (ponte), `getRadarBike`, vídeos por `bikeId`          | Prévia              |
| Radar lista `/acompanhamento` (`/radar` futuro) | "Qual bike está com preço bom hoje?"         | Evidência de preço     | Busca "preço", Home, grupo     | Busca + rankings factuais                         | Detalhe de preço da bike                                                     | Página da bike planejada/condicional ao cutover (`/bikes/{slug}`); grupo de ofertas      | RPC `get_price_tracker_catalog` (SSR)                          | Publicada           |
| Radar detalhe `/acompanhamento/{bikeId}`        | "O preço atual desta bike está bom?"         | Decisão de preço       | Busca por modelo+preço, alerta | Preço atual vs. histórico, status                 | Oferta afiliada direta                                                       | Página da bike planejada/condicional ao cutover (`/bikes/{slug}`); grupo de ofertas      | RPC de histórico (SSR); 404 validado; 503 em falha controlada ainda pendente de comprovação | Publicada           |
| `/conteudos/{slug}`                             | Uma pergunta real por conteúdo               | Evidência editorial    | Busca informacional, IA        | Resposta direta à pergunta                        | Bike ou Radar relacionados por `bikeId`                                      | Quiz; grupo                                                                              | Nenhuma fonte de artigo existe                                 | Futura              |
| `/comparar` e ferramentas (calculadora)         | "A ou B?" / "Quanto economizo?"              | Avaliação              | Busca comparativa              | —                                                 | —                                                                            | —                                                                                        | Sem contrato de specs/calculadora                              | Futura              |
| `/grupodeofertas`                               | "Como recebo ofertas sem procurar?"          | Retenção               | Radar, bike, social            | Explicação curta + entrada no grupo               | Entrar no grupo WhatsApp                                                     | —                                                                                        | URL externa fixa                                               | Publicada (noindex) |
| Quiz `/escolherbike`                            | "Qual bike eu compro?"                       | **Conversão terminal** | Anúncio, Home, conteúdo        | Início do quiz                                    | Resultado → "Comprar aqui" (Mercado Livre)                                   | Nenhum exploratório (ver §3)                                                             | Catálogo elegível + motor de scoring                           | Publicada           |

Regras de papel: Home permite escolher a jornada; página de Bike equilibra CTA de compra com evidência contextual; Radar prioriza a decisão de preço; conteúdo responde uma pergunta real e só então conecta bike/Radar/Quiz/grupo relevantes.

## 3. Exceção do Quiz

**Não editar o Quiz durante trabalho de hub/navegação.** **O RESULTADO é terminal; a North Star é o clique direto no link Mercado Livre.** **Sem novo header e sem links exploratórios para Radar/Bikes/Comparação/Conteúdo; sem assistente com autoabertura.** **A regra de elegibilidade vale só para os resultados do Quiz.**

- Ações secundárias pré-existentes no resultado: compartilhar no WhatsApp e refazer quiz. Este é **registro para decisão explícita do responsável em tarefa separada do Quiz**, não instrução para alterar agora.
- As 30 bikes nomeadas da planilha, inclusive "Não Elegível", podem estar no catálogo editorial e em blocos factuais de modelos relacionados. **Nunca** chamar um modelo inelegível de recomendação do Quiz nem apresentá-lo como pior por ser inelegível.

## 4. Contratos de dados

- **Fonte:** a leitura server-side da aba de bikes (gid=0) é **ponte editorial read-only temporária**. A arquitetura alvo é Supabase como fonte central (etapas 6–7). O writer Sheets→Supabase existente não é duplicado.
- **Relações:** Vídeo e Artigo se relacionam à Bike por `bikeId` exato (tokens normalizados, aliases explícitos, nunca substring), com fonte/evidência registrada por item. Sem associação válida = conteúdo geral, nunca atribuído silenciosamente.
- **Preço, status e URL afiliada** vêm do contrato confiável em tempo de render (RPC do Radar / fonte validada), com fonte e data visíveis. **Nunca** copiar esses valores para texto editorial ou saída de IA. Preço de planilha é "referência cadastrada", nunca "hoje".
- **Estados indisponíveis:** sem link válido, texto exato `Link indisponível no momento`; Radar ausente, estado "não monitorado"; falha de leitura, 503 honesto/omissão, nunca valor falso.
- **Proibido inventar:** fatos, links, cards editoriais, rankings, alertas, notas, durações ou resultados de calculadora.
- **Afiliado:** `href` direto e byte a byte idêntico (`meli.la`); analytics nunca bloqueia nem intermedeia o redirecionamento.
- **IA futura:** texto e transcrições fornecidos por usuários são entrada não confiável (prompt injection); nunca fonte de preço, link ou fato.

## 5. Regra de conexões

1. O destino precisa responder a uma **pergunta adjacente genuína** do usuário naquela página.
2. O CTA primário segue a intenção da página (§2).
3. Links secundários são **condicionais**: só com rota funcional **e** dado existente. Nunca um menu universal de tudo.
4. Proibido linkar `/radar`, `/comparar`, `/conteudos` antes de funcionarem. `/acompanhamento` continua sendo o Radar real até haver plano de cutover/redirect.
5. Restrições: SSR com metadata própria por rota (`head()`, canonical, noindex onde cabível), HTML acessível e navegável por teclado, JS cliente mínimo, imagens otimizadas com lazy abaixo da dobra.

## 6. Brief pré-build e gate pós-build (obrigatórios)

Preencher antes de construir e revisar antes de liberar. **Rejeitar a mudança se ela adiciona seções só para preencher layout ou enfraquece a decisão de compra.**

```text
Página/rota:
Decisão do usuário (1 pergunta):
Fonte de tráfego:
Resposta acima da dobra (mobile):
CTA primário e ação esperada:
Crosslinks contextuais e condições (rota funcional + dado existente):
Dados reais, fonte e recência:
Estados ausentes/erro (404, 503, sem link, não monitorado):
8 perspectivas — impacto / risco / dependência / recomendação:
  Produto | CTO | IA | Segurança | UX | CX | Growth | PMO
Métricas de aceite: rota→próxima ação; clique afiliado; conclusão do Quiz (quando cabível)
QA direcionado:
SSR / mobile / teclado verificados:
Rollback:
Estado de release (prévia / publicado por decisão explícita):
```

## 7. Estado atual e lacunas (23/09/2026)

- `/bikes` e `/bikes/{slug}` estão **em prévia**, não publicados.
- `/comparar`, `/conteudos` e `/radar` **não são rotas funcionais**.
- Não existe fonte de artigos; o contrato `BikeGuides` renderiza nada.
- A associação de vídeos existe, mas requer reconciliação (ex.: "GT20" ambíguo; T2, Voltz EVS, EV1 Sport fora da aba de bikes). **Não prometer cobertura completa de vídeos** até reconciliar.
- A leitura da planilha de catálogo é ponte temporária, não a arquitetura final apoiada em Supabase.
- Trabalho pré-publicação: performance de imagem e payload (sem PageSpeed/CWV medido), `/bikes` e páginas de bike fora do sitemap, ausência de redirects/canonical entre `/acompanhamento/{bikeId}` e `/bikes/{slug}`.
