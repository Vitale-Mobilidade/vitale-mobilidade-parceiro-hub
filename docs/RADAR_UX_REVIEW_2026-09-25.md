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

Essas ações foram autorizadas pelo usuário no fio da tarefa e executadas na sequência abaixo. A documentação, por si, não autoriza novas ações externas.

## Governança — revisão pós-publicação (25/09/2026)

| Perspectiva | Status | Evidência ou pendência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Destaque/rankings precedem catálogo; sem novo CTA afiliado no Radar |
| CTO e Arquitetura | Pass | Contrato e migrations aditivas revisados; typecheck, build e as duas migrations em produção verificados. |
| IA e Agent Engineering | Pass | “Boa para” ignora descrições de anúncio e aceita só campos editoriais |
| Segurança | Pass | Consentimento, RLS e antispam revisados; tabelas novas com RLS ativo, políticas restritivas e permissões de `anon`/`authenticated` revogadas em produção. As duas funções responderam HTTP 400 para corpos inválidos sem gravar dados; não há envio automático. |
| UX/UI | Pass | Navegador interno confirmou no domínio publicado destaque/rankings antes do catálogo, filtro exclusivo, régua/pin, gráfico contínuo, modal centralizado, mais vídeos e newsletter. |
| CX e Operação | Pass | Ambos os fluxos explicitam que não há envio automático |
| Growth e CRO | Pass | Vídeos associados sem teto de 12; título, URL e CTA afiliado existentes preservados |
| PMO e QA | Pass | `pnpm validate` passou: typecheck, 36 testes direcionados e build. Teste adicional do gráfico passou (2 casos); smoke no domínio publicado de Radar, detalhe, alerta e Home realizado. |

Release executado após autorização explícita: o Lovable aplicou o patch sobre `5caf9b5`, aplicou as duas migrations, publicou `bike-price-alert` e `newsletter-interest`, e a publicação web foi acionada (deployment `9b48bba9-3184-4c0f-adb2-90564ddbe9db`). O domínio `vitalemobilidade.com` exibiu a nova versão. Como proteção adicional, revogamos as permissões padrão de `anon` e `authenticated` nas tabelas novas; a migration de origem foi atualizada para reproduzir essa medida. Não houve envio nem inscrição real de teste. O `git push` direto retornou 403, então a integração ocorreu pelo Lovable; commit resultante `82539db2a66578b107fd8f424724e736b571b9ed`.
