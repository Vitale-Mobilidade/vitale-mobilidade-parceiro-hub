# Contrato de intenção de página e sinergia — Vitale Mobilidade

> **Decisão vigente de 15/10/2026:** a experiência pública de Bike foi
> consolidada no Radar. As únicas rotas canônicas são `/radar` e
> `/radar/{bikeId}`; `/bikes` e `/bikes/{slug}` são aliases legados com 301 e não
> possuem mais página própria. A comparação acontece dentro do detalhe do Radar.
> Novos conteúdos sempre têm um vídeo publicado como fonte; analytics mede o
> desempenho do conteúdo, mas não define sua fonte nem gera pauta. Bikes sem
> artigo e relações com ferramentas não são pendências prioritárias. As menções
> abaixo a páginas próprias `/bikes`, `/bikes?compare` ou pauta orientada por
> analytics são registro histórico e estão superseded por esta decisão.


> Atualização de rotas em 28/09/2026, preparada localmente: Quiz em `/quiz`; `/escolherbike` redireciona com 301 para `/` preservando query/UTM. Substitui as referências anteriores ao endereço do Quiz; demais estados históricos deste documento permanecem. Ver [decisão e validação](QUIZ_ROUTE_2026-09-28.md).
> Documento de governança. **Não autoriza implementação nem publicação.** Cada mudança continua exigindo tarefa própria, escopo aprovado e decisão explícita do responsável para publicar.
>
> Origem: revisão com oito perspectivas (Produto, CTO, IA, Segurança, UX, CX, Growth, PMO), 23/09/2026. Status vigente de etapas fica em `docs/ROADMAP.md`.

## 1. Modelo central

- A Vitale é um **hub B2C de decisão de compra** de bikes elétricas.
- **Bike é a entidade central**, identificada por `bikeId` estável (`BIKE_ID_RE`, `src/lib/bike-identity.ts`). Ela liga Oferta, Observação de Preço/Radar, Vídeo, Artigo, Comparação e ferramentas. A URL pública canônica usa o ID em `/radar/{bikeId}`; slugs antigos existem somente para resolver redirects.
- Papéis no funil:

| Camada                                         | Papel                                    |
| ---------------------------------------------- | ---------------------------------------- |
| YouTube, Google, busca por IA, redes sociais   | Aquisição                                |
| Home `/`                                       | Orientação: escolher a jornada           |
| Bikes, Radar, Conteúdo                         | Evidência e avaliação                    |
| Quiz `/quiz`                           | Conversão terminal de compra             |
| Mercado Livre                                  | Destino da compra (link afiliado direto) |
| Grupo de ofertas WhatsApp (só admins publicam) | Retenção                                 |
| Dados e analytics                              | Medem desempenho e conversão             |

- Podcast, newsletter, calculadora e Hotpipe são **consumidores futuros** deste grafo. Hoje não são links funcionais e não devem aparecer como tal.

## 2. Matriz de decisão por página

Estados: **Publicada**, **Prévia** (rascunho, não publicada), **Futura** (não existe; proibido linkar).

| Página                                          | Pergunta única do usuário                    | Papel no funil         | Intenção de entrada            | Resposta acima da dobra (mobile)                  | CTA primário                                                                 | Até 2 próximos passos contextuais                                                        | Evidência / fonte                                                                           | Estado              |
| ----------------------------------------------- | -------------------------------------------- | ---------------------- | ------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| Home `/`                                        | "Por onde começo a escolher minha bike?"     | Orientação             | Marca, direto, social          | Headline + escolha entre Quiz e Radar             | Quiz (`/quiz`) — Radar (`/radar`) é secundário por intenção | Bikes no Radar; conteúdos reais                                    | Catálogo Radar read-only (até 5 cards), vídeos reais                                        | Publicada           |
| Radar lista `/radar` (aliases 301: `/acompanhamento`, `/bikes`) | "Quais modelos devo considerar e qual preço está bom?" | Descoberta e evidência | Busca, Home, grupo | Busca, rankings e catálogo factuais | Detalhe oficial da Bike | Quiz; grupo de ofertas | RPC `get_price_tracker_catalog` (SSR) | Publicada |
| Radar detalhe `/radar/{bikeId}` (aliases 301) | "Esta Bike é para mim e o preço atual está bom?" | Avaliação → compra | Busca por modelo/preço, alerta, URL antiga | Foto, ficha, preço, histórico e comparação | Oferta afiliada direta quando válida | Outra Bike comparada; conteúdo real | Radar + catálogo público + relações de vídeo/artigo por `bikeId` | Publicada |
| `/conteudos/{slug}`                             | Uma pergunta real por conteúdo               | Evidência editorial    | Busca informacional, IA        | Resposta direta à pergunta                        | Bike ou Radar relacionados por `bikeId`                                      | Quiz; grupo                                                                              | Vídeo publicado identificado por `video_id` e sua transcrição/evidência | Publicada |
| `/ferramentas`                                  | "Que ferramenta me ajuda a decidir?"         | Orientação             | Busca por ferramenta, menu     | Lista das sete ferramentas oficiais               | Ferramenta escolhida ou Quiz | Radar; conteúdo contextual | Cálculos determinísticos e catálogo real, conforme cada ferramenta | Publicada |
| Comparação dentro de `/radar/{bikeId}` | "A ou B?" | Avaliação | Detalhe da Bike | Tabela com dados reais e ausências rotuladas | Abrir o detalhe da Bike comparada | Oferta e conteúdo contextual | Catálogo público por `bikeId` | Publicada |
| `/calculadoras/*` (9 rotas)                     | "Quanto economizo?" / "Compensa?"            | Avaliação              | Busca por ferramenta           | Resultado imediato na própria tela                | Bikes reais compatíveis (máx. 2) e Quiz contextual                           | Radar (quando a bike é monitorada); `/ferramentas`                                       | Sem dados próprios: cálculo determinístico + catálogo Supabase                              | Publicadas          |
| `/grupodeofertas`                               | "Como recebo ofertas sem procurar?"          | Retenção               | Radar, bike, social            | Explicação curta + entrada no grupo               | Entrar no grupo WhatsApp                                                     | —                                                                                        | URL externa fixa                                                                            | Publicada (noindex) |
| Quiz `/quiz`                            | "Qual bike eu compro?"                       | **Conversão terminal** | Anúncio, Home, conteúdo        | Início do quiz                                    | Resultado → "Comprar aqui" (Mercado Livre)                                   | Nenhum exploratório (ver §3)                                                             | Catálogo elegível + motor de scoring                                                        | Publicada           |

Regras de papel: Home permite escolher a jornada; o detalhe oficial da Bike vive no Radar e equilibra compra com evidência contextual; conteúdo responde uma pergunta real e só então conecta Bike/Radar/Quiz/grupo relevantes.

## 3. Exceção do Quiz

**Não editar o Quiz durante trabalho de hub/navegação.** **O RESULTADO é terminal; a North Star é o clique direto no link Mercado Livre.** **Sem novo header e sem links exploratórios para Radar/Bikes/Comparação/Conteúdo; sem assistente com autoabertura.** **A regra de elegibilidade vale só para os resultados do Quiz.**

- Ações secundárias pré-existentes no resultado: compartilhar no WhatsApp e refazer quiz. Este é **registro para decisão explícita do responsável em tarefa separada do Quiz**, não instrução para alterar agora.
- As 30 bikes nomeadas da planilha, inclusive "Não Elegível", podem estar no catálogo editorial e em blocos factuais de modelos relacionados. **Nunca** chamar um modelo inelegível de recomendação do Quiz nem apresentá-lo como pior por ser inelegível.

## 4. Contratos de dados

- **Fonte:** Supabase é a fonte central de leitura pública: `public.bikes` + `bike_offers` alimentam o Radar e integrações via RPC read-only. A planilha permanece interface operacional do writer e de leitores internos já existentes.
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
4. Não existe rota pública `/comparar`; comparação integra o Radar. `/radar`, `/conteudos` e `/ferramentas` são rotas reais. `/bikes`, `/acompanhamento` e `/calc` são apenas aliases 301 e não devem ser usados em links internos novos.
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

## 7. Snapshot histórico — estado e lacunas em 23/09/2026

> Esta seção não representa o produto atual. Foi preservada apenas como registro
> da sequência de decisões e não deve ser usada para planejar trabalho novo.

- `/bikes` e `/bikes/{slug}` estão **publicados** e leem o catálogo do Supabase.
- `/comparar` e `/conteudos` **não são rotas funcionais**. `/radar` e `/ferramentas` são rotas reais.
- Não existe fonte de artigos; o contrato `BikeGuides` renderiza nada.
- A associação de vídeos existe, mas requer reconciliação (ex.: "GT20" ambíguo; T2, Voltz EVS, EV1 Sport fora da aba de bikes). **Não prometer cobertura completa de vídeos** até reconciliar.
- A leitura direta da planilha de catálogo **era** ponte temporária (histórico): desde a Etapa 10, `/bikes` e `/bikes/{slug}` leem o Supabase; a planilha segue interface operacional do writer.
- Trabalho pré-publicação: performance de imagem e payload (sem PageSpeed/CWV medido), `/bikes` e páginas de bike fora do sitemap, ausência de mapeamento explícito entre `/radar/{bikeId}` e `/bikes/{slug}`; páginas de detalhe fora do sitemap (dependem de geração dinâmica).


## Snapshot histórico — taxonomia de 23/09/2026

- Radar vigente: `/radar` e `/radar/{bikeId}` (publicados e verificados no domínio). `/acompanhamento` e `/acompanhamento/{bikeId}` respondem **301** para o equivalente em `/radar` (ID literal e query/UTM preservados).
- Ferramentas: `/ferramentas` é rota real **publicada** (deployment `7faa0513-44fa-4055-99c2-6b2966e6417d`; 200 com H1, canonical, seção "Um caminho para decidir" e links reais verificados no HTML SSR). `/calc` e `/calc/` respondem **301** para `/ferramentas` preservando query/UTM (verificado no domínio). Na Home, o bloco da calculadora tem ID canônico `#ferramentas` e mantém `#calc` como âncora alias para backlinks antigos.
- Rollback simples: remover o bloco de redirect em `src/server.ts` e reverter os links de navegação; nenhuma mudança de banco, Quiz, preço ou link afiliado envolvida.
- Links internos do Radar (menu, rodapé, Home, `/bikes`, cards, busca, assistente) usam `/radar`. Canonical das páginas do Radar = `/radar…`.
- `/bikes` continua sendo o destino para modelos sem preço monitorado; nada de histórico atribuído a eles.
- Quiz `/quiz` não foi alterado; seu resultado segue terminal, focado no clique direto ao Mercado Livre.
- Continuam proibidos links a `/comparar` e `/conteudos` (não existem).

## `/calculadoras/economia` e `/calculadoras/payback` — calculadoras rápidas (snapshot pré-publicação de 23/09/2026)

> **Estado atual (23/09/2026):** este brief é um snapshot da época do preview. As 9 rotas `/calculadoras/*` já foram **publicadas** (ver `docs/ROADMAP.md`) e são listadas em `/ferramentas`. `/comparar` e `/conteudos` continuam futuros e proibidos como links. O Quiz `/quiz` segue terminal, focado no clique direto ao Mercado Livre.

- **Decisões do visitante:** Economia — "trocar parte dos trajetos por uma bike compensa por mês?"; Payback — "em quanto tempo uma bike real se paga?".
- **Formato:** uma tela, sem wizard, etapas ou botão Calcular; campos começam vazios e o resultado aparece assim que os obrigatórios são válidos (antes disso, estado vazio honesto). Erros locais e acessíveis.
- **Controles:** Economia — modal (carro/Uber/transporte público/moto/misto), gasto mensal atual, km/dia, dias/semana, % substituível, orçamento opcional (Sem limite, R$ 5/7/10/15 mil, Outro valor) e garupa. Payback — os mesmos sem modal (gasto atual total dos trajetos avaliados, só custos que deixariam de existir).
- **Contrato de cálculo (`src/lib/mobility/`):** substituível = gasto mensal × %; custo da bike = km/dia × dias × 52/12 × % × energia/km central + manutenção central só com uso (premissas em `config.ts`); economia = substituível − custo da bike; anual = × 12. Payback por bike = preço atual ÷ economia mensal positiva (↑0,1 mês); saldos 12/24/36 = economia × meses − preço; economia ≤ 0 → sem payback. Gráfico começa no preço real da bike no mês 0.
- **Bikes:** `get_quiz_catalog` (elegíveis) ∩ `get_bikes_public_catalog` (oferta atual) por `bikeId`, lidas no carregamento; máx. 2 (menor preço + alternativa distinta de maior autonomia/capacidade); filtros rígidos de link meli.la, preço > 0, autonomia com margem, garupa e orçamento. 0% → sem bikes. Selecionar uma bike atualiza métrica, gráfico e insight da Payback sem reload.
- **CTAs condicionais:** ficha da bike, Radar só quando monitorada, anúncio Mercado Livre direto (analytics não bloqueante, `calculadora_economia` / `calculadora_payback`).
- **Estados sem dados:** fonte indisponível, orçamento inválido ou nenhuma bike compatível → texto explícito, sem afrouxar filtros nem inventar preço/link. Economia zero/negativa exibida como tal.
- **Limites:** sem financiamento, inflação, revenda, depreciação ou valor do tempo; custos fixos de veículo mantido nunca entram.
- **Privacidade:** nenhum nome, e-mail ou telefone é pedido ou enviado.
- **Sinergia:** `/ferramentas` é a porta de entrada; `/radar` responde "este preço está bom hoje?"; `/quiz` continua sendo a conversão terminal e não é alterado por esta página.

## Decisão histórica de 23/09/2026 — comparação em `/bikes` (superseded)

Esta decisão descreve a implementação removida em 15/10/2026. A comparação vigente
integra o detalhe `/radar/{bikeId}`; `/bikes?compare=...` é apenas URL legada e
redireciona para o Radar sem reconstruir o estado antigo.
