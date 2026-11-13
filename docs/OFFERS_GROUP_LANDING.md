# Landing de campanhas do grupo de ofertas

Base: `81e48a95f73f41baa7bbd7dfd0f53823730c6561`, projeto Lovable ativo. Classificação **estrutural**: nova entrada pública SSR, SEO e contrato de mensuração via GTM. A configuração administrativa e a rota de convite são herdadas.

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Entrada de anúncios para o grupo e apoio à decisão de compra | Confundir clique com ingresso ou sugerir lojas diferentes | Posicionamento da Vitale, grupo e Radar atuais | Prosseguir com conteúdo próprio, Mercado Livre e CTA único por bloco |
| CTO e Arquitetura | Nova rota TanStack SSR e evento no GTM existente | Loader global externo, atraso de navegação ou duplicação | Entry SSR, contêiner atual e rota 302 existente | Rota estática sem consulta ao catálogo, âncora HTML sem espera e um handler de clique |
| IA e Agent Engineering | Conteúdo fixo, nenhuma nova geração | Inventar condições de oferta ou acionar SDR | Foto e modelo aprovados, entrada WhatsApp herdada | Usar exemplo explicitamente ilustrativo; manter automações fora do fluxo |
| Segurança | Campanhas chegam com UTMs e IDs técnicos | Vazamento em URL, Referer, armazenamento ou tag não consentida | Política pública e release GTM analítico | Manter IDs na URL de entrada, restringir payload, impedir referer no convite, não habilitar tags de Ads/Meta |
| UX/UI | Jornada de uma ação em mobile e desktop | CTA abaixo da primeira dobra ou interface concorrente | Logo, Inter e tokens existentes | Header e rodapé compactos, sem formulário, foco visível, CTA repetido após FAQ |
| CX e Operação | Explica convite e compra | Alterar destino ativo ou prometer preço/estoque | Administração e destino 302 existentes | Preservar a rota de convite; explicar verificação na oferta; sem disparos reais |
| Growth e CRO | Destino com valor próprio e contrato de conversão | Reprovação, contagem duplicada ou perda de auto-tagging | Políticas do Google, política Vitale, GTM e contas de anúncios | SSR e canonical limpo; evento único de CTA; preparar configuração restrita a consentimento e à rota |
| PMO e QA | Entrega revisável e reversível | Confundir preview e produção ou mudança de conta/contêiner | Gate `pnpm validate`, smoke isolado, aprovação de merge/deploy | Branch isolada; testar navegador e HTTP; separar release de página e ativação de publicidade |

**Conflitos e trade-offs.** Growth pede atribuição desde o primeiro anúncio; Segurança bloqueia armazenamento e tags publicitárias sem consentimento de marketing válido. A política atual declara que Ads/Meta não são carregados e a opção disponível é analítica, com ads negado. Não reaproveitar preferências antigas como autorização. Manter query de entrada intacta para Google tag/Linker após futuro aceite, sem repassá-la ao convite. O CTA navega imediatamente; recusamos esperas para melhorar taxa de entrega da tag, portanto bloqueadores, falta de JS ou carregamento incompleto podem reduzir cobertura. Não criar evento de 302 nem alterar o contrato agregado, cujo schema é destinado a páginas/Bikes/afiliados: os números medem etapas diferentes.

**Decisão consolidada.** Implementar `/entrenogrupodeofertas`, SSR com meta/OG/JSON-LD, referência aprovada da Bike, FAQ, links institucionais e Radar, âncoras diretas para a rota administrada, evento local com UTMs minimizadas e plano de configuração de preview. Dependências: código atual, assets e GTM analítico. Aceite local: GET 200 sem `Location` com/sem UTMs e com crawler, canonical fixo, CTA na dobra de 320 × 568, teclado, navegação sem JS, um evento por clique e zero por visita; publicidade permanece bloqueada independentemente da preferência analítica. Fora de escopo: CMP produtivo, publicação de tags, CAPI, GA4 importado como conversão, ingressos inferidos, troca de convite, campanhas e Supabase. Rollback: reverter o commit da landing e republicar a versão anterior, mantendo `/grupodeofertas`; para ativação futura, reverter só a versão do contêiner que adicionou publicidade.

## Contrato de mensuração e configuração para preview

| Etapa | Sinal e significado |
| --- | --- |
| Visita | `page_view` analítico existente, sujeito à preferência de analytics. Nunca é conversão de publicidade. |
| Acionamento do link | `offers_group_cta_click`, com `page_path=/entrenogrupodeofertas`, `cta_position=hero` ou `after_faq` e `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`. Códigos curtos, únicos e sem texto livre; campos inválidos/ausentes são nulos. Não usar PII nos valores de campanha. |
| Convite | `/grupodeofertas` recebe navegação HTML sem query nem Referer e responde 302 com destino gerenciado pelo Admin. Sem evento novo no redirecionamento. |
| Ingresso | Só existe como métrica se houver confirmação independente do WhatsApp. O fluxo atual não observa ingresso. |

Sem cookies/armazenamento novos para o evento. O handler não chama `preventDefault`, não espera tags e ignora eventos DOM sintéticos. Só os canais de analytics já existentes recebem dados; o objeto no dataLayer é local enquanto não houver tag assinante. A landing não entra no storage de atribuição do Quiz. O auto-tagging permanece na URL de entrada (inclusive `gclid`, `gbraid`, `wbraid` e `fbclid` quando presentes), sem copiar esses parâmetros para eventos da aplicação, Radar ou convite. GA4 usa o endereço limpo; IDs de anúncios só devem ser usados pelas tags dos próprios destinos após consentimento apropriado. Sem backend, CAPI ou conversões importadas do GA4.

### Estado conferido no dia 13/11/2026

- Contêiner Web [GTM-NM9MGXNM](https://tagmanager.google.com/#/container/accounts/6353119929/containers/251177592/workspaces/17), versão pública **16**. GA4 **G-LXMH4RWQHV** ativo. Tag Ads, Linker (tag 33) e Pixel geral (tag 24) pausados. A tag histórica `AW-959092330` não foi confirmada como pertencente à conta solicitada e não deve ser reaproveitada sem verificação. O listener legado com espera de 2 segundos está condicionado a links `tel:`; o CTA não usa esse acionador.
- Google Ads: a sessão disponível mostrava somente a conta Hotpipe (fechada). A conta Vitale **521-126-5158** veio da solicitação; a ação, o AW/label e o auto-tagging não puderam ser confirmados nela.
- Meta: Events Manager exigiu login na sessão disponível. **924744493952295** veio da solicitação como conta VitaleMobilidade1; não se confirmou se também é o ID do Pixel/conjunto de dados. Não usar o ID de conta como ID de Pixel sem conferência.
- A [política vigente](https://vitalemobilidade.com/privacidade) e `docs/CONSENT_2026-09-30.md` autorizam analytics sem publicidade. Sem consentimento válido de marketing, sem IDs confirmados e sem release da landing, não foi salvo rascunho remoto de tags de anúncios, não houve envio a Ads/Meta e não foram executados Tag Assistant/Meta Test Events de ponta a ponta. O plano abaixo é o rascunho para implementar em workspace isolado após preencher os pré-requisitos.

### Rascunho de configuração — manter fora de produção

1. CMP/política: documentar finalidades e fornecedores, aceitar ou recusar publicidade explicitamente, respeitar GPC e suportar revogação; analytics é independente. Padrões negados antes de iniciar o GTM. Usar modo básico: sem pings de Ads quando negado, sem script Meta, sem CAPI. Só um aceite de publicidade atual pode atualizar `ad_storage` e `ad_user_data` antes dos acionadores de anúncio; manter `ad_personalization` negado se não houver finalidade e consentimento correspondentes. Não usar preferência legada nem cliques ocorridos antes do aceite.
2. Acionador GTM compartilhado: evento personalizado exato `offers_group_cta_click`, DLV `page_path` exatamente `/entrenogrupodeofertas`, Page Path `^/entrenogrupodeofertas/?$` e DLV `cta_position` em `^(hero|after_faq)$`. Restringir o host de produção; em ambiente de QA isolado, usar origem e destinos de teste autorizados. Modo **uma vez por evento**, exigir `ad_storage` e `ad_user_data` concedidos. Não usar Just Links, espera, click URL, evento de histórico ou visita como conversão.
3. Google Ads: na conta confirmada, criar/reutilizar ação de site **Clique no CTA do grupo de ofertas (WhatsApp)**, contagem **Uma**, sem valor fixo e inicialmente secundária para validação. Obter `AW-…` e label da ação na interface. Vincular uma única tag nativa Google Ads Conversion Tracking ao acionador acima. Confirmar auto-tagging nas configurações da conta. Na landing, após consentimento, inicializar o Google tag Ads verificado; se necessário, instalar um único Conversion Linker, também bloqueado por consentimento, no carregamento com aceite persistido ou no novo aceite na própria página, antes do clique. Sem vinculação entre domínios ou decoração de links. Validar na documentação do [Conversion Linker](https://support.google.com/tagmanager/answer/7549390) e no Tag Assistant se a base existente torna o Linker redundante. Sem Enhanced Conversions, CRM ou importação do mesmo evento de GA4.
4. Meta: no Events Manager da conta confirmada, obter o **ID do Pixel/conjunto de dados** e verificar associação e permissões. Em GTM, inicializar apenas esse Pixel em tag de setup após consentimento e disparar somente `trackSingleCustom` para `OffersGroupCtaClick` no acionador acima, sem PageView adicional, Advanced Matching ou dados de usuário. Enviar apenas caminho e posição como parâmetros do evento, limitar a localização reportada à URL canônica, confirmar o payload real antes da liberação e bloquear o release se o Pixel enviar parâmetros arbitrários. Se necessário para otimização, criar [conversão personalizada](https://developers.facebook.com/docs/marketing-api/reference/custom-conversion/) por **nome de evento** e fonte verificada; uma regra de URL isolada contaria visitas. Verificar Events Manager e o contêiner server antes de ativar, para excluir duplicidade com qualquer origem existente; não configurar CAPI.
5. Tag Assistant e Meta Test Events: validar com query de teste e em sessões novas (indefinida, recusada e concedida), clique por mouse e teclado, e revogação. Zero conversão na visita ou no 302; zero rede publicitária sem consentimento; com aceite, uma conversão nativa Google e um evento de navegador Meta por acionamento, sem replay. Confirmar a captura do auto-tagging na landing após aceite e a URL/headers limpos do convite. Publicar a versão GTM apenas após validação e autorização separadas. As campanhas pertencem ao projeto de anúncios.

Referências de destino: [incompatibilidade de destino](https://support.google.com/adspolicy/answer/16428020) e [conteúdo original insuficiente](https://support.google.com/adspolicy/answer/16427718). A landing oferece conteúdo original em SSR; aprovação do anúncio depende da análise da plataforma.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | A página explica como aproveitar as ofertas de um único marketplace, antes do clique. Radar é secundário e o exemplo não oferece compra. |
| CTO e Arquitetura | Pass | Build SSR com GET/HEAD 200 no worker local; mesmo HTML principal para browser e AdsBot, sem loader de vídeos, script de anúncio, popup ou dependência de catálogo nesta entrada. |
| IA e Agent Engineering | N/A | Sem geração, agente, dados de usuário ou automação. Foto e nome FT03 vêm do catálogo versionado; exemplo rotulado e sem preço. |
| Segurança | Pass | URL/Referer do convite limpos, UTMs filtradas, sem persistência própria ou captura de atribuição do Quiz nesta rota. Consentimento analítico antigo com marketing=true não libera publicidade. |
| UX/UI | Pass | Chrome em 320 × 568 e 1440 × 900, Inter local, foco visível e Enter, zero violações automáticas no recorte WCAG A/AA do axe, CTA funcional com JS desabilitado. |
| CX e Operação | Pass | A entrada existente respondeu 302 e no-store em produção e no worker local; nenhuma mudança no admin nem mensagem disparada. |
| Growth e CRO | Pass | Metadata/OG/canonical/JSON-LD/sitemap, URL de entrada preservada e um único evento de clique por ação testada. A ativação de conversões publicitárias é uma etapa separada, ainda bloqueada. |
| PMO e QA | Pass | Gate do app, regressões direcionadas e smoke do artefato local concluídos. Sem alteração em banco, Lovable, contêiner GTM ou campanhas. |

- Validação: `pnpm validate` (69 testes, TypeScript e build cliente/SSR); 46 testes direcionados (landing, GTM, sitemap e convite); lint dos arquivos novos de código e `git diff --check`. Preview do artefato via Wrangler local, pois o `vite preview` da configuração existente procura uma saída diferente da produzida pelo build Cloudflare.
- No preview do build, CTA em 320 × 568 terminou a 429 px do topo; em 1440 × 900, a 480 px. Teclado no hero e mouse após FAQ: zero eventos na visita, um evento por ação, e nenhuma navegação ou conversão sintética. Sem JS: navegação normal, zero eventos. Rede externa bloqueada no ensaio; o convite foi interceptado para não abrir WhatsApp. Analytics ligado/desligado e consentimento legado foram ensaiados com mocks do host produtivo; publicidade concedida válida ainda não existe no site.
- A fonte Inter é local, subconjunto latino, sob SIL OFL (licença incluída). Foto aprovada: `src/assets/bikes/ft03.avif`, associada à FT03 em `src/data/bikes.ts`. O OG reutiliza a peça pública do grupo.
- Parecer: **GO condicionado para publicar apenas a página** após revisão e autorização explícita de merge e deploy Lovable. **NO-GO para publicidade** até política e consentimento válidos, confirmação de IDs e validação em preview nas plataformas. O site atual ainda não serve a landing; não usar como destino de veiculação antes do smoke produtivo.
- Publicação proposta: integrar o PR e publicar o projeto Lovable ativo, sem custo externo previsto nem alteração de banco ou configuração GTM. Risco baixo e reversível; smoke pós-release com/sem UTMs, AdsBot, CTA e 302. Se falhar, reverter o PR e republicar a última versão aprovada.

## Publicação da landing — 13/11/2026

O PR #134 foi integrado no commit `13409148feed6d6f18a59d23396ba11fc4b80211`, sincronizado no projeto Lovable e publicado no deployment `ca3f4a7d-9f71-4a06-b3e2-6d0cdc9e8de0`. O domínio público respondeu HTTP 200 com e sem UTMs. O GTM permaneceu na versão 16, com publicidade pausada.

## Revisão prévia — consentimento Google Ads restrito à landing

Classificação estrutural pela integração publicitária. Base: merge do PR #134. Escopo local: escolha explícita de medição Google Ads na landing, atualização da política quando o recurso estiver habilitado e contrato de acionamento do Google via GTM. O recurso começa desabilitado. Para ativar, confirmar conta, ação, ID AW e label e validar o rascunho do GTM. Não há trabalho em Meta neste recorte.

| Perspectiva | Impacto, risco, dependência e decisão |
| --- | --- |
| Produto | Medir o CTA da campanha. O consentimento opcional preserva o acesso ao convite e o objetivo do clique. Prosseguir. |
| CTO | Reusar o GTM existente e separar a inicialização do container da preferência analítica. Exigir consentimento negado antes das tags e um evento distinto para preparar a atribuição. |
| IA | N/A. Sem automação ou processamento de conteúdo. |
| Segurança | Escolha de marketing dedicada, recusa por padrão e em GPC/DNT. Não reaproveitar preferência legada. Restringir a aplicação à rota e à origem produtiva. |
| UX | O CTA deve continuar na primeira dobra. Preferência acessível e abaixo do CTA, com possibilidade de revogação e link para a política. |
| CX | Não altera o convite nem o admin. Verificar clique com consentimento recusado ou indisponível. |
| Growth | Sem aceite, zero requests publicitários. Com aceite, Google tag/Linker antes do clique e uma tag de conversão por ação, sem GA4 importado. IDs precisam de confirmação. |
| PMO | Entrega local e teste proporcional. Release exige validação de preview e autorização do escopo de publicidade. |

Decisão: inicializar Ads apenas após aceite e validar rota, origem, estado e evento no GTM. Não atrasar navegação para aguardar uma tag. Rollback: desligar a flag e pausar as tags específicas da landing.

### Preview de consentimento Google

A flag de build `VITE_OFFERS_GROUP_GOOGLE_ADS_CONSENT=true` expõe o controle na landing e a descrição na política. O aceite vale na aba e pode ser revogado no mesmo controle. A opção analítica continua independente. GPC e DNT impedem a ativação. Com a flag ausente, o evento conserva o contrato publicado no PR #134.

| Tag em GTM | Acionamento |
| --- | --- |
| Google tag Ads ou Conversion Linker, se necessário | Evento personalizado `offers_group_google_ads_ready`, `Page Hostname = vitalemobilidade.com`, `Page Path` corresponde a `^/entrenogrupodeofertas/?$`, DLV `page_path = /entrenogrupodeofertas`, DLV `vitale_offers_google_ads = true`. Exigir `ad_storage` e `ad_user_data`. Inicialização apenas para atribuição. Sem PageView publicitário ou linker entre domínios. |
| Conversão Google Ads | Evento personalizado `offers_group_cta_click`, mesmos filtros e consentimento, mais DLV `cta_position` em `^(hero\|after_faq)$`. Disparar uma vez por evento, com o ID AW e o label verificados. Sem importar o mesmo clique via GA4. |

Usar somente a versão de preview de um workspace isolado. Confirmar no Tag Assistant que a atualização de Consent Mode foi processada antes do acionamento, que a inicialização preserva a atribuição apenas após aceite, que a recusa/revogação bloqueia o envio e que a visita não conta como conversão. O bloqueio duplo usa tanto o consentimento do GTM quanto o valor presente em cada evento do app. Conferir a recusa analítica com publicidade concedida e a ausência de ativação em todas as demais rotas. Usar conversão secundária de teste e o mínimo de parâmetros. A política do site e o estado negado de personalização devem continuar coerentes com os dados observados na rede.

### Revisão posterior — preview Google

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Escolha opcional, CTA principal disponível antes do controle. |
| CTO | Pass | Fila e contêiner existentes reutilizados. No Chrome com mock, um GTM por documento e inicialização separada do clique. |
| IA | N/A | Sem alterações em modelos, agentes ou automações. |
| Segurança | Pass local | GTM começa com publicidade negada. Recusa, revogação, GPC e analytics recusado verificados no Chrome com mock. |
| UX/UI | Pass | CTA inteiro na dobra em 320 × 568 em todos os estados ensaiados. |
| CX | Pass | Navegação limpa para a rota existente em todos os estados. |
| Growth | Pass local | Payload habilitado apenas no clique consentido. A validação real da atribuição e da conversão aguarda acesso à ação Google Ads e Tag Assistant. |
| PMO/QA | Pass local | Gate `pnpm validate` (69 testes, TypeScript e build), 28 testes direcionados e smoke com quatro estados no Chrome. |

Parecer: GO para revisão do código com a flag desativada. NO-GO para ativação publicitária enquanto a conta `521-126-5158` não expuser um AW e label verificados e o preview não confirmar a entrega. Nenhuma publicação desta etapa, alteração nas contas ou inclusão de Pixel/CAPI.

### Liberação autorizada do consentimento — 13/11/2026

Na conta Google Ads 521-126-5158 foi criada a ação manual **Clique no CTA do grupo de ofertas (WhatsApp)**, com contagem Uma, valor zero, otimização secundária e conversões otimizadas desativadas. O Google exibiu o ID `AW-18172764323` e o label `8g1VCP_H_7cdEKPBudlD`. A autorização do responsável cobre a publicação do controle nessa landing e a ativação da tag após preview no Tag Assistant. O controle pode ir ao ar primeiro para testar a tag em condições reais. Nenhuma tag Ads entra no contêiner público nessa primeira etapa. A flag passa a habilitar o controle por padrão e aceita `false` como desligamento.

### Revisão prévia — hero com ofertas do Radar

Mudança estrutural por usar o Radar como fonte. Produto: atende o pedido de uma única seção, com CTA principal e referência de valor própria. CTO: reusar repositório e cálculo do Radar em SSR, retornar só os cartões, manter 200 e CTA se faltar catálogo. IA: N/A, sem geração. Segurança: nenhum preço manual, credencial ou link de convite novo. UX: desktop em duas colunas, mobile com CTA primeiro, carrossel manual acessível. CX: preservar rota administrada. Growth: exibir percentual somente quando verificável e explicitar o preço típico como referência, sem chamar de desconto do lojista. QA: testar contrato SSR, variações de catálogo, mobile, teclado e conversão exclusiva do CTA.

Trade-off: os percentuais sugeridos são exemplos; o Radar compara com o preço típico observado, então o selo usa essa comparação. Priorizar relevância entre ofertas elegíveis. Sem elegíveis, mostrar modelos sem percentual quando houver catálogo e link para o Radar quando indisponível. Rollback: reverter a revisão da landing; para suspender medição, pausar as tags dedicadas e desligar o controle pela flag.

### Decisão atualizada — quatro exemplos históricos

O responsável fixou a ordem V9 Max, GT2000, FT03, V20 Ultra e solicitou números estáticos. Os cartões usam o maior e o menor preços registrados exibidos nas páginas públicas do Radar, no recorte padrão de 30 dias, consultado em 13/11/2026. A diferença é calculada como (maior − menor) ÷ maior. Os valores ilustram a variação histórica e têm link para o detalhe da Bike. As três fotos Vitale usam as versões AVIF do catálogo no repositório porque os URLs antigos enviados retornaram 404. A foto da V20 Ultra foi fornecida pelo responsável. Nenhum loader de Radar ou Supabase foi acrescentado à landing.

| Perspectiva | Revisão do hero |
| --- | --- |
| Produto | Pass. Um hero, um CTA de WhatsApp e quatro exemplos históricos na ordem solicitada. |
| CTO | Pass. HTML SSR com a primeira foto e carrossel local, sem dependência de catálogo em runtime. |
| IA | N/A. Dados e fotos de fontes identificadas. |
| Segurança | Pass. Sem preço prometido, histórico rotulado e CTA com URL limpa. |
| UX/UI | Pass. Navegação por teclado, quatro imagens verificadas e CTA dentro da dobra em 320 × 568 e 1440 × 900. |
| CX | Pass. Link existente e administração do convite preservados. |
| Growth | Pass para o hero. Cada modelo tem link ao detalhe e a variação publicada tem referência de cálculo e data. A entrega da tag continua sujeita ao teste separado. |
| PMO/QA | Pass. SSR 200 com e sem UTM, lint da rota, pnpm validate e smoke do carrossel. Rollback por revert da revisão. |
