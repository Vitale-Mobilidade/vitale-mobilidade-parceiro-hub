# Admin editorial P0 — branch de desenvolvimento

Status em 23/09/2026: **código local, não publicado; migration não aplicada; função não implantada; nenhum usuário provisionado; nenhuma chamada paga de IA feita.** O painel `/painel-bikes` e os fluxos de Sheets, Supabase, Quiz, Radar e Mercado Livre permanecem inalterados.

## Intenção e escopo

O Admin existe para transformar vídeos reais da Vitale em artigos revisados e publicados, não para substituir a planilha ou criar um ERP. A jornada P0 é: aba `Videos Youtube` → cadastrar transcrição/relações → criar rascunho → Article Compiler estruturado → editar blocos → validar → revisão humana → preview → publicar. Sem transcrição e revisão não há publicação.

Rotas privadas: `/admin`, `/admin/bikes`, `/admin/videos`, `/admin/conteudos`, `/admin/conteudos/novo`, `/admin/conteudos/{id}`, `/admin/conteudos/{id}/preview`, `/admin/ia`, `/admin/logs`. Todas recebem `noindex, nofollow`. O Assistente Vitale não aparece no Admin. Rotas públicas novas: `/conteudos` e `/conteudos/{slug}`, somente com artigos publicados; metadata e HTML por artigo no SSR.

## Propriedade dos dados

| Dado | Fonte/owner | Admin P0 |
| --- | --- | --- |
| Preço, oferta, link `meli.la`, elegibilidade, sync | Sheets → writer existente → `bikes`/`bike_offers` | Somente leitura; o painel antigo continua sendo o controle de sync |
| Catálogo de vídeos já existentes | Aba `Videos Youtube` | Lê o catálogo; importa explicitamente por YouTube ID para acrescentar transcrição e relações editoriais |
| Transcrição, artigo, prompt, execução de IA, logs | Novas tabelas editoriais privadas | Edição por pessoas autorizadas, com trilha de auditoria |
| Artigo publicado | RPC pública de projeção | SSR lê somente o estado `published`; rascunhos/transcrições não saem pela RPC |

O vínculo é pelo `bike_id` estável. O parser de vídeo existente não foi reescrito. Nenhum writer comercial novo foi criado. O link de compra continua direto; o bloco de artigo usa a oferta atual da mesma bike, nunca um URL produzido pela IA.

## Autenticação e papéis

O novo Admin usa usuários individuais do Supabase Auth e a tabela `editorial_admin_memberships`. Não há autoatribuição de papel. Cada chamada da Edge Function `editorial-admin` verifica o JWT com `auth.getUser` e consulta a associação ativa antes de usar a service role; o navegador não recebe essa chave. Todas as tabelas editoriais têm RLS ligado e nenhum grant direto a `anon` ou `authenticated`.

- `admin`: editorial, prompt e logs;
- `content`: vídeos e artigos;
- `operation`: visão geral e leitura de bikes.

O `/painel-bikes` preserva sua autenticação própria por enquanto. Esta convivência é uma **limitação explícita do P0**: o operador ainda precisa entrar no painel antigo para forçar sync. Não copiar a senha compartilhada para o novo Admin nem trocar a autenticação do fluxo comercial sem plano próprio de migração. O item `Usuários` não virou interface nesta fase: provisionamento ocorre por Supabase Auth + membership controlada.

## Compiler e gate editorial

O prompt é versionado e usa o modelo já empregado no projeto (`google/gemini-2.5-flash` no Lovable AI Gateway), com chave apenas na Edge Function. A transcrição entra como dado não confiável. A saída passa por allowlist de campos e blocos; `status`, links afiliados, HTML arbitrário e dados administrativos da resposta da IA são ignorados.

A validação automática exige transcrição, vídeo e bike IDs existentes, SEO, imagem OG HTTPS, blocos tipados e trechos literais de fonte para resumo/texto/FAQ. Números em texto precisam constar no trecho citado. Relações com artigos devem apontar a artigos publicados. Essas regras reduzem erros, **não demonstram sozinhas que toda conclusão está correta**: revisão humana do vídeo, afirmações, números, contexto e preview continua obrigatória. O banco rejeita transição para `published` sem revisão e sem validação limpa. Edições de conteúdo invalidam a revisão. Geração e regeneração nunca publicam automaticamente.

Artigos usam blocos tipados; não há HTML livre. Exclusão física só é aceita para artigo arquivado, por `admin` e com confirmação literal do slug. Preferência normal: despublicar ou arquivar. Logs registram mudanças de estado, geração, falhas e versão de prompt; não registram transcrição ou cliques de interface.

## Revisão multidisciplinar — decisão pré-implementação

Classificação: **estrutural**, por adicionar autenticação, schema, IA e publicação SEO.

| Perspectiva | Impacto, risco e decisão |
| --- | --- |
| Produto | Acelera o primeiro artigo sem construir ERP. Condição: manter Bike central e fluxo vídeo→artigo. |
| CTO | Tabelas editoriais privadas e uma API administrativa; não duplicar writer Sheets. Condição: migration antes de frontend público. |
| IA | Grounding obrigatório e saída estruturada; risco de alucinação residual. Condição: revisão humana e nenhum auto-publish. |
| Segurança | Senha compartilhada não serve a papéis editoriais. Condição: Supabase Auth individual, membership privada, RLS fechado e sem acesso service role no cliente. |
| UX/UI | Lista→editor→preview; evitar editor genérico. Condição: estados vazios/erro e botões indisponíveis quando rascunho está sujo. |
| CX/Operação | Sheets segue fonte comercial; operação editorial separada. Condição: manter `/painel-bikes` e explicar o acesso transitório duplo. |
| Growth/CRO | Artigo deve ligar vídeo, bike, Radar e oferta direta sem inventar preço. Condição: publicação só com SEO e links reais. |
| PMO/QA | Alteração estrutural não deve ir ao vivo pelo simples build. Condição: recuperação do banco, teste de papéis, validação editorial e autorização de publicação. |

Decisão consolidada: **GO para implementação local; NO-GO para release nesta task.** O ponto de conflito é velocidade versus segurança de autenticação/publicação; resolvido mantendo o legado operacional e deixando a nova base privada e não implantada até os gates abaixo.

## Revisão pós-implementação (oito perspectivas)

- **Produto:** o fluxo P0 cabe num Admin editorial; os módulos P1/P2 não foram antecipados.
- **CTO:** Bike segue entidade central; leitura pública editorial é projeção SSR e não altera o writer comercial. `pnpm validate` passou.
- **IA:** saída do Compiler é filtrada e não publica sozinha; validação automática não substitui checagem humana de contexto.
- **Segurança:** service role restrita à Edge Function, login por usuário, memberships e RLS fechada; o ensaio real de papéis ainda depende do ambiente de homologação.
- **UX/UI:** acesso desktop/mobile foi inspecionado localmente; telas autenticadas ainda precisam de inspeção com usuário de teste provisionado. O chat externo do GTM foi excluído da área `/admin`.
- **CX/Operação:** catálogo comercial permanece somente leitura, com atalho para o painel antigo; coexistência de dois logins é a limitação operacional explícita.
- **Growth/CRO:** artigo publicado pode conectar vídeo, bike, Radar e link afiliado direto da oferta atual; falta o primeiro conteúdo real para provar a jornada completa.
- **PMO/QA:** testes direcionados, typecheck e build passaram; migration, Edge Function, papéis e publicação não foram executados.

## Gates de release e rollback

Antes de aplicar a migration: captura recuperável e ensaio isolado de restauração do banco, por envolver schema/RLS/auth. Depois, ordem: (1) migration aditiva; (2) criar usuários de teste no Supabase Auth e memberships explícitas; (3) implantar `editorial-admin`; (4) testar negações de acesso por papel e ausência de leitura pública de drafts; (5) validar importação de vídeo, transcrição, geração, erro, edição, preview, publicação/despublicação e SEO/sitemap com um conteúdo real; (6) publicar frontend somente com autorização atual do responsável.

Rollback preferido: reverter o frontend para o deployment anterior, desabilitar a Edge Function editorial, despublicar artigos via status e preservar as tabelas aditivas privadas para diagnóstico. **Não** apagar dados ou reaplicar migrations antigas. Uma falha na RPC editorial não derruba o sitemap de Bike/Radar, mas deixa temporariamente de listar artigos; nunca publicar frontend novo antes da migration, pois `/conteudos` depende dessa RPC.

Pendências objetivas antes de declarar P0 concluído: usuários/papéis provisionados; ensaio de recuperação; Edge Function implantada; exercício real do Compiler com transcrição aprovada; primeiro artigo revisado e publicado; integração do painel comercial ao SSO (ou decisão explícita de manter acesso duplo). Nenhuma dessas foi presumida pelo build local.
