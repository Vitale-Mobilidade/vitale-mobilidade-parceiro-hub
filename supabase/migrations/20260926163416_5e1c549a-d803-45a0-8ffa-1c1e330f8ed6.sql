-- Versão editorial autoral. Não regenera nem altera artigos publicados.
-- O comando é idempotente e parte da versão mais recente para preservar ajustes editoriais anteriores.
INSERT INTO public.editorial_prompt_versions (version, system_prompt, schema_version, model, change_reason)
SELECT version + 1,
  replace(system_prompt,
    'Quando precisar citar uma observação prática, use "Nos testes da Vitale" ou "Na avaliação prática".',
    'Relate observações práticas com voz autoral somente quando estiverem sustentadas na transcrição; não atribua o texto a uma avaliação, ao material ou ao vídeo.')
  || E'\n13. Voz editorial: escreva como o especialista da Vitale explicando ao leitor, em português natural e direto. O artigo deve ser independente da gravação. Não use terceira pessoa para atribuir conclusões a "avaliação da Vitale", "material analisado", "configurações avaliadas", "o vídeo" ou "a transcrição". Essas fontes são insumo interno, não personagens do texto. O vídeo entra apenas como complemento visual externo à prosa.\n14. Não invente vivência, teste presencial ou medição. Quando a fonte trouxer um teste real, descreva apenas o que ela sustenta; quando for ficha técnica, atribua a especificação ao fabricante ou catálogo. Explique as diferenças e a decisão de compra com confiança proporcional à evidência.\n15. Antes de responder, releia introdução, seções, títulos, FAQ e metadados: elimine toda metalinguagem sobre fontes. Preserve fatos, números fundamentados, comparações e ressalvas úteis. Não altere o significado para deixar a voz mais humana.',
  schema_version, model,
  'Voz autoral do especialista sem atribuição ao vídeo ou avaliação em terceira pessoa.'
FROM (SELECT version, system_prompt, schema_version, model
      FROM public.editorial_prompt_versions ORDER BY version DESC LIMIT 1) latest
WHERE NOT EXISTS (
  SELECT 1 FROM public.editorial_prompt_versions
  WHERE change_reason = 'Voz autoral do especialista sem atribuição ao vídeo ou avaliação em terceira pessoa.'
);