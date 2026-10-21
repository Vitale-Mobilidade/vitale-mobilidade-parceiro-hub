# Faixas visuais de scroll — 20/10/2026

Classificação estrutural: analytics e UX. Autorizado nesta conversa implementar e publicar faixas de 25/50/75/100% na própria referência visual. Sem nova migration, API ou coleta de dados pessoais.

## Revisão prévia e decisão consolidada
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Visualizar onde a amostra chegou; entradas não equivalem a pessoas únicas; prosseguir com rótulos corretos. |
| CTO | Overlay somente Admin; reutiliza bins de scroll existentes e altura medida da referência; corrigir perda do último evento pelo throttle; prosseguir com testes. |
| IA | Sem modelo ou geração; N/A. |
| Segurança | Sem dados ou permissões novos; iframe mantém scripts desativados; prosseguir. |
| UX | Faixas sem ocultar página, contagens e atalhos aos marcos; zero/sem base distintos; prosseguir com QA visual. |
| CX | Explicar amostragem e referência atual; prosseguir. |
| Growth | Não prometer leitura ou pessoas únicas; não inventar percentual em base ausente/inconsistente; prosseguir. |
| PMO | Testes de renderização e scroll rápido/final; pnpm validate e publicação já autorizada; prosseguir. |

Escopo: faixas com contagem e proporção das entradas amostradas, toggle, atalhos de navegação na referência, tabela preservada. Corrigir coleta de rolagem rápida com verificação final agendada e antes de descarregar a página. Sem reconstrução retroativa ou identificação pessoal. Trade-off: a altura da referência atual pode diferir da visita original; rótulo de referência atual preservado. Rollback: reverter o commit web desta tarefa; sem alteração de tabela/função backend. Custo externo: sem créditos de geração; hosting existente.

## Revisão posterior local
Produto Pass (contagens por marco e linguagem sem pessoas únicas); CTO Pass (overlay Admin, verificação trailing e flush final sem API/schema novos); IA N/A (sem modelo); Segurança Pass (permissões e iframe preservados, nenhuma coleta nova); UX Pass (marcos, cores, rótulos com zoom, toggle e atalhos renderizados; QA autenticado após publicação); CX Pass (sem base e amostra explícitas); Growth Pass (proporções calculadas somente com base válida, tabela preservada); PMO Pass (8 testes direcionados, lint sem avisos, pnpm validate com typecheck/64 regressões/build). Conflito: “pessoas” substituído por “entradas amostradas” para não afirmar unicidade. Autorização de publicação explícita na solicitação atual; nenhuma operação de geração Lovable necessária.

## Release confirmado
Commit 95e44886ff10fed7002662553d70f4b59abbd7b1 sincronizado com o projeto ativo. Deployment 9c41b321-ed7f-44c5-8dc8-58b677491063 publicado. QA autenticado no Chrome do proprietário confirmou o toggle ligado, os quatro atalhos e os quatro rótulos com contagem em 25/50/75/100%. A faixa de 25% foi conferida visualmente sobre a página, com contador zero e mensagem de base ausente coerentes com o filtro celular sem cobertura. Atalhos de 25% e 100% acionados sem navegação da página pública. Nenhum dado de teste inserido no banco nesta tarefa. Nenhuma migration, implantação de função ou geração paga Lovable. Testes: oito direcionados, lint direcionado sem avisos e pnpm validate (64 regressões, typecheck e build). Oito perspectivas mantêm Pass/N/A da revisão acima; estado publicado. Rollback por reversão do commit web, sem apagar dados.
