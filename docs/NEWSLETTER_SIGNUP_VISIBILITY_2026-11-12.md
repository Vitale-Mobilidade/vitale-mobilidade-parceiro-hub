# Visibilidade da inscrição em /newsletter

O HTML público servido em 12/11/2026 inclui o formulário logo após o título. A partir de `2856e17`, o componente compartilhado retorna vazio quando encontra uma sessão da comunidade. A sessão é resolvida no navegador após o carregamento, o que explica por que o HTML contém o formulário mas a página aberta com conta conectada pode não exibi-lo.

## Revisão prévia — mudança relevante

A inscrição é a conversão principal desta rota. O reparo altera apenas a visibilidade do formulário existente na página dedicada.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto | Recuperar a inscrição na página dedicada. Conta não comprova inscrição; manter os dois fluxos separados. |
| Arquitetura | Preservar o HTML inicial e explicitar a exceção na chamada da rota. A propriedade existente de layout também é usada no popup, então não serve de critério. |
| IA | N/A: geração, curadoria e assistente fora do fluxo. |
| Segurança | Preservar aceite explícito, campos manuais, proteção antispam e endpoint atual. O gatilho existente continua a determinar elegibilidade e preservar supressões. |
| UX | Mostrar nome, e-mail, aceite e botão abaixo do título em qualquer estado de sessão. Preservar layout e estados de envio. |
| CX | Retomar a inscrição pelo link público. Usar dados sintéticos em validação local; não gravar contatos nem enviar e-mail de teste em produção. |
| Growth | Restaurar a ação principal. Preservar a visibilidade já usada nas outras superfícies, metadata e URL. |
| PMO/QA | Reproduzir a falha com sessão simulada, validar estado anônimo e escopo da exceção e rodar o gate do projeto. |

Decisão: a rota dedicada exibe o formulário mesmo com sessão ativa; popup, rodapé e Quiz preservam a regra atual. A proteção contra chamadas repetidas é responsabilidade do fluxo existente, não de uma inferência a partir do login. Sem mudança em consentimento, API, campanhas, banco ou SEO. Aceite: um formulário no topo com os mesmos campos tanto na resposta inicial quanto com sessão ativa, e sem alteração na visibilidade dos formulários de apoio. Rollback: reverter o delta da rota e do componente e republicar a versão anterior se necessário; não há migration.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | A página de inscrição funciona com ou sem conta da comunidade. |
| Arquitetura | Pass | HTML inicial com formulário único; exceção restrita à rota, testada com sessão simulada. |
| IA | N/A | Nenhuma mudança em agentes ou geração editorial. |
| Segurança | Pass | O Chrome confirmou que não há envio sem aceite; contrato, supressões e persistência continuam a cargo do fluxo existente. |
| UX | Pass | Campos e botão aparecem no topo em desktop com sessão e em celular anônimo; mensagens de aceite e confirmação foram exercitadas. |
| CX | Pass | Envio simulado usou o contrato atual e exibiu a confirmação. Nenhum contato real criado nem e-mail enviado. |
| Growth | Pass | Formulário principal recuperado; teste preserva canonical, card social e sitemap. Rodapé e popup conservam a regra com sessão. |
| PMO/QA | Pass | A regressão falhou antes do reparo e os 3 testes da landing passaram depois. `pnpm validate` passou: tipos, 68 regressões e build SSR. `git diff --check` sem erros; lint do componente limpo e sem novos apontamentos nos outros arquivos. |

Smoke em Chrome local com serviço de inscrição interceptado e dados sintéticos. Em produção, foi inspecionado somente o HTML público; a correção está no branch local e depende de autorização explícita para integrar em `main` e publicar no Lovable. Depois da publicação, conferir a visibilidade com e sem sessão, sem gravar contato de teste. Para rollback, reverter apenas o commit da correção no GitHub e republicar pelo mesmo projeto Lovable.
