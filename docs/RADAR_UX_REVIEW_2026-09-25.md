# Radar — revisão do corte de UX (25/09/2026)

## Governança — revisão pré-implementação

Classificação: **estrutural**. O corte altera Radar, leitura de preços, captura de interesse em alerta e inscrição na newsletter. O usuário confirmou a distinção: alerta pede nome, WhatsApp e e-mail; newsletter pede nome e e-mail.

| Perspectiva | Impacto | Risco e dependência | Recomendação |
| --- | --- | --- | --- |
| Produto e Estratégia | Rankings antes do catálogo e jornada de bike mais direta; inscrição na newsletter | Destaque parecer oferta fabricada ou newsletter prometer envio ativo | Prosseguir com dados observados e captar inscrição sem disparo |
| CTO e Arquitetura | Reordenação SSR, gráfico e contratos de alerta/newsletter | Histórico não pode inventar dias; formulários dependem de schema | Prosseguir localmente; migrations e funções exigem release coordenado |
| IA e Agent Engineering | Nenhuma geração nova | Texto de anúncio pode contaminar “Boa para” | Restringir a campos editoriais confiáveis |
| Segurança | Dados pessoais nos dois formulários | Consentimento, RLS, antispam e minimização | Consentimento separado por finalidade, acesso só por service role e limite de tentativas |
| UX/UI | Filtros exclusivos, cartão alinhado, gráfico e modal legíveis | Mobile e estados sem histórico | Layout responsivo e linguagem factual |
| CX e Operação | Preferência de alerta e inscrição armazenadas | Entrega de alerta/newsletter segue desligada | Não prometer disparos antes de operação aprovada |
| Growth e CRO | Destaques antes da listagem e mais vídeos relacionados | Performance/SSR e alegações sem base | Exibir vídeos associados até teto defensivo de 200 e sem promessas de preço |
| PMO e QA | Release em duas camadas (web + Supabase) | Deploy isolado quebra formulários | Validar contratos, migrations, rollback e pedir autorização específica |

Conflito: o pedido de linha contínua não autoriza imputar preços ausentes. Decisão: unir visualmente apenas observações disponíveis; datas sem preço continuam nulas nos dados. O farol com histórico curto é uma escala visual entre mínimo e máximo, não uma avaliação de oportunidade.

Decisão consolidada: mover destaque e rankings; filtro rápido de seleção única; simplificar gráfico mantendo preços reais; melhorar ficha, vídeos e alerta com e-mail/valores sugeridos; ativar inscrição de newsletter com nome/e-mail, sem envio. Fora de escopo: envio automático de alerta ou campanha, alteração de preço/dados de produção. Rollback: reverter o commit web/Edge Functions e, se migrations aditivas já tiverem sido aplicadas, manter colunas/tabelas inertes até decisão de reversão dos dados.

Critérios de aceite: ranking antes do catálogo; no máximo um filtro rápido ativo; nenhum ponto vermelho/cinza ou linha tracejada no gráfico; escala colorida factual; descrição em largura adequada; todos os vídeos associados até o teto defensivo da API (200); modal centrado; nome, WhatsApp, e-mail e meta válida obrigatórios no alerta; nome/e-mail e consentimento na newsletter; nenhuma mensagem enviada automaticamente.

## Sequência de release proposta

1. Aplicar as duas migrations aditivas, sem alterar linhas existentes.
2. Publicar as Edge Functions `bike-price-alert` e `newsletter-interest`; verificar registro de teste controlado e RLS, sem disparar mensagens.
3. Publicar a aplicação web e conferir Home, `/radar`, `/radar/v9_max` e formulários.
4. Se houver regressão, reverter aplicação e funções para a revisão anterior. As tabelas/colunas aditivas podem ficar inertes; qualquer remoção de dados exige decisão separada.

Nenhuma dessas ações externas faz parte da edição local e nenhuma está autorizada por esta documentação.

## Governança — revisão pós-implementação local (25/09/2026)

| Perspectiva | Status | Evidência ou pendência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Destaque/rankings precedem catálogo; sem novo CTA afiliado no Radar |
| CTO e Arquitetura | Pass local | Contrato e migrations aditivas revisados; typecheck e build passaram. A aplicação de produção continua pendente. |
| IA e Agent Engineering | Pass | “Boa para” ignora descrições de anúncio e aceita só campos editoriais |
| Segurança | Fail para release | Consentimento, RLS e antispam revisados no código; falta aplicar e verificar migrations, funções e acesso aos dados em produção. |
| UX/UI | Pass local | Navegador interno confirmou ordem das seções, exclusividade dos filtros, régua/pin, linha do gráfico, modal centralizado e campos da newsletter em largura móvel. Revisão desktop no ambiente publicado ainda pendente. |
| CX e Operação | Pass | Ambos os fluxos explicitam que não há envio automático |
| Growth e CRO | Pass | Vídeos associados sem teto de 12; título, URL e CTA afiliado existentes preservados |
| PMO e QA | Pass local; Fail para release | `pnpm validate` passou: typecheck, 36 testes direcionados e build. Teste adicional do gráfico passou (2 casos); smoke local de Radar, detalhe, alerta e Home realizado. Deploy e smoke de produção pendentes. |

Release **bloqueado** enquanto qualquer `Fail` persistir. O código está somente no worktree local `codex/radar-ux-sep25`; nenhuma migration, função ou página foi publicada. A publicação web foi solicitada, mas as duas migrations e as funções que recebem dados pessoais exigem autorização específica antes da sequência coordenada descrita acima.
