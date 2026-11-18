# Operação dos alertas de preço

## Cadastro e conversa

O formulário grava o pedido e o consentimento. Uma outbox leva o pedido à Hotpipe; o aceite desse webhook só confirma a persistência. Confirmação de cadastro usa site_alerta_preco_cadastrado_v1, sem afirmar que houve queda. O e-mail usa a mesma Bike e dados vivos do Radar, resolvidos no backend. Falha de transporte não apaga o pedido.

Mensagem de WhatsApp:

> Olá, {{nome}}! Seu alerta para a {{bike}} foi registrado. 🔔
>
> Assim que encontrarmos uma oferta dentro da condição que você escolheu, vamos te avisar por aqui.
>
> Enquanto isso, participe do nosso grupo de ofertas para acompanhar promoções e oportunidades de bikes elétricas: https://vitalemobilidade.com/grupodeofertas
>
> Você ainda está pesquisando ou já quer comprar uma bike agora?

O template aprovado de queda continua site_alerta_de_preco. O novo e-mail distingue registro e preço atingido; foto/links/preços vêm do catálogo, sem geração de imagem ou texto por IA.

## Follow-up

Pedido complementar escrito: manhã de D+1. Agendar 09h America/Sao_Paulo do dia seguinte ao aceite do aviso. A janela de recuperação termina às 19h desse mesmo dia. Não é uma promessa de exatamente 24 horas: um aviso às 16h resulta em follow-up devido às 09h do dia seguinte, conforme a preferência explicitada pelo responsável.

Modelo site_alerta_preco_acompanhamento_v1:

> Olá, {{nome}}! Te avisamos que a {{bike}} chegou ao preço do seu alerta. Você conseguiu comprar ou ainda está pesquisando?
>
> Se ainda não comprou e quer continuar acompanhando, cadastre um novo alerta para essa bike: {{link_radar}}
>
> Participe também do nosso grupo de ofertas: https://vitalemobilidade.com/grupodeofertas
>
> Se precisar de ajuda para escolher, pode responder por aqui.

Exigir entrega/lido do aviso original, nenhum novo inbound, ausência de opt-out, conversa com IA atendendo, sem humano e modelo Meta aprovado com corpo exato. Recadastro é ação explícita da pessoa; não reabrir pedido sent automaticamente. Quem já respondeu segue o Lucas existente e não recebe esse follow-up.

## Indicadores e rotina

Painel: totais globais de cadastros, pessoas únicas por telefone, cadastros ativos, últimos sete dias, histograma de 30 dias de calendário SP e eventos de exportação com falha/pendentes. A Hotpipe fornece o estado do pedido atual de cada cadastro: aguardando preço, aceito, entregue/lido, falho ou incerto. Não extrapolar pessoas a partir de eventos/requests históricos. Gráfico possui tabela acessível. Uma fonte remota indisponível aparece como indisponível, nunca zero.

Criada conferência diária somente leitura no Codex às 09h30, America/Sao_Paulo, automação verificar-alertas-de-pre-o-da-vitale. Confere logs/contagens/crons e fila parada, sem enviar teste, gerar IA paga ou reparar produção. Os workers existentes seguem verificando preços e filas a cada minuto. Mensagens de teste reais exigem destinatário e autorização específicos; testes de software usam fixtures e transporte mockado.

## Cancelamento e suporte

O e-mail usa reply-to operacional já configurado e informa que a pessoa pode responder pedindo cancelamento. Operação deve cancelar o cadastro correspondente na **origem Vitale** (`bike_price_alerts.status=cancelled`, mantendo ID/consentimento/histórico); o trigger existente envia cancel à Hotpipe e a fila de e-mail cancela pendências/revalida antes do POST. Não cancelar apenas a oportunidade CRM se a pessoa pediu ambos os canais. Esse atendimento é manual; não foi criado fluxo novo de descadastro público. Uma mensagem já aceita pelo provedor não pode ser recolhida.

## Implantação proposta

1. Revisar e autorizar as mudanças produtivas. Reconfirmar snapshot sem PII das definições/settings/mapa afetados. Snapshot lógico e rollback da única função substituída estão no pacote Hotpipe; restauração ensaiada em Postgres local. Isto é cópia dos objetos afetados, não backup integral do Supabase nem prova de restauração integral de produção.
2. Publicar somente as branches desta entrega, sem alterações de outras tasks. Aplicar SQL aditivo de e-mail/métricas na Vitale e ciclo/mapa na Hotpipe, com os gates novos OFF. Usar ferramenta oficial de migration e registrar as versões; os arquivos em docs/sql são propostas, não histórico aplicado.
3. Implantar api-price-alerts e price-alert-worker na Hotpipe; bike-price-alert na Vitale; publicar o frontend/server Vitale. São necessárias três Edge Functions. Este host não tem CLI Supabase nem token autenticado. O conector Lovable publica frontend, mas não expõe deploy de funções: agente Lovable somente para implantação exata, último recurso, consumo qualitativamente pequeno de créditos. Não usar para gerar/reimplementar o código.
4. Cadastrar/submeter à Meta os dois modelos do JSON de revisão. Categoria MARKETING é proposta por conter convite ao grupo; classificação/aprovação efetivas pertencem à Meta. O modelo de queda já aprovado não é substituído. Salvar IDs aprovados nas configurações e conferir corpo/idioma/variáveis no runtime.
5. Conferir domínio/remetente, credenciais existentes e cota Resend por canal seguro, sem trocar plano ou DNS. Habilitar e-mail e os novos gates WhatsApp somente com dependências atendidas. Pedido atual autoriza ativação prospectiva; confirmação separada do banco/modelos/implantação ainda será solicitada com o pacote concreto. Não importar os 59 cadastros, reenviar falhas ou recuperar os 12 incertos nesta operação.
6. Conferir estado e primeiras execuções normais. Ausência de cadastro novo não justifica disparo artificial para clientes. Homologação externa controlada pode ser proposta para um destinatário do responsável, sem disparo até autorização específica.

## Incidentes existentes

Nove HTTP422: bikes sem vínculo. Os 44 modelos públicos tiveram correspondência exata e única com produtos Hotpipe; 12 vínculos novos estão preparados e conferidos em manifesto. Essa migration não reprocessa os nove eventos. Um HTTP400: nome sem letras; titular precisa corrigir, nenhum nome será inventado. Doze uncertain: nenhuma mensagem com o request_id foi encontrada na leitura; ausência de histórico não prova ausência de envio. Preservar e conciliar sem replay automático.

## Rollback

Primeiro desabilitar price_alert_email_settings.enabled e confirmation_enabled/follow_up_enabled Hotpipe. Restaurar os códigos das bases Vitale 0fd30b6 e Hotpipe c637d63; aplicar rollback Hotpipe para restaurar a função claim anterior. Manter tabelas, vínculos verificados, recibos, chaves idempotentes e consentimentos. Não apagar eventos nem recolocar uncertain/sent na fila. Novos e-mails/WhatsApp aceitos antes da pausa não são reversíveis.

Referências técnicas: [aprovação de templates Meta](https://developers.facebook.com/docs/whatsapp/api/messages/message-templates/interactive-message-templates), [idempotência Resend com janela de 24 horas](https://resend.com/changelog/idempotency-keys). O ledger local preserva o resultado além dessa janela e não reenvia resultados incertos.
