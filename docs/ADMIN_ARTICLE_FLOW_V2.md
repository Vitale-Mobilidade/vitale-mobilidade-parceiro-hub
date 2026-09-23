# Admin editorial — fluxo de artigo em um clique (proposta de código)

Status em 23/09/2026: implementado **somente na branch de trabalho**, sem merge, deploy ou publicação. A experiência autenticada e a geração real com IA ainda precisam de uma passagem operacional com um vídeo real antes de declarar o fluxo concluído. As afirmações de release em `ADMIN_EDITORIAL_P0.md` descrevem a versão anterior.

## Intenção e jornada

O operador cola URL do YouTube, título e transcrição integral e aciona **Gerar artigo** uma vez. A interface reutiliza o vídeo cadastrado quando existe e executa, sem novos campos obrigatórios: salvar vídeo/thumbnail e relações inferíveis → criar ou retomar rascunho → compilar blocos editoriais/SEO/OG → completar conexões determinísticas → validar/corrigir problemas simples → abrir a prévia privada. Se uma etapa falha, o rascunho anterior é preservado e a tela oferece acesso contextual a ele. Não há publicação automática.

Na prévia, o operador vê o artigo como público, imagem social, bike detectada, vídeo, Radar e relações. Pode voltar ao editor visual, ajustar texto/blocos, regenerar apenas resumo/FAQ/bloco/metadata, validar e publicar após revisão explícita. Campos técnicos permanecem em “Avançado”. Revisões anteriores ficam registradas no log privado; esta fase exibe o histórico, mas **não** faz restauração automática.

## Fontes de verdade e salvaguardas

| Elemento | Fonte | Regra |
| --- | --- | --- |
| Vídeo e thumbnail | YouTube ID; resolução da imagem verificada | Preferir maior miniatura disponível; preservar a anterior se a consulta falhar; fallback institucional apenas quando necessário. |
| Bike principal e relacionadas | Catálogo `bikes` + aliases conhecidos; título e transcrição | Variante exata vence nome contido; comparação ambígua pede confirmação contextual. IDs permanecem estáveis. |
| Experiência, números, FAQ | Transcrição fornecida | IA recebe fonte como dado não confiável; blocos factuais exigem trecho literal de apoio; revisão humana continua necessária. |
| Oferta, preço, link Mercado Livre | Projeção comercial atual do Supabase | IA não gera valores nem URLs. Renderização consulta o par preço/link atual da mesma bike; clique vai direto ao destino. |
| Radar, Quiz, comparações, relacionados | Blocos tipados e vínculos reais | Radar/CTA entram quando há bike e oferta atual; vídeo original entra sempre; Quiz/Comparador só quando editorialmente pertinentes; relacionados somente quando existentes. |
| SEO, canonical, OG, JSON-LD | Artigo publicado + rota SSR | Metadata por artigo, OG da miniatura por padrão, canonical da rota e schemas sem números inventados. |

“Pronto” no validador significa **tecnicamente elegível para revisão**, não que a IA foi infalível. Erros não comprovados ou ambiguidade devem ficar visíveis de forma localizada. O botão Publicar exige validação limpa e confirmação humana; a transição também é protegida no banco.

## Revisão por oito perspectivas — antes e depois do código

| Perspectiva | Decisão e verificação | Estado |
| --- | --- | --- |
| Produto | Um gesto produz prévia útil; não transformar a operação em formulário técnico. | Código implementado; ensaio real pendente. |
| CTO | Reutilizar Supabase, Edge Function, blocos tipados e SSR; sem novo schema ou writer Sheets. | Revisado no diff. |
| IA | Transcript não confiável, saída filtrada, fonte literal por bloco factual, preço/link fora do modelo. | Testes de contrato; qualidade editorial real pendente. |
| Segurança | Auth e papéis existentes; service role server-side; logs privados; sem publicação automática. | Revisado no diff; ensaio de papéis não repetido. |
| UX/UI | Três entradas, progresso, falha recuperável, preview direto e editor visual com exceções. | Código implementado; inspeção autenticada desktop/mobile pendente. |
| CX/Operação | Aproveitar vídeo/planilha existentes e não tocar nos dados comerciais. | Fluxo preservado; operador ainda precisa confirmar ambiguidades. |
| Growth/CRO | Conteúdo liga vídeo, bike, Radar e oferta direta quando existem, sem CTA fictício. | Componentes conectados; conversão real não aferida. |
| PMO/QA | `pnpm validate` e testes editoriais direcionados; não declarar primeiro artigo concluído sem execução real. | Gates de código passaram; gate operacional pendente. |

## Aceite que falta demonstrar antes de merge/release

1. Gerar um artigo com uma transcrição real em ambiente controlado e conferir título, H1/H2/H3, trechos de fonte, vídeo e miniatura OG.
2. Confirmar a bike/variante detectada, oferta atual e Radar sem divergência de preço/link; quando não houver oferta, não exibir CTA de compra.
3. Revisar preview desktop/mobile, edição de bloco, regeneração pontual, falha recuperável, papéis e publicação bloqueada até revisão humana.
4. Conferir HTML SSR e metadata por artigo, além de ausência de regressão em Quiz, Sheets e Radar.

Rollback do código: reverter somente a branch/commit editorial; não há migration nesta revisão. Dados editoriais existentes permanecem preservados. Não publicar o fluxo enquanto estes gates operacionais não forem concluídos.
