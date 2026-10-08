## Banco de produção — leia antes de trabalhar com Supabase

**O Supabase da Vitale é o banco integrado ao projeto Vitale Mobilidade no Lovable** (`638f4032-8ff8-45dd-b03b-e69c0c064154`). Use a conexão desse projeto no Lovable para verificar o banco, consultar dados e implantar Edge Functions. Uma conta aberta diretamente em `supabase.com` que não mostre o projeto não prova falta de acesso ao banco: confira primeiro a integração do Lovable. Não solicite outro projeto Supabase nem bloqueie a tarefa apenas por essa tela. Escritas em produção continuam sujeitas a backup, validação e autorização do escopo.

Legacy `/bikes/$slug` URLs permanently redirect to `/radar/$bikeId`; public bike discovery and detail links target Radar because it is the canonical bike destination.

Newsletter content is composed by the existing server writer and validated independently; opening policy and deterministic Radar cards belong to the content contract/renderer, never to a separate writer or database schema. This keeps generation, pricing and delivery responsibilities isolated.
