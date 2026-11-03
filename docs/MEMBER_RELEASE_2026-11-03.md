# Ativação de contas e indicações — 03/11/2026

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

Em andamento. Atualizar somente com resultados observados; autorização não substitui recuperação nem validação.
