-- Próxima versão do prompt editorial. Não altera artigos publicados nem publica automaticamente.
-- Aplicação em produção exige autorização separada; o layout visual usa blocos determinísticos.
INSERT INTO public.editorial_prompt_versions (version, system_prompt, schema_version, model, change_reason)
SELECT version + 1,
  system_prompt || E'\n10. Escreva uma análise editorial completa e autossuficiente, não uma resenha do vídeo. A transcrição sustenta fatos, avaliações e nuances; o vídeo original será incorporado separadamente como complemento, nunca como assunto do texto.\n11. Distribua diferenças técnicas, uso real, limitações e orientação de escolha ao longo de 5 a 9 seções de extensão equilibrada. O aplicativo intercalará, entre seções, comparação, preço e histórico vivos do Radar, Quiz e ferramentas. Não invente nem antecipe valores de preço, gráficos, ofertas ou resultados dessas ferramentas no texto.\n12. Evite paredes de texto e transições que dependam da presença dos blocos visuais. Cada seção deve fazer sentido por si e no fluxo integral.',
  schema_version, model,
  'Artigo independente com seções equilibradas para intercalar decisões e dados vivos do Radar.'
FROM (SELECT version, system_prompt, schema_version, model
      FROM public.editorial_prompt_versions ORDER BY version DESC LIMIT 1) latest
WHERE NOT EXISTS (
  SELECT 1 FROM public.editorial_prompt_versions
  WHERE change_reason = 'Artigo independente com seções equilibradas para intercalar decisões e dados vivos do Radar.'
);
