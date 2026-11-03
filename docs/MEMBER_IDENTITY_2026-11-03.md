# Newsletter simples e identidade validada para interações

> **Configuração de celular ativa — 03/11/2026:** template `validacao_telefone` aprovado, catálogo oficial com api_sendable=true, duas variáveis mapeadas, chave dedicada de templates e secrets salvos/publicados. Dry-run passou e uma única mensagem de teste foi aceita pelo Hotpipe e recebida pelo responsável. Newsletter original preservada. O teste de transporte não marca conta como validada; cada usuário digita seus próprios códigos de email/celular.

## Decisão vigente

O responsável distinguiu os fluxos: newsletter aceita nome/e-mail e consentimento, sem conta completa nem confirmação. Cadastro da comunidade continua imediato e inclui newsletter, mas curtir artigos, comentar e criar anúncios exigem **e-mail e celular validados**. E-mail usa o Resend existente e celular usa a conta Vitale no Hotpipe IA. Não confundir `email_confirmed_at` preenchido por auto-confirm com prova de titularidade.

## Revisão pré-implementação — estrutural

| Perspectiva | Impacto | Risco | Dependência | Decisão |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Dois caminhos: newsletter simples e comunidade com níveis de acesso | Exigir cadastro para newsletter ou liberar interação sem identidade | Regras explícitas do responsável | Prosseguir; curtidas/anúncios seguem próximos cortes, mesma autorização obrigatória |
| CTO e Arquitetura | Estado de identidade independente do Auth auto-confirm; gate servidor | Bypass via RPC antiga, concorrência e mudança de email | Prova atrelada ao UUID e endereço atual; tabelas privadas e transação | Prosseguir; sem outro Auth/banco/writer de newsletter |
| IA e Agentes | Hotpipe somente transporte de OTP, sem agente generativo | IA tratar código ou declarar identidade por conversa | Endpoint oficial de template, sem inferência | Prosseguir; nenhuma IA recebe permissão de verificar identidade |
| Segurança | OTP com validade/tentativas/consumo, email+telefone privados | Auto-confirm/metadata falsificarem validação, força bruta, reuso | Desafios server-side, grants, hash de código, limites, prova atual e entrega reconhecida | Condicionado aos contratos e homologação; não retrovalidar ninguém |
| UX/UI | Newsletter retorna ao formulário; painel explica e acompanha duas validações | Misturar login, newsletter e permissão para comentar | Estados pendente/enviado/validado/expirado/indisponível claros | Prosseguir; sem confirmação obrigatória da newsletter |
| CX e Operação | Reaproveitar remetente Resend e conta Hotpipe | Usar template de outra empresa, escopo indevido ou indisponibilidade | Template de autenticação Vitale aprovado + chave templates:send dedicada | Implementar local; envio celular não ativável até configuração válida |
| Growth e CRO | Newsletter sem fricção; convites continuam de novos membros | Contar newsletter-only como membro ou email auto-confirmado como verificado | Manter deduplicação de adesões e preferências atuais | Prosseguir; sem prometer ranking/premiação antifraude |
| PMO e QA | Novo delta sobre release 9c1a468/23bac76 | Confundir serviço preparado com celular operacional | Testes SQL/OTP/mock e validate; rollback, template/configuração reais | GO local; release depende de contratos/configuração e autorização do delta |

### Decisão consolidada

- Newsletter independente usa `newsletter-interest` e o writer operacional já existente, sem criar Auth/perfil. Comunidade mantém aceite que inclui newsletter. Nenhum cliente antigo, campanha ou cron será refeito.
- Adesão/login não liberam interação: verificação usa registro privado atrelado a Auth UUID, email atual e celular informado. Nunca aceitar flags do cliente/metadados ou mera existência no CRM como validação.
- Código por email via Resend e por WhatsApp via template da conta Vitale; código aleatório de seis dígitos, validade de dez minutos, até cinco erros, consumo único, reenvio limitado. Trocar destino invalida o desafio anterior; validação de email perde validade se endereço Auth muda.
- Confirmação de código acontece no servidor; ACK de envio não significa titularidade. Somente digitar corretamente o código recebido valida o canal. Não revelar OTP, telefone/email de terceiros, hash, segredo ou resposta privada de provedor.
- Comentários existentes seguem moderação e leitura pública; **novos comentários** exigem as duas provas no servidor. Remoção própria e admin não são bloqueados por essa exigência. Uma checagem comum será obrigatória nas futuras curtidas/anúncios; estes produtos não serão antecipados.
- Hotpipe consultado somente em leitura: empresa Vitale Mobilidade conectada; nenhum template de autenticação/código encontrado na conta. Endpoint oficial api-template-send suporta dry_run e idempotência; chave de alertas `price_alerts:write` não deve ser reaproveitada/expandida silenciosamente.
- Implementação fica pronta sem envio pago/real nem configuração de outra empresa. Antes de ativação, validar template de autenticação, variáveis e chave por canal seguro. Celular ausente/configuração pendente nunca concede permissão.
- Rollback: desligar interações/comunidade se necessário, preservar perfis/adesões/desafios; não voltar a liberar comentários sem a verificação exigida. Formulário da newsletter continua funcionando independentemente dessa integração.

## Configuração Hotpipe conferida em leitura

Projeto 8cd1e1dc-9cab-481c-a542-5ee23c2b38d7, empresa Vitale Mobilidade 5a2670c0-144a-46e1-9618-7dd9780a6b20, WhatsApp conectado. Há 68 templates aprovados, nenhum de autenticação/código encontrado. Chaves ativas têm somente price_alerts:write ou custom_fields:read/write; não existe chave templates:send apta a enviar o OTP. Não ampliar nem reutilizar essas chaves.

A configuração proposta é um template AUTHENTICATION da própria Vitale (por exemplo codigo_acesso_vitale), pt_BR, código de seis dígitos e validade de dez minutos. Os nomes exatos das variáveis devem vir do catálogo oficial após aprovação; todas as variáveis OTP de corpo/botão recebem o mesmo código. Não usar nome/ID de template da Acelera Varejo ou de outra empresa.

Secrets de backend novos, configurados somente por canal seguro: HOTPIPE_IDENTITY_API_KEY (templates:read e templates:send), HOTPIPE_IDENTITY_TEMPLATE_ID e HOTPIPE_IDENTITY_CODE_VARIABLES (lista separada por vírgulas obtida do catálogo). O endpoint público verifica JWT no Auth antes de qualquer orçamento/código; a RPC de emissão/ACK é service-only. Ausência de configuração retorna indisponível sem enviar nem alocar OTP. MEMBER_IDENTITY_CODES_ENABLED=false interrompe emissões, mantendo o gate de interação fechado.

Nenhuma mensagem, chave, template, secret ou dado foi criado/alterado no Hotpipe nesta preparação. O cadastro e a newsletter continuam possíveis mesmo sem a configuração dos códigos; as interações permanecem bloqueadas, conforme a regra do responsável.


## Revisão pós-implementação local

| Perspectiva | Status local | Evidência e condição de ativação |
| --- | --- | --- |
| Produto e Estratégia | Pass | Formulário independente de newsletter restaurado; comunidade continua incluindo newsletter; comentários exigem duas provas; curtidas/anúncios não antecipados |
| CTO e Arquitetura | Pass | Migration aditiva e mesma sessão/Auth; estado de identidade independente; RPC de emissão service-only; SSR e writer de newsletter preservados |
| IA e Agentes | Pass | OTP não envolve LLM; Hotpipe é transporte pelo endpoint oficial de template, sem usar agente/chat como prova |
| Segurança | Pass | Grants/RLS, conta/destino vinculados, expiração, entrega prévia, cinco erros persistidos, consumo único, mudança de email/timestamp e metadados falsificados testados; gate servidor bloqueia bypass |
| UX/UI | Pass | Smoke Chrome mobile/desktop: newsletter somente nome/email/aceite, nenhum signup Auth; painel email/celular, erro/retry e acesso bloqueado antes das duas validações |
| CX e Operação | Pass na preparação | Configuração ausente falha fechada, sem fallback para chave de preço/outro remetente/template. Homologação real de WhatsApp depende de chave dedicada e template aprovado, ainda não configurados |
| Growth e CRO | Pass | Newsletter livre de cadastro completo/confirmação; CTA de comunidade preserva convite; cadastro só newsletter não gera crédito de membro; canonical permanece /newsletter |
| PMO e QA | Pass na preparação | 44 testes direcionados, SQL/concorrrência e restore de schema real, smoke UI e pnpm validate (66 regressões + SSR build) passaram. Nenhum disparo real nesta etapa; GO condicionado para ativação do delta |

### Evidências

- `python3 tests/member-community-db.py --identity`: cinco migrations em ordem; Auth/metadata não conferem identidade; email sozinho insuficiente; prova de celular exigida; código de outro usuário/expirado/consumido/sem ACK não valida; erros de código persistem até bloqueio; concorrência preserva os dois erros; email atual/timestamp Auth invalidam prova antiga; remoção própria preservada.
- Restore proporcional do backup privado de 03/11: seis tabelas reais com constraints de chave/check, nenhum dado pessoal, cron ou TCP. As cinco migrations e os contratos de identidade passaram sobre o schema restaurado. Não é ensaio de recuperação geral da plataforma.
- `src/lib/member-identity-endpoint.test.ts` e `member-identity.test.ts`, com regressões de comunidade/newsletter: 44 casos aprovados. Verificam JWT antes de emitir, destino/actor/IDs server-side, ausência de OTP na resposta, Resend existente, key/template/variáveis Hotpipe fixos por configuração, idempotência, ACK/telefone/template corretos, configuração ausente e falhas de provedor sem marcar entrega.
- `MEMBER_TEST_IDENTITY=true MEMBER_TEST_COMMUNITY=true node tests/member-ui.mjs`: mock completo sem saída de rede; newsletter não chama signup/Auth/adesão, códigos e bloqueio antes de validar, comentários/moderação/perfil/recuperação e convites. Evidências em artifacts/member-identity.
- `pnpm validate`: typecheck, 66 regressões e build SSR aprovados; lint dirigido sem erros. Nenhum teste extenso, email/WhatsApp, campanha, novo custo de Lovable ou mudança de produção no delta.

### Rollout proposto

1. Revisar PR do delta e aplicar a migration aditiva com backup/ensaio já registrados; nenhum usuário será marcado como validado automaticamente.
2. Criar template de autenticação da Vitale na conta integrada Hotpipe e aguardar aprovação; criar chave dedicada para templates, armazenada exclusivamente em secret de backend, sem copiar seu valor para o chat/Git. Confirmar catálogo/capabilities/variáveis e dry_run antes do primeiro envio.
3. Implantar member-identity-code e publicar frontend do mesmo código. Newsletter fica independente; novas contribuições permanecem bloqueadas enquanto qualquer prova estiver ausente. Sem fallback inseguro para comentários.
4. Homologar um email/um celular controlados com autorização específica para o destinatário; não efetuar códigos nem trocas de senha pelo responsável. ACK de transporte não equivale à validação: o usuário digita o código na própria conta.
5. Registrar versão, consumo, matriz final de release e prova pública. Não afirmar Hotpipe ativo antes de template/chave/envio comprovados.

Custo externo proposto: configuração sem campanha; envios unitários de código podem consumir saldo/tarifa da conta Hotpipe/WhatsApp, com teto inicial de 50 solicitações por canal em 24h, 20/h global, três/h por usuário e destino, intervalo de um minuto e cinco erros por desafio. Envios Resend usam a integração existente. Não habilitar plano/serviço pago novo.


## Execução e bloqueio factual de celular

- Responsável autorizou criar template/chave na conta Vitale e forneceu destinatário controlado para **um** teste WhatsApp. Destinatário não gravado no Git. Esse envio ainda não ocorreu; nenhuma chave foi criada ou escopo existente ampliado.
- Migration 20261103220000 aplicada/registrada; tabelas novas com RLS e emissão/ACK apenas service_role. Estado inicial: zero perfis/comentários/identidades; admin existente preservado. Novos comentários já exigem duas provas independentes no servidor.
- PR #61 integrada em 1f12b149. Função member-identity-code implantada seletivamente; custo informado 0,8 crédito. Frontend inicial do delta em 28a82d10-fa3f-4e25-9479-7c66ac4fcd92. A restauração final da newsletter original em PR #62/deployment ee9c1552 substitui todos os acréscimos de comunidade na captação; ver NEWSLETTER_FORM_RESTORE_2026-11-03.md.
- A sessão administrativa Hotpipe aberta pertence à DryClean. “Entrar como empresa” é um placeholder; nenhum perfil/membership foi alterado para simular a Vitale. Nenhum template foi criado na empresa errada.
- Operação restrita de backend foi solicitada ao Lovable Hotpipe por ser a única via disponível com o vínculo Meta integrado, após esgotar UI e contrato oficial. Custo informado 2,6 créditos. Resultado: **bloqueada**, sem criação/submissão de template, sem chaves nem mensagens. Conexão Vitale ativa, WABA correspondente e token presente; permissões Meta e existência remota não foram comprovadas porque o fluxo atual não chega à submissão.
- Bloqueio confirmado também no código primário atual: `supabase/functions/_shared/template-validation.ts` rejeita AUTHENTICATION no editor de texto livre; `semantic-template.ts` classifica COPY_CODE como não suportado. O pedido de configuração não autoriza inventar uma alternativa Marketing nem utilizar template de outra empresa. É necessário implementar o contrato específico OTP na Hotpipe antes dessa ativação; nenhuma credencial ou troca de Supabase resolve esse ponto.
- O agente Lovable fez indevidamente três ajustes de tipagem fora do escopo em template-variable-sources.ts. Foram revertidos de forma restrita na PR gpalmerio/hotpipe-newtool#255, merge aedd99e, preservando as alterações concorrentes de previewAuthStorage/types e sem publicação de Hotpipe. Não foi executada suíte de testes desse outro projeto.

Estado final deste corte: **GO para newsletter independente e bloqueio das interações sem prova. NO-GO para declarar validação de celular operacional.** Preparação SQL/UI/integração validada em mocks e schema real; envio/validação real email/celular não homologados neste delta. Ainda não há template_id, variáveis ou chave Hotpipe de OTP configurados; a função falha fechada no canal celular. Nenhum código foi enviado ao destinatário de teste autorizado.

A ativação de WhatsApp depende de uma mudança própria no produto Hotpipe para suportar AUTHENTICATION/OTP, seguida de template da Vitale aprovado, chave específica, dry_run e teste controlado. Não alterar ou reativar captação/newsletter para resolver essa dependência. Não apresentar a recuperação de senha previamente recebida como prova de homologação do novo código de validação.

## Retomada — template criado pelo responsável

O responsável criou na Meta e sincronizou no Hotpipe o template `validacao_telefone`, pt_BR, AUTHENTICATION. Consulta na conta Vitale confirmou APPROVED/approved, UUID Hotpipe `1f5fbb6d-578d-48e9-b402-e98764967c9e`, BODY `code` e botão URL dinâmico `button_1_1`; ambos devem receber o mesmo OTP. O botão sincronizado é URL da Meta para copiar o código, formato já suportado pela API de envio. A limitação anterior era do editor de criação, não impede por si só enviar este registro aprovado.

### Revisão prévia da configuração — estrutural

| Perspectiva | Impacto / risco / decisão |
| --- | --- |
| Produto | Concluir somente a validação de celular da comunidade; newsletter original permanece separada. Prosseguir. |
| Arquitetura | Usar endpoint oficial api-template-send e função Vitale já implantada, sem novo Auth/banco/código de newsletter. Prosseguir após catálogo/dry_run. |
| IA | Nenhum agente generativo necessário; integração determinística com template existente. Prosseguir. |
| Segurança | Chave nova apenas templates:read/send, empresa Vitale e segredo exclusivo de backend; hash SHA-256 no Hotpipe, sem mexer em roles/perfis/chaves existentes. Prosseguir dentro da autorização explícita anterior. |
| UX | Mesmo painel de validação já publicado; confirmação somente depois de digitar OTP correto. Prosseguir sem marcar usuário como validado pelo ACK de entrega. |
| CX | Conferir mapeamento das duas variáveis e um único envio ao destinatário já autorizado. Prosseguir sem campanhas ou marketing. |
| Growth | Captação da newsletter não é afetada nem gera conta por este teste; indicação continua agregada. Prosseguir. |
| QA | Catálogo + dry_run antes do teste unitário de transporte autorizado; conferir secret/live e retornar estado real. GO condicionado à prova de envio/recebimento. |

Credencial será criada por administração restrita do projeto integrado, com formato/colunas/hashing do writer oficial e autoria do operador, pois a sessão UI disponível é de outra empresa e a troca é placeholder. Nenhum vínculo de usuário ou permissão existente será alterado. Raw fica somente em arquivo temporário local 0600 e depois em secret do backend; não será impresso, enviado ao chat ou versionado. Rollback: revogar apenas a chave nova e interromper emissão, sem apagar registros, códigos ou perfis. Não há necessidade de alterar Hotpipe/Meta para criar outro template.


### Fechamento da ativação com template existente

- Catálogo oficial respondeu HTTP 200 para o UUID 1f5fbb6d-578d-48e9-b402-e98764967c9e, categoria AUTHENTICATION, idioma pt_BR, approved e `api_sendable=true`. Variáveis obrigatórias exatas: `code` e `button_1_1`. As duas recebem o mesmo OTP. O botão aprovado é representado como URL pela Meta; não houve necessidade de alterar o editor ou o motor de envio Hotpipe.
- Criada somente a chave “Vitale - validação de celular”, UUID a86e7c61-236b-471e-84be-ac417404e011, restrita à empresa Vitale e escopos templates:read/templates:send. Registro tem autoria do operador administrativo; não altera profiles, roles, memberships, outras empresas ou as chaves anteriores. O hash e formato correspondem ao writer oficial; o raw foi transferido diretamente ao campo protegido do secret, sem impressão, chat ou Git.
- Backend Vitale configurado com HOTPIPE_IDENTITY_API_KEY, HOTPIPE_IDENTITY_TEMPLATE_ID e HOTPIPE_IDENTITY_CODE_VARIABLES. Conferida a existência dos três nomes sem abrir os valores. Publicação de configuração: deployment 5f33cc5e-7a75-4ac5-9866-3f58b8d84465; fonte daa8939 (documentação anterior, sem alteração do runtime nesta ativação). A função member-identity-code já estava implantada; não foi reimplantada nem gerado código pelo Lovable.
- Dry-run oficial HTTP 200, ok=true e dry_run=true, telefone/OTP fictícios; sem mensagem real nessa validação. Um único envio posterior ao destinatário expressamente autorizado retornou HTTP 200/code sent, provider ID presente e telefone/template correspondentes. Request c237c3e0-1179-4d9e-93d6-e76ebbac34db; message 224e9ad7-c1b7-46d4-93c5-b708a76a3113. O responsável confirmou recebimento. Não houve reenvio, campanha, signup de newsletter nem concessão de identidade ao destinatário.
- Arquivos temporários locais contendo raw da chave e código do teste foram removidos após salvar o secret e confirmar o envio. Nenhum desses valores foi versionado. Não registrar o OTP ou o telefone completo no relatório, mesmo se fornecidos no chat.
- `pnpm validate` passou (66 regressões, types e SSR build). Código de newsletter e página continuam idênticos ao baseline 540fc1d; nenhuma alteração nesses arquivos neste corte. Não houve chamada de agente generativo Lovable; o envio unitário pode ser tarifado conforme a conta Hotpipe/WhatsApp existente, sem compra de saldo/plano.

| Perspectiva final | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Conclusão da configuração de celular somente na comunidade; newsletter independente preservada |
| CTO e Arquitetura | Pass | API e função existentes, mesmo Auth/UUID e banco; catálogo, variáveis e configuração publicados sem novo runtime |
| IA e Agentes | Pass | Integração determinística, sem LLM ou conteúdo gerado |
| Segurança | Pass | Chave mínima por empresa, hash em banco, secret server-side, nenhum raw/OTP retido em Git; nenhuma prova concedida pelo teste de entrega |
| UX/UI | Pass | Painel existente solicita e verifica códigos; sucesso de transporte não substitui digitação pelo dono da conta |
| CX e Operação | Pass | Dry-run e um único envio recebido, confirmado pelo responsável; rollback por revogação da chave nova |
| Growth e CRO | Pass | Sem alteração de captação/newsletter, campanhas, afiliados ou métricas de indicação |
| PMO e QA | Pass no escopo | Configuração e transporte comprovados, validate aprovado e evidências registradas; criação/login/aceite e digitação real dos dois OTPs ficam com o usuário |

Estado: **configuração publicada e transporte WhatsApp homologado**. A validação completa de uma conta real somente ocorre no fluxo normal, com sessão própria e códigos digitados pelo usuário; nenhum perfil foi retrovalidado pelo agente. Rollback: revogar apenas a nova chave, interromper emissão por flag/secret se necessário e manter o gate de interação fechado quando faltar uma prova, preservando registros e newsletter.
