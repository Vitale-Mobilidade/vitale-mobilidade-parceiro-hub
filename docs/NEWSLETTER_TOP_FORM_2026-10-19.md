# Formulário na abertura da newsletter — 19/10/2026

Classificação: relevante, por afetar diretamente conversão e jornada de inscrição. Mudança de posição do componente existente; sem alterar integração, SEO ou contrato de dados.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Restaura inscrição como ação principal; evitar distrações antes do formulário; depende do componente existente; prosseguir. |
| CTO | Reutilizar NewsletterSignup compact em SSR; evitar duplicação; suprimir formulário no footer desta rota; prosseguir. |
| IA | N/A: nenhuma geração ou agente alterado. |
| Segurança | Preservar consentimento, honeypot e validação existentes; nenhum dado real em testes; prosseguir condicionado a reutilização integral. |
| UX/UI | Nome, e-mail, consentimento e botão imediatamente após h1; campos responsivos existentes; prosseguir. |
| CX | Preservar estados de confirmação e erro; depende do componente atual; prosseguir. |
| Growth | Corrigir distância até cadastro; risco de repetir CTA mitigado com um único formulário; prosseguir. |
| PMO/QA | Teste deve exigir formulário entre título e descrição, dentro de main; validar build e gate; prosseguir. |

Decisão: restaurar a posição anterior a 9c715f1, com formulário compacto logo após h1. Manter demais seções. Critérios: um formulário em main antes da descrição e benefícios, campos e consentimento preservados, testes e pnpm validate aprovados. Fora de escopo: envios, dados, APIs, metadata e publicação. Rollback: reverter somente diff desta correção. Trade-off: padronização global do footer cede à tarefa principal desta landing page; nenhum conflito material pendente.

## Causa

O commit 9c715f1 removeu NewsletterSignup compact da abertura e ativou o formulário do footer ao padronizar ofertas/vídeos/newsletter. O teste SSR aceitava o formulário do footer sem verificar localização.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | A ação principal aparece imediatamente depois de h1. |
| CTO | Pass | Componente existente renderizado em main; SSR e build aprovados. |
| IA | N/A | Nenhuma alteração em agentes ou geração. |
| Segurança | Pass | Nenhuma alteração no componente de consentimento, API ou dados. |
| UX/UI | Pass | Ordem SSR título/formulário/descrição/benefícios comprovada; classes responsivas do componente preservadas. Inspeção visual em browser não realizada. |
| CX | Pass | Mesmo formulário mantém estados de envio, erro e sucesso. |
| Growth | Pass | Um único formulário; dispensa percorrer benefícios, dúvidas e vídeos antes do cadastro. |
| PMO/QA | Pass | Dois testes direcionados aprovados; pnpm validate aprovado (typecheck, regressão selecionada e build). |

Fechamento: correção preparada localmente em codex/newsletter-top-form a partir de origin/main 9fdcbf1. Sem custo externo e sem envio de cadastros reais. Sem alteração de produção. Publicação depende de autorização específica nesta conversa conforme EXECUTION_GUARDRAILS.md, seção 1. Rollback limitado aos dois arquivos de código/teste e este registro. Risco residual baixo: posicionamento validado por SSR, sem smoke visual em navegador.
