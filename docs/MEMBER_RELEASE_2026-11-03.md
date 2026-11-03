# Ativação de contas e indicações — 03/11/2026

> **Estado final: publicado e ativo.** Contrato vigente: [acesso imediato e recuperação Resend](COMMUNITY_IMMEDIATE_ACCESS_2026-11-03.md). As pausas e confirmações abaixo são registros históricos anteriores à correção do responsável.

O responsável respondeu “pode seguir e implementar” após a entrega local informar publicação/migration pendentes de autorização. Esta continuação executa a ativação desse escopo no projeto Lovable `638f4032-8ff8-45dd-b03b-e69c0c064154`, preservando as condições técnicas de recuperação e validação. Não inclui curtidas, ranking público, pagamentos, anúncios ou sorteios.

## Revisão prévia de ativação

Classificação: **estrutural** (Auth, tabelas/RLS novas e inscrição de newsletter).

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Disponibilizar contas, comentários e indicações já revisados | Publicar capacidade incompleta | Fluxos reais de cadastro/confirmação | Prosseguir condicionado ao smoke |
| CTO | Integrar commits locais ao mesmo projeto | Divergência Git/Lovable ou flags ausentes | HEAD comum `540fc1d`, build e deploy seletivo | Prosseguir; switches de banco começam desligados |
| IA | Nenhuma geração ou campanha necessária | Consumir créditos para reimplementar código | Código já pronto; plataforma só onde exclusiva | Prosseguir sem reescrita/geração |
| Segurança | Ativar acesso público limitado a leitores | Signup sem confirmação, dados ou privilégios expostos | Backup/ensaio, Auth verificado, grants e projeções auditadas | Condicionado aos gates antes de habilitar |
| UX/UI | Conta no menu e comentários/convites | UI aparecer antes de backend pronto | Gate server-side e smoke no domínio | Prosseguir com ativação ordenada |
| CX | Moderação e confirmações passam a operar | E-mail/recuperação indisponíveis | Configuração existente e prova de entrega controlada | Condicionado; não alterar contatos reais |
| Growth | Convites com confirmação | Contagem falsa ou newsletter regressiva | Deduplicação e writer atual preservados | Prosseguir com limites existentes |
| PMO/QA | Release do delta validado | Confundir merge, preview e produção | Identificar versão de rollback e validar cada etapa | GO condicionado às evidências registradas abaixo |

### Decisão consolidada

- Base remota e Lovable: `540fc1d7ab34d7aa115230c326883d86c6db2bd2`, confirmado por Git fetch e conector. Implementações locais `2ddae74` e `4158f17`.
- Preflight por leitura: um usuário Auth confirmado e um admin ativo; tabelas novas ausentes; newsletter ativa, remetente e chave configurados; pgcrypto em `extensions`. Nenhum valor de secret ou PII foi consultado nesse preflight.
- Backup diário visível: 03/11/2026 04:28:32 UTC. Nova exportação solicitada antes de qualquer migration/configuração Auth. Não acionar Restore no projeto ativo.
- Para publicar com configuração portátil, os switches de código passam a ficar disponíveis por padrão, respeitando override explícito `false`; os switches server-side de banco continuam obrigatórios e começam `false`. Evita depender da edição/versionamento de `.env`. A ativação efetiva só ocorre após aplicação e verificação do banco. `NEWSLETTER_REFERRALS_ENABLED=false` continua desativando o ramo da Edge Function.
- Não criar segundo projeto/banco, alterar catálogo, campanhas, cron, preços, afiliados ou memberships administrativas. Não executar envios para a base real nem testes extensos.
- Aceite: backup e ensaio proporcionais; Auth com confirmação/retorno corretos e e-mail operacional; migrations aditivas e grants verificados; Edge Function implantada; preview/site servem código correto; conta, moderação e indicação exercitáveis; regressões dirigidas e `pnpm validate`.
- Rollback: switches do banco desligados, override de código/ambiente `false` e frontend/Edge Function anteriores identificados; preservar novas contas/tabelas/inscrições. Nenhum DROP ou restauração geral de banco como rollback rotineiro.

## Evidências da execução

- Backup novo privado `database_export_03_11_26/vitale-mobilidade-parceiro-hub_261103.backup`, concluído em 03/11/2026 21:02:55 UTC, baixado em ZIP íntegro (26.809.789 bytes), SHA-256 `9b449a11944ec9c57ec1b9c5ae6d54cf62469be00c335e4f769fe9f091fd2294`. Material fora do Git, diretório restrito.
- Ensaio proporcional passou: restauração de seis tabelas reais do backup e constraints de chave/check, sem dados pessoais, cron ou funções de rede. As três migrations e contratos completos de contas/indicações/comunidade passaram com registros sintéticos e o trigger real de entrega. FKs de outros módulos e recuperação completa da plataforma não fazem parte deste ensaio; rollback rotineiro é por switches/versão.
- Auth conferido na UI: cadastro permitido; login por e-mail ligado; auto-confirmação desligada; anonymous desligado; secure email change e HIBP ligados; OTP de 3.600 segundos e oito dígitos; limite de 1.000 e-mails/hora. Domínios atuais permitem `/conta`; Site URL legado `https://vitale-mobilidade-parceiro-hub.lovable.app` preservado, pois signup/recuperação usam retorno explícito no domínio correto.
- Política do provedor atualizada de seis para 12 caracteres, com confirmação de salvamento na UI; nenhuma credencial existente foi alterada.
- PR #59 criada; preview Netlify passou. Status Vercel com falha será comparado ao baseline, pois o destino operacional é Lovable. Nenhum merge/publicação ainda neste ponto.
- Ativação de código: 53 testes direcionados e `pnpm validate` (66 regressões e build SSR) passaram.
- Usuário forneceu uma caixa própria para o teste de cadastro; o endereço não é registrado no Git. Não inscrever automaticamente essa caixa na newsletter.

## Correção de escopo antes da publicação

O responsável esclareceu cadastro único da comunidade com newsletter incluída, e convites para membros. Publicação/merge foram mantidos suspensos para incorporar [a decisão corrigida](COMMUNITY_MEMBERSHIP_2026-11-03.md). As migrations iniciais existem e permanecem desativadas; a correção será aditiva, sem remover histórico ou alterar inscritos antigos em massa.


## Evidências do contrato corrigido

37 testes direcionados, contratos SQL/conexões concorrentes, ensaio em schema real restaurado, smoke de interface e `pnpm validate` (66 regressões + build SSR) passaram. Sem chamadas externas nos testes. Novo preflight confirmou gates desligados, perfis/indicações vazios e um admin ativo. A newsletter passou de 90 para 91 registros durante a operação normal do site, sem escrita de teste nesta tarefa.

A promessa do teste de e-mail anterior continua válida: a caixa fornecida não será inscrita silenciosamente. O teste de transporte pode criar uma conta Auth sem metadados de adesão; a assinatura só ocorrerá quando o próprio responsável aceitar a adesão combinada. Não afirmar recebimento de mensagem sem retorno da caixa.


## Segunda correção: acesso imediato, Resend e publicação pausada

O responsável confirmou recebimento do e-mail de teste, mas rejeitou o remetente/fluxo padrão Lovable e a exigência de confirmação. Antes de qualquer merge/publicação, foi preparado e validado o [acesso imediato com recuperação pelo Resend](COMMUNITY_IMMEDIATE_ACCESS_2026-11-03.md). PR #59 continua aberta; três migrations aplicadas com gates desligados; quarta migration pronta apenas localmente. Auto-confirm ainda não alterado. Não houve fallback, segunda confirmação ou novo envio de teste.

Resultado final: quatro migrations aplicadas, auto-confirm autorizado e ligado, funções implantadas, recuperação Resend recebida pelo responsável e formulário/área de comentários conferidos no domínio. Deployment 175d268c-4d61-4b58-8ca2-f96bb96d2152; código 9c1a468. Evidências e oito pareceres finais no documento vigente.
