# Últimos vídeos na Home — 08/10/2026

## Revisão prévia
Classificação: estrutural por reutilizar integração Sheets e criar rota pública com metadata. Implementação no checkout sincronizado `worktrees/admin-analytics-v2`; checkout raiz permanece referência.

| Perspectiva | Impacto / risco / dependência / recomendação |
| --- | --- |
| Produto | Quatro últimos vídeos após WhatsApp e catálogo fora do menu. Evitar ampliar navegação; prosseguir. |
| CTO | Reutilizar loader SSR, cache e cards existentes; risco de latência mitigado pelo timeout e stale existentes; prosseguir. |
| IA | Não envolve geração; usar exclusivamente catálogo real; prosseguir. |
| Segurança | Somente metadados públicos e URLs YouTube validadas; sem novos secrets ou permissões; prosseguir. |
| UX | Grade responsiva, foco e data; navegação interna na mesma aba; estado vazio explícito; prosseguir. |
| CX | Mesma aba Videos Youtube, sem novo cadastro ou rotina; prosseguir. |
| Growth | Canonical próprio /videos, descrição e título; sem mudar menu nem rotas legadas; prosseguir. |
| PMO | Verificar ordem, limite quatro, catálogo completo, rota e gate validate; publicação depende de autorização; prosseguir. |

## Decisão consolidada
Escopo: carregar quatro vídeos na Home, após OffersBanner; /videos lista todo o catálogo por data decrescente, sem limite arbitrário. Datas ausentes ficam ao fim conforme parser existente. Reutilizar VideoCards, sem player/iframe. Sem alterações em dados, RLS, menu ou fonte externa. Dependência: catálogo/cache existente. Aceite: quatro itens quando disponíveis, link interno, todos os itens na nova rota, SSR e vazio tratado. Rollback: reverter arquivos desta mudança; nenhuma migration.

Trade-off: leitura do catálogo acrescenta até o timeout existente na primeira carga; execução paralela aos demais loaders e cache de dez minutos mitigam. Falha permite Home funcional e catálogo vazio, sem conteúdo fictício. Não houve parecer independente de agentes nem consenso atribuído a terceiros; revisão das oito perspectivas feita nesta tarefa.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Seção imediatamente após OffersBanner, CTA /videos, quatro itens no loader. |
| CTO | Pass | Loader SSR paralelo, serviço e cache reutilizados; typecheck/build aprovados. |
| IA | N/A | Nenhum agente, prompt ou conteúdo gerado alterado. |
| Segurança | Pass | Parser existente valida YouTube; retorno contém apenas campos públicos; nenhum segredo ou banco alterado. |
| UX | Pass | Cards existentes com grade 1/2/4, imagens lazy e dimensão, foco, títulos e data; vazio explícito e link interno. Inspeção de código; sem QA visual de navegador. |
| CX | Pass | Fonte operacional e cadastro existentes preservados. |
| Growth | Pass | Metadata e canonical /videos; vazio noindex; header/menu sem alteração. |
| PMO | Pass | 43 testes direcionados aprovados, pnpm validate aprovado e diff --check limpo. |

Fechamento: implementação local concluída no snapshot 1ad287a. Gate validate: typecheck, regressões direcionadas previstas pelo script e build. Teste adicional cobre cronologia e catálogo completo. Nenhum serviço pago, escrita externa, migration, push ou publicação executado. Risco residual: estado vazio não diferencia indisponibilidade de catálogo vazio, conforme comportamento do serviço existente; integração real e aparência no preview devem ser conferidas antes da publicação. Release depende de autorização específica. Rollback por reversão do diff, sem alteração em dados.
