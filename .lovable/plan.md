
# SDR IA "Lucas" no /escolherbike

Substituir o botão flutuante de WhatsApp da página de resultado do quiz por um assistente virtual consultivo ("Lucas") que conhece o contexto do lead, as bikes recomendadas e conduz a conversa até o clique no link correto do Mercado Livre.

## 1. Arquitetura

```text
EscolherBike (resultado)
   │
   ├─ <LucasSDRWidget lead={...} recommendation={...} answers={...} labels={...} tracking={...} />
   │      ├─ Botão flutuante (ícone de chat, não WhatsApp)
   │      ├─ Bubble de convite ("Ainda em dúvida? Fale com o Lucas")
   │      ├─ Painel: header + mensagens + quick replies + composer
   │      ├─ useLucasChat() → estado, sessionStorage, orquestração
   │      └─ chama supabase.functions.invoke("sdr-lucas-chat", {...})
   │
   └─ FloatingSpecialistWhatsApp REMOVIDO desta página
        (handoff humano fica dentro do próprio painel do Lucas)

Edge Function `sdr-lucas-chat`
   ├─ Recebe: lead_id, mensagens, contexto do quiz + recomendação, histórico
   ├─ Monta system prompt do Lucas com BIKES (import de bikes.ts espelhado em _shared)
   ├─ Chama Lovable AI Gateway (google/gemini-3-flash-preview) com JSON estruturado
   ├─ Retorna: { reply, intent_level, preferred_bike, main_objection,
   │            purchase_timing, suggested_action, offer_link, offer_group,
   │            offer_handoff, bike_for_link }
   ├─ Persiste métricas SDR em quiz_leads (colunas sdr_*)
   └─ Loga evento em quiz_events (event_type = sdr_*)

Links de compra
   └─ Resolvidos NO FRONTEND por getPurchaseLink(bike, tracking) já existente.
      A IA nunca emite URL — só devolve `bike_for_link` (id) e a UI monta o botão.
```

## 2. Arquivos

Criados
- `supabase/functions/sdr-lucas-chat/index.ts` — endpoint da IA (Lovable AI Gateway, sem chave no frontend).
- `supabase/functions/_shared/bikes-catalog.ts` — cópia mínima de `src/data/bikes.ts` (id, nome, preço, autonomia, capacidade, peso suportado, bateria, motor, freios, categoria, benefícios, limitações). Fonte única continua sendo `src/data/bikes.ts`; este arquivo é gerado a partir dele.
- `src/components/LucasSDR/LucasSDRWidget.tsx` — botão + convite + painel (desktop 400px, bottom sheet mobile).
- `src/components/LucasSDR/LucasChatPanel.tsx` — mensagens, quick replies, composer, CTA de compra dentro do chat.
- `src/components/LucasSDR/useLucasChat.ts` — hook com estado da conversa, sessionStorage por `lead_id`, chamada à edge function, orquestração de auto-open/cancelamento.
- `src/components/LucasSDR/types.ts` — tipos compartilhados.
- `src/lib/sdr-tracking.ts` — helper para eventos `sdr_*` (reaproveita fluxo existente de quiz_events e webhook do Make).

Alterados
- `src/pages/EscolherBike.tsx` — remove `<FloatingSpecialistWhatsApp>` do resultado, injeta `<LucasSDRWidget>` com contexto completo (answers, labels, clusters, recommendation, raw_recommendation_json, origem/UTMs, source_bike_interest, lead_id, links resolvidos). Botões "Comprar aqui" e demais CTAs permanecem intactos.
- `src/data/bikes.ts` — sem mudança funcional; apenas exportar helpers para o widget resumir specs.
- Migração SQL nova: colunas `sdr_*` em `quiz_leads` + índice por `lead_id` em `quiz_events` (se ainda não existir).

Não alterados
- Engine de recomendação, perguntas, pontuação, filtros rígidos, captura, webhook do quiz, lógica UTM, lógica Link Meta vs Link Vitale, `getPurchaseLink`, botões atuais de compra, layout principal do resultado.

## 3. Segurança da IA

- `LOVABLE_API_KEY` já existe nos secrets; usada só na edge function.
- Nenhuma chave, prompt de sistema, ou lista de bikes trafega para o cliente.
- Edge function valida payload com Zod, escopa por `lead_id` (verifica existência em `quiz_leads`), aplica rate-limit simples (contagem por lead nos últimos 60s).
- IA devolve **JSON estruturado** (schema pequeno, sem enums abertos). A UI ignora qualquer URL que a IA tente inserir; links são construídos exclusivamente por `getPurchaseLink(bike, tracking)` a partir do `bike_for_link` retornado.
- `sdr_affiliate_disclosure_shown` controla a exibição única do aviso de afiliado.

## 4. Contexto enviado à IA (por request)

`{ lead_id, answers, labels, clusters, recommendation: { primary, secondary, reasons, raw_recommendation_json }, origin: { utm_*, traffic_origin, source_bike_interest }, link_group_expected, history: UIMessage[], user_message }`

Os dados das bikes envolvidas (principal, secundária e quaisquer citadas pelo usuário) são adicionados a partir do catálogo do próprio backend — a IA nunca recebe URLs de compra.

## 5. Prompt interno do Lucas

Exatamente o texto da seção 28 do briefing, acrescido das regras de estilo (≤80 palavras, 1 pergunta por vez, sem afirmações absolutas, sem inventar specs/preço/estoque/garantia, respeitar filtros rígidos, oferecer recálculo quando o usuário alterar respostas do quiz, oferecer grupo/lista geral só quando fizer sentido, transparência de afiliado uma única vez).

## 6. Banco (migração)

Colunas novas em `quiz_leads` (todas opcionais):
`sdr_conversation_started_at timestamptz`, `sdr_last_interaction_at timestamptz`, `sdr_message_count int default 0`, `sdr_intent_level text` (low|medium|high), `sdr_preferred_bike text`, `sdr_main_objection text`, `sdr_main_objection_label text`, `sdr_purchase_timing text`, `sdr_link_offered bool default false`, `sdr_link_sent bool default false`, `sdr_link_clicked bool default false`, `sdr_affiliate_disclosure_shown bool default false`, `sdr_offers_group_link_sent bool`, `sdr_offers_group_link_clicked bool`, `sdr_bike_list_link_sent bool`, `sdr_bike_list_link_clicked bool`, `sdr_human_handoff_requested bool`, `sdr_conversation_summary text`, `sdr_conversation_status text`.

Os GRANTs seguem o padrão já existente na tabela.

## 7. Eventos de tracking

Reaproveita `quiz_events` (mesma função edge `quiz-track` já existente). Novos `event_type`:
`sdr_invite_viewed, sdr_auto_open_scheduled, sdr_auto_opened, sdr_auto_open_cancelled, sdr_opened_manually, sdr_closed_by_user, sdr_quick_question_clicked, sdr_message_sent, sdr_response_received, sdr_comparison_requested, sdr_high_intent_detected, sdr_link_offered, sdr_link_sent, sdr_purchase_link_clicked, sdr_offers_group_link_sent, sdr_offers_group_link_clicked, sdr_bike_list_link_sent, sdr_bike_list_link_clicked, sdr_human_handoff_requested, sdr_conversation_closed`.

Payload padrão inclui `lead_id`, bikes recomendadas, preferred_bike, intent, objeção, UTMs, `link_group_used`, `purchase_link_used`, `device_type`.

## 8. Abertura automática

- Convite (bubble) aparece 5s após o resultado carregar.
- Auto-open do painel: 15s desktop / 20s mobile.
- Cancelado se: usuário abriu manualmente, fechou o chat/convite, clicou em "Comprar aqui", outro modal ativo, campo de input em foco, ou (mobile) usuário rolando/tocando nos últimos 2s.
- Usa `sessionStorage` chaveado por `lead_id` para "1x por sessão".

## 9. Link Meta vs Link Vitale

Continua sendo decidido pela função existente `getPurchaseLink(bike, tracking)`. A IA só devolve o id da bike; o botão dentro do chat chama a mesma função — portanto Meta usa Link Meta, restante usa Link Vitale, exatamente como no botão "Comprar aqui".

## 10. Clique no link pelo SDR

O botão "Ver [BIKE] no Mercado Livre" dentro do chat chama o mesmo handler de compra do resultado (atualizando o mesmo `lead_id`, sem criar novo lead), acrescentando `event_type = sdr_purchase_link_clicked` e `sdr_intent_level` / `sdr_main_objection`. Se o fluxo atual dispara webhook do Make no clique, ele continua sendo disparado.

## 11. Handoff humano

Botão "Falar com um especialista" aparece dentro do painel quando o usuário pede humano, quando a IA sinaliza `offer_handoff`, ou após erro persistente. Abre WhatsApp com o mesmo phone/mensagem contextualizada que o `FloatingSpecialistWhatsApp` usava (nome, respostas, bike recomendada).

## 12. Grupo de ofertas e lista geral

Aparecem como botões dentro do chat quando a IA sinaliza `offer_group` (usuário pesquisando/sem urgência) ou pede outros modelos. Links fixos definidos em constantes do widget. Nunca substituem o link específico da bike.

## 13. Tratamento de erros

- Rate limit (429) / créditos (402) → mensagem amigável + botão "Falar com um especialista".
- Falha de rede/parse → mensagem padrão de fallback + retry manual.
- Nunca "Não consegui responder"; sempre oferece comparação ou handoff.

## 14. Testes

Cobrir os 17 testes do briefing via checklist manual em Playwright (roteiro em `/tmp/browser/lucas-sdr/`) e um teste Deno em `supabase/functions/sdr-lucas-chat/index.test.ts` validando:
- Payload rejeita `lead_id` inválido.
- Origem Meta → `link_group_used = meta` (verificado no evento persistido pelo click handler).
- IA nunca produz URL: mesmo se o modelo tentar, a UI usa apenas `getPurchaseLink`.
- Filtros rígidos: se o usuário mudar orçamento/garupa/etc., a resposta inclui `suggested_action = "recalc"` e a UI mostra o botão "Refazer quiz".

## 15. Detalhes técnicos relevantes

- Modelo IA: `google/gemini-3-flash-preview` (rápido, multimodal, custo baixo — dentro da lista de `ai-models-chat`).
- AI SDK via `@ai-sdk/openai-compatible` + `createLovableAiGatewayProvider` (helper padrão) usando `generateText` com `Output.object` (schema pequeno, sem `min/max`, sem enums grandes; validações duras ficam no código).
- Persistência de conversa: `sessionStorage` no cliente (chave `sdr_lucas_thread_<lead_id>`), truncando histórico para as últimas ~20 mensagens antes de enviar à IA.
- Widget usa AI Elements? Não — mantemos leve e alinhado à estética atual do resultado; segue design do site (branco/verde, tipografia atual). Sem `Sparkles`; ícone será um `MessagesSquare`/`Bot` do lucide + avatar "L" do Lucas.
- Nenhum efeito colateral em `Header`, `Index`, `WhatsAppFloat` (usado em outras páginas), ou `FloatingSpecialistWhatsApp` (o componente continua existindo, só não é renderizado em `/escolherbike`).

Ao final da implementação, respondo com o checklist da seção 37 do briefing (arquivos, arquitetura, prompt final, campos, eventos, resultado dos 17 testes, confirmação da substituição do botão e de que os CTAs de compra seguem funcionando).
