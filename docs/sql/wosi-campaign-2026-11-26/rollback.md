# Rollback

Reverter o frontend e as alterações nas Edge Functions `site-analytics` e `editorial-admin`. Não apagar a tabela nem os agregados; nenhum objeto existente é alterado pelo forward.sql. Preservar os gates e grants anteriores das demais funções. Não alterar journals manualmente; aplicar somente por mecanismo oficial após aprovação.
