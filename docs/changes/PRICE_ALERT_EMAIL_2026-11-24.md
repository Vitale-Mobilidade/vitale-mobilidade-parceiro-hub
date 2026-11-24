# Alertas de preço nos dois canais — 24/11/2026

## Pedido e evidência

Pedido: enviar esta rodada da V9 Max por e-mail também e garantir e-mail para todo alerta que tenha endereço disponível; Hotpipe IA sem e-mail permanece somente no WhatsApp. Envio da rodada está autorizado. Implantação/migration/publicação seguem autorização específica prevista no AGENTS.md; nenhuma autorização antiga foi reaproveitada.

Leitura às 10h46 SP: 18 inscrições ativas da V9 Max, 18 e-mails distintos/válidos, consentimentos v3–v5 e nenhuma supressão de e-mail registrada. Dois avisos desta queda já foram entregues por e-mail às 9h57. A afirmação anterior de que saiu somente WhatsApp estava incompleta e foi corrigida na conversa. Existem 75 inscrições ativas com e-mail e request atual na Vitale.

A fila de e-mail atual monitora apenas quem possui mensagem de cadastro desde a ativação em 18/11. Isso deixa inscrições antigas fora do monitoramento. O worker de e-mail ainda depende da configuração/execução anterior da outbox Hotpipe. Nenhuma falha WhatsApp deve ser promovida a supressão de e-mail.

## Governança prévia

Classificação: estrutural (Supabase, dados pessoais, Radar e integrações).

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | E-mail acompanha cada pedido com endereço; rodada atual é pontual. | Confundir aviso de preço atual com alvo atingido. | Tipos de mensagem separados. | Prosseguir com aviso avulso neutro e regra automática preservada. |
| Arquitetura | Reutiliza fila/cron/Resend; monitor inclui inscrições antigas. | Repetição, canais acoplados e consultas excessivas. | Dedupe por request/tipo, lease, snapshot por Bike. | Prosseguir com monitor set-based e e-mail antes do processamento Hotpipe. |
| IA/Agentes | Sem geração IA. | Inventar preço, imagem ou preferência. | Renderer determinístico e catálogo. | Prosseguir sem chamadas de modelo. |
| Segurança | Endereço consentido e contexto da mesma Bike. | Expor PII, reativar cancelado, ignorar bounce/complaint. | Fila service-only, consentimento atual, supressões e validação pré-POST. | Prosseguir sem exportar a base ou alterar consentimentos. |
| UX/UI | E-mail responsivo com oferta, Radar e alvo preservado. | Mensagem avulsa dizer que alvo não atingido foi cumprido. | Copy específica e prévia sem dados reais. | Prosseguir; destacar preço atual e não prometer alvo atingido. |
| CX/Operação | Histórico por canal com recibos independentes. | Reenvio de incertos e confirmação retroativa de cadastro. | Dedupe e nenhum registro de entrega fictício. | Prosseguir sem recriar cadastro ou replay incerto. |
| Growth/CRO | Entrega a quem forneceu e-mail. | Oferta desatualizada e link intermediado. | Oferta atual e link afiliado direto. | Prosseguir com revalidação no envio e cobrança existente do Resend, sem upgrade. |
| PMO/QA | Corrige cobertura antiga e rodada atual. | Declarar entregue apenas por aceite ou publicar antes dos testes. | Ensaios SQL, testes de transporte/copy, validate e autorização de release. | Prosseguir localmente; implantação depende do gate. |

## Decisão consolidada

- Rodada atual: dois e-mails já entregues não são repetidos. Seis outros pedidos antigos satisfazem a condição original e podem entrar na fila existente sob a autorização atual. Dez restantes precisam do aviso avulso que não afirma que o alvo individual foi atingido.
- Regra permanente: toda inscrição ativa/consentida, com endereço válido e request vigente, é monitorada independentemente da data e da entrega WhatsApp; alvo/qualquer queda permanecem como escolhidos. Sem endereço não se inventa um.
- Nova mensagem `price_update` é exclusivamente uma rodada avulsa autorizada, com oferta congelada e revalidada. Não altera o alvo, referência ou estado do pedido original e não simula confirmação de cadastro. Uma por pedido lógico; novas campanhas futuras exigem escopo próprio.
- Supressões de e-mail, cancelamento e troca de request bloqueiam o canal. Falha/incerteza WhatsApp não bloqueia e-mail válido; falha/incerteza de e-mail não é repetida automaticamente.
- Monitor automático usa as Bikes distintas e snapshot canônico por Bike, sem exigir mensagem de cadastro anterior e sem reenviar preço já notificado no mesmo request.
- Escopo exclui newsletter, outras campanhas históricas avulsas, alterações Hotpipe, RLS, DNS, troca de provedor e plano pago.
- Aceite: destinatários únicos, preço/link vivos, copy verdadeira, idempotência, recibos e canal sem endereço omitido. O monitor pode encontrar outros pedidos que já atendam à condição; isso será informado antes da implantação.
- Rollback: pausar o gate de e-mail; cancelar somente pendências `price_update`; restaurar funções e código a partir do snapshot, preservando ledger/recibos. Mensagens aceitas não são reversíveis. Migração deve ser promovida pelo mecanismo oficial, sem editar journals manualmente.

## Estado

Pacote local preparado na branch `codex/price-alert-email-2026-11-24`, base `d333347`. A fila existente recebeu seis pedidos antigos elegíveis da V9 Max sob a autorização desta conversa; não houve implantação, migração, publicação ou nova cobrança contratada.

Às 10h53 SP: sete e-mails desta rodada tinham entrega confirmada, incluindo os dois anteriores, e um estava `uncertain/email_outcome_unknown`. Há cinco novos recibos assinados, todos conciliados; não existe recibo sem vínculo para recuperar o incerto com segurança. Esse pedido não será reenviado sem conciliação no provedor. Dez destinatários restantes têm aviso avulso preparado, ainda não enfileirado.

O fluxo permanente proposto também corrige a dependência dos gates SQL: HMAC continua obrigatório e válido por cinco minutos; o tick ocorre quando qualquer canal está habilitado; a outbox WhatsApp só é reservada quando o gate Hotpipe está ligado. Pausar ambos pausa o tick. Nenhum grant ou RLS é ampliado. Na leitura anterior à implantação, oito pedidos de outras Bikes já satisfaziam suas condições e não tinham e-mail de preço; poderão ser capturados pelo monitor corrigido. Não são parte da campanha avulsa da V9 Max.

## Validação e revisão posterior local

- 26 testes direcionados passaram: copy, escaping, links diretos, preço-alvo não atingido no aviso avulso, chave idempotente, lease, throttling, resultado incerto e independência entre canais.
- PostgreSQL 17 isolado: inscrições antigas/novas, ausência de e-mail, consentimento, alvo, cancelamento, bounce/complaint, não repetir incertos, claim limitado e sem duplicidade, aviso avulso, lease incorreto, corpo imutável, oferta alterada, reclamação tardia, privilégios, gates independentes, HMAC inválido e rollback passaram. A sintaxe DDL foi corrigida durante o ensaio, antes de qualquer aplicação externa.
- Lint do escopo e `pnpm validate` passaram: TypeScript, 71 regressões e build SSR. O runtime Node embarcado impediu bindings nativos por assinatura; foi usado Node 22.16 oficial em diretório temporário, com SHA-256 verificado no manifesto nodejs.org, sem alterar proteções do sistema ou dependências do repositório.
- Prévia sem PII: `artifacts/price-alert-email-2026-11-24/v9-max-email-preview.html`; renderer responsivo existente preservado, novo texto coberto pelos testes.
- Migração e rollback em `docs/sql/price-alert-email-2026-11-24/`; DML do lote avulso exige exatamente dez endereços únicos, gate ativo, mesma oferta/preço, consentimento e nenhuma supressão ou mensagem anterior para o request. Não modifica alvos, consentimentos ou inscrições.

| Perspectiva | Status local | Evidência / condição produtiva |
| --- | --- | --- |
| Produto | Pass | Regra dual por endereço disponível, exceção sem e-mail mantida, aviso avulso não simula alvo atingido. |
| Arquitetura | Pass | Mesma fila, idempotência e lease; snapshots por Bike; gates/canais independentes ensaiados. |
| IA/Agentes | N/A | Nenhuma geração ou agente alterado. |
| Segurança | Pass | HMAC, escopo privado, consentimento, supressão e revalidação pré-POST; sem PII/secret na proposta. |
| UX/UI | Pass | Texto distingue preço atual de alvo; oferta/Radar diretos e prévia disponível. |
| CX/Operação | Pass | Sete entregues e um incerto são relatados separadamente; dez pendentes de implantação, sem replay do incerto. |
| Growth/CRO | Pass | Oferta real e link direto; sem plano novo ou inclusão em newsletter. |
| PMO/QA | Pass local | Testes, ensaio, validate e rollback aprovados; migração/publicação ainda dependem de autorização específica. |

Estado: **GO para autorização da publicação/migração e lote avulso; não declarar correção permanente ativa nem dez e-mails enviados antes da implantação**. Risco residual: um resultado incerto real precisa de consulta ao Resend. Não presumir entrega pelo aceite.

## Autorização de release

Em 24/11, o responsável respondeu “pode” à proposta concreta de publicação da correção, migração oficial, liberação dos dez avisos avulsos e monitoramento das 75 inscrições. Foram informados os oito outros pedidos elegíveis, risco médio, custos existentes/pequeno consumo eventual Lovable e rollback. Esta autorização pertence à mesma conversa e ao mesmo escopo. Execução/recibos serão registrados abaixo após confirmação.
