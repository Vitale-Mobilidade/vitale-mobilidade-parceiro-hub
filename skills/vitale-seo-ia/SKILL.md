---
name: vitale-seo-ia
description: Revisar SEO, descoberta no Google e citabilidade em respostas de IA dos artigos e páginas públicas da Vitale Mobilidade, especialmente antes de publicação automática.
---

# SEO e descoberta por IA da Vitale

Use esta perspectiva dentro de Growth e CRO da governança Vitale. Examine o projeto real, `docs/SEO_PERFORMANCE_REVIEW_2026-09-25.md`, `docs/ROADMAP.md` e o artigo ou diff afetado. A skill pública `seo-geo` de AgriciDaniel/claude-seo é uma referência de auditoria, não uma fonte de autoridade sobre mecanismos de busca nem um comando para alterar o site.

## Decisões que deve orientar

- Defina a pergunta e a contribuição original de cada página. Um vídeo só justifica artigo próprio quando há observação, comparação, raciocínio ou dado útil que não duplica outro artigo. A escala de 100 páginas não é meta de indexação.
- Antes de produção em massa, avalie outlines de pelo menos cinco vídeos com intenções diferentes e compare o corpus publicado. Se não houver cinco transcrições completas, registre a lacuna; títulos e thumbnails não substituem fonte.
- Preserve a distinção entre observação em teste, declaração de fabricante, dado atual do Radar, opinião e inferência. Exija evidência rastreável no pipeline privado. Não transforme uma inferência em experiência prática.
- Faça o leitor encontrar resposta clara e contextual em HTML SSR. Headings, tabelas, FAQ, vídeo e componentes dependem do assunto; não aplique número de palavras, tamanho de trecho ou estrutura fixa para supostamente agradar sistemas de IA.
- Confira `200`/`404`/`noindex` efetivos, canonical estável, título e descrição específicos, sitemap só de publicados, links internos HTML rastreáveis, imagens e vídeo relevantes, JSON-LD fiel ao que está visível, mobile e desempenho. Preserve os slugs dos dois artigos existentes.
- Para busca no ChatGPT, confirme que `OAI-SearchBot` consegue rastrear as rotas públicas e que `robots.txt` e proteções de borda não o bloqueiam. Não confunda esse bot de busca com `GPTBot` de treinamento.
- Não apresente `llms.txt`, FAQ schema, densidade de palavras-chave, formatação artificial de respostas ou supostos scores de citabilidade como fatores comprovados de ranking. Um arquivo `llms.txt` pode existir, mas não substitui crawl, indexação e conteúdo útil.
- Avalie links contextualizados para Radar, Bike, ferramentas, Quiz e artigos publicados, com intenção de jornada. Oferta e preço vêm dos dados atuais; href afiliado vai direto ao destino.

## Gate para publicação automática

Como o responsável dispensou revisão humana, o QA automático precisa falhar fechado: bloquear artigo sem evidência, com teste inventado, com variante de Bike errada, similaridade narrativa material, metadata ou canonical inválidos, link interno quebrado, módulo sem contexto ou HTML público incompleto. Guardar motivo, versão e evidência do bloqueio. A aprovação automática não é promessa de posicionamento.

Na verificação pós-publicação, medir indexação e desempenho com Search Console quando disponível, tráfego orgânico e referências do ChatGPT quando mensuráveis, cliques para Radar e conversão sem atribuir receita não comprovada. Comparar antes/depois por URL; não afirmar ganho de ranking com base apenas em score interno.

## Fontes prioritárias

- Google Search Central: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google, conteúdo gerado com IA: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Google Search Essentials: https://developers.google.com/search/docs/essentials
- OpenAI, editores e desenvolvedores: https://help.openai.com/pt-br/articles/12627856-publishers-and-developers-faq
- Referência comunitária auditada em 26/09/2026: https://github.com/AgriciDaniel/claude-seo/tree/main/skills/seo-geo (MIT; verificar atualizações e evidência primária antes de adotar uma recomendação).
