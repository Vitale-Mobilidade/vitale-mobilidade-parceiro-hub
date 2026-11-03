# Comunidade: acesso imediato e e-mails pelo Resend

## Decisão do responsável

O responsável rejeitou a confirmação de cadastro enviada pelo provedor padrão Lovable. O cadastro deve entrar diretamente na comunidade, incluindo a newsletter, sem exigir clique no e-mail. Os e-mails necessários, como recuperação de senha, devem usar a integração Resend existente, no mesmo Supabase integrado ao projeto atual. Esta decisão substitui o requisito de confirmação de cadastro de COMMUNITY_MEMBERSHIP_2026-11-03.md.

Estado de entrada: PR #59 não integrada; frontend não publicado; três migrations aditivas aplicadas, gates desligados e nenhum perfil novo. E-mail de teste Auth recebido pelo responsável, sem consentimento de comunidade/assinatura de teste. Não apagar conta, migrations ou inscrições.

## Revisão pré-implementação — estrutural

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Cadastro entra imediatamente com newsletter incluída | Fricção ou confusão entre cadastro e e-mail | Um formulário e aceite explícito | Prosseguir conforme pedido |
| CTO e Arquitetura | Auth nativo com auto-confirm; recuperação usa generateLink + Resend server-side | Duplicar autenticação ou trocar banco | Mesmo Auth/UUID; RPC de adesão existente | Prosseguir sem novo serviço de identidade nem outro Supabase |
| IA e Agentes | Sem mudanças editoriais | Agentes consumirem conteúdo de membros | UGC continua isolado | Prosseguir |
| Segurança | E-mail do cadastro deixa de comprovar titularidade | Pré-cadastro por terceiro, abuso de email, reativar descadastro alheio | Senha 12+, HIBP, moderação, limites Auth e recuperação, revogar outras sessões ao trocar senha | Condicionado; não chamar cadastro de e-mail verificado, não usar indicação como prêmio automático, preservar cancelamentos antigos |
| UX/UI | Eliminar “confirme seu e-mail” e botão de reenvio | Tela prometer acesso imediato se provedor estiver mal configurado | Verificar sessão real no retorno do signup; erro seguro se ausente | Prosseguir; recuperação continua explícita |
| CX e Operação | Recuperação em português, pela conta Resend já operacional | Falha de envio ou exposição de existência de conta | Chaves só no backend, remetente configurado, resposta genérica, sem fallback Lovable | Prosseguir condicionado ao teste dirigido |
| Growth e CRO | Convites contam primeira adesão, não caixas verificadas | Cadastros artificiais em ranking/prêmios futuros | Deduplicação existente; revisão futura de elegibilidade | Prosseguir com métricas de cadastro, sem prometer validação de titularidade |
| PMO e QA | Novo delta antes de ativação | Reusar evidência de confirmação do modelo anterior | SQL/recuperação/frontend e validate proporcionais, rollback documentado | GO local; publicar somente após gates |

### Conflitos e decisão consolidada

- Acesso imediato é escolha explícita do responsável. Auto-confirm no Auth preenche `email_confirmed_at` por política e **não** prova posse da caixa; não usá-lo como prova antifraude. Os checks RPC continuam exigindo Auth válido e não anônimo.
- Preservar cancelamentos/supressões de newsletter anteriores à adesão, já que não haverá prova de titularidade para reativá-los. Novos endereços são inscritos no aceite; assinatura ativa existente é reaproveitada; login/edição não reinscrevem cancelados. Isso reduz a possibilidade de um terceiro desfazer descadastro de outro.
- Recuperação de senha: Edge Function gera link de recuperação no Supabase e envia pela integração Resend existente. Link e credenciais nunca saem na resposta/log, destino de retorno fixo para /conta?modo=senha, resposta não revela se a conta existe, limites transacionais por e-mail/IP e global. Não criar conta durante recuperação, não enviar confirmação de cadastro, não acionar campanhas.
- Remover outras sessões ao atualizar senha pelo fluxo da comunidade, para mitigar sessões anteriores de um cadastro feito por terceiro. Não conceder admin por metadados nem mexer em memberships existentes.
- Convites pendentes são contas com adesão ainda incompleta nas últimas 48h; contagem concluída exige primeira adesão transacional, não visita. Copy evita “e-mail confirmado”. Sem pontos, ranking público, sorteios, benefícios ou antifraude de premiação neste corte.
- Sem trocar de Supabase, instalar outro provedor ou habilitar Lovable Emails. Configuração global auto-confirm exige confirmação no momento da alteração pelo navegador; toda preparação local deve estar pronta antes desse pedido.
- Rollback: desligar gates comunidade/indicações, desativar a função nova por ambiente/gate e voltar frontend; auto-confirm pode voltar ao valor anterior, preservando contas já criadas. Nunca desconfirmar usuários nem apagar dados automaticamente.

Referências oficiais: [Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Lovable email auth](https://docs.lovable.dev/features/email-auth), [Resend e Supabase](https://resend.com/supabase).

## Revisão pós-implementação local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Formulário de cadastro abre a sessão imediatamente e completa adesão com newsletter; sem etapa de confirmação; fórum/feed permanecem roadmap |
| CTO e Arquitetura | Pass | Mesmo Auth/UUID e Supabase; recuperação gera apenas link Auth e envia pelo Resend existente; sem novo writer de campanha ou SMTP paralelo; build SSR/types aprovados |
| IA e Agentes | Pass | Nenhum agente, geração ou conteúdo editorial alterado |
| Segurança | Pass local | RLS/grants e budgets SQL testados, hash privado de email/IP, sem tokens em respostas/log, envio server-side, retorno fixo, outras sessões revogadas na troca de senha, cancelamentos existentes preservados; ativação depende da escolha explícita de auto-confirm |
| UX/UI | Pass | Smoke mobile/desktop: signup com sessão no retorno, sem reenvio/confirmação, recuperação pelo novo endpoint, perfil/comentários/convites; screenshot local do formulário |
| CX e Operação | Pass local | Secret names RESEND_API_KEY/LOVABLE_API_KEY existentes conferidos sem ler valores; remetente vem da configuração server-side; sem fallback ao provedor padrão; deploy/envio real do novo endpoint ainda pendentes |
| Growth e CRO | Pass | Copy e métricas de primeira adesão; sem alegar email verificado e sem alterar canonical/CTAs afiliados; pendência agora é adesão incompleta |
| PMO e QA | Pass local | 50 testes direcionados, SQL nas quatro migrations com concorrência, restore proporcional do schema real, smoke UI e pnpm validate (66 regressões + SSR build) passaram |

### Validações e condições de release

- `python3 tests/member-community-db.py --community`: contratos em sequência, concorrência de comentários/adesão e orçamento de recuperação.
- `src/lib/member-password-recovery-endpoint.test.ts`: gera somente recovery, usa Resend/connector existente, ignora identidade/redirect enviados pelo cliente, respostas genéricas para conta ausente/rate-limit/falha de envio, não expõe token/secret/PII, rejeita link fora do backend, não envia nada em GET/honeypot.
- Budget de recuperação: 2 pedidos/e-mail/hora, 5/IP/hora, 20 globais/hora e 50 globais por janela de 24h, serializados; sem aumentar a quota de Resend ou ativar serviço pago novo.
- Testes e restore usam somente dados sintéticos e APIs interceptadas; sem emails ou campanhas reais. Backend ainda não implantado nem experimentado com a caixa controlada.
- Alterar o provedor para auto-confirm afeta todos os novos cadastros por email deste Auth. Exige confirmação no momento da ação via navegador, porque reduz a verificação de titularidade. Não se trata de ausência de acesso ao Supabase.
- Configuração e integração técnica da recuperação não equivalem à prova de entrega real; testar uma única caixa controlada após deploy, sem efetuar trocas de senha do responsável.
- Sem apagar usuários/inscrições/migrations; sem migrar de banco ou habilitar Lovable Emails. Rollback por gates/versão, com histórico preservado.
