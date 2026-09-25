# Radar e Quiz: texto público e navegação — 25/09/2026

## Revisão pré-implementação

**Classificação:** estrutural (Radar e Quiz). **Objetivo:** remover texto operacional da experiência pública de preço/alerta, tornar o Quiz explícito na hero mobile, conectar `/escolherbike` ao header/footer do hub e investigar o erro ao voltar à Home.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Quiz fica mais claro como principal entrada; Radar mostra preço, não processo interno. | Confirmação de alerta virar promessa de envio. | Cadastro real já existente. | Prosseguir sem prometer disparo. |
| CTO | Layout e navegação do Quiz mudam; Radar perde apenas texto. | Regressão de SSR/hidratação ou jornada de lead. | Preservar loader, RPC e motor. | Prosseguir com smoke de ida/volta. |
| IA | Lucas SDR do Quiz permanece uma instância própria. | Duplicar assistente ao adicionar shell. | `__root` já exclui Quiz do assistente global. | Prosseguir sem tocar fluxos de IA. |
| Segurança | Consentimento e captura do alerta ficam intactos. | Omitir estado operacional de modo que induza o usuário a esperar envio imediato. | Copy factual sobre cadastro e contato futuro. | Condicionado à honestidade da copy. |
| UX/UI | Remove ruído técnico, CTA mobile explícito, navegação consistente. | Header/footer duplicarem marca ou prejudicarem foco do Quiz. | Usar componentes globais e simplificar logos locais. | Prosseguir. |
| CX | Menos confusão no preço e no cadastro. | Usuário cobrar aviso nunca disparado. | Confirmação não deve afirmar envio. | Condicionado à copy factual. |
| Growth/CRO | Melhor descoberta do Quiz; rotas e clique afiliado intactos. | Mudança de navegação interferir atribuição. | Preservar URL e tracking existente. | Prosseguir. |
| PMO/QA | Erro de voltar deve ter causa e reprodução verificável. | Declarar correção sem reproduzir. | Testes focados, `pnpm validate`, smoke browser interno. | Prosseguir; não declarar bug corrigido sem evidência. |

**Conflito:** o usuário não quer comunicação de operação interna, mas hoje o backend do alerta apenas salva o pedido (`delivery_enabled=false`). Decisão: retirar menções internas, manter consentimento e confirmação factual de cadastro, sem afirmar que aviso será enviado agora. Nenhuma Edge Function, migration, lead, link ou preço será alterado.

**Escopo:** copy pública do painel/alerta, CTA mobile da hero, shell compartilhado do Quiz e mitigação localizada da navegação de ida/volta. **Critérios:** nenhum texto de cobertura ou "não está ativo" na interface; cadastro verdadeiro; hero mobile menciona Quiz; header/footer no Quiz; retorno à Home sem erro nos testes executáveis. **Fora de escopo:** ativar envios reais, alterar banco, reestruturar Quiz, publicação. **Rollback:** reverter frontend; nenhuma alteração persistente.

## Revisão pós-implementação

**Mudanças:** o painel de preço mantém pin, valores reais, farol e gráfico, mas não mostra contagens de cobertura, ressalvas operacionais nem o acordeão metodológico. O alerta já tinha consentimento e confirmação de dados salvos sem mensagem de indisponibilidade em `origin/main`; isso foi verificado no código e no modal local, sem alterar a função de persistência. A hero da Home diz explicitamente "Faça o quiz e descubra a bike ideal" no mobile. `/escolherbike` usa o header/footer compartilhados sem duplicar logotipos no conteúdo. As entradas conhecidas do Quiz usam navegação de documento completo para reduzir a dependência do estado de roteamento ao retornar pelo histórico do navegador.

**Evidência local:** `pnpm validate` passou (typecheck, 36 testes direcionados e build); mais 11 testes de janelas do gráfico/atribuição do Quiz passaram. Em navegador interno com viewport 390×844, verificados CTA mobile, header/footer do Quiz, ida e volta Home→Quiz→Home sem tela de erro, painel da V9 Max com seletor 7/14/30 e modal do alerta sem mensagem de indisponibilidade. O mesmo erro **não foi reproduzido** em produção no navegador interno antes da mudança; o iPhone Safari da captura não está disponível para teste automatizado. Assim, a navegação alterada é mitigação, não prova da causa-raiz nem promessa de correção definitiva no Safari.

| Perspectiva | Resultado | Evidência e risco residual |
| --- | --- | --- |
| Produto | Pass | Quiz destacado no mobile e integrado ao hub; preço público conserva referências úteis. |
| CTO | Pass | SSR e loader preservados; navegação documental apenas ao entrar no Quiz; build passou. Safari real ainda requer smoke. |
| IA | N/A justificado | Fluxos/instância do Lucas SDR não foram alterados; exclusão do assistente global na rota mantida. |
| Segurança | Pass | Consentimento de alerta intacto; confirmação não promete disparo. Sem alteração em RLS, dados ou secrets. |
| UX/UI | Pass | Header/footer presentes no Quiz; logo local redundante removido; viewport mobile inspecionado. |
| CX | Pass | Mensagens de cadastro são factuais. A ativação dos disparos segue pendente internamente e não pode ser afirmada ao usuário. |
| Growth/CRO | Pass | CTA do Quiz explícito; URLs, metadados e links afiliados inalterados. |
| PMO/QA | Pass | Gates locais verdes para este corte; falta reproduzir/verificar o caso em iPhone Safari. Release depende de autorização específica e smoke em dispositivo real após implantação. |

**Decisão de release:** o responsável autorizou implementar e publicar este corte nesta thread após receber o aviso de que o retorno no Safari iPhone ainda não estava reproduzido nem comprovadamente corrigido. Risco residual aceito para publicação: verificar Home→Quiz→Voltar no Safari iOS após o deploy e reverter o frontend caso a tela de erro persista. Não atribuir causa-raiz confirmada ao problema com base apenas no teste do navegador interno.
