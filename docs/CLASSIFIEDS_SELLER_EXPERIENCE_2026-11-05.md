# Jornada de anúncios, direito pago e acompanhamento — 05/11/2026

Classificação: estrutural (pagamento, Supabase, métricas e metadata pública). Mesmo Lovable/Supabase e backend Asaas existentes. Pedido: 12 ajustes da jornada, incluindo reuso de período pago, condições antes da criação, WhatsApp configurável, organização de fotos, compartilhamento e métricas.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | R$150 compra um espaço por 90 dias corridos desde a primeira publicação. Pausar não congela nem reinicia. Pode trocar a bike se a anterior estiver fora do ar; apenas uma ativa por pagamento. Admitir vários espaços pagos independentes. Prosseguir com termos claros. |
| Arquitetura | Preservar order/payment/provider IDs e reconciliação Asaas. Registrar origem e histórico da realocação do direito, sem recriar pagamento. Locks e testes SQL impedem duas bikes usarem o mesmo direito. Preservar SSR e contratos de fotos de 15 MB. Prosseguir condicionado. |
| IA | N/A: mensagem e métricas determinísticas; nenhum modelo ou agente pago. |
| Segurança | Autorização por dono no servidor, telefone deve continuar validado; mensagem não muda destinatário. Eventos agregados com deduplicação sem IP/e-mail/telefone; métricas privadas ao vendedor/Admin. Nunca liberar anúncio por retorno do checkout. Prosseguir condicionado aos testes de adversário. |
| UX | Condições antes do rascunho; acesso direto a perfil/anunciar/meus anúncios; Todos inclui desativados; fotos reordenáveis por controles acessíveis mobile/teclado; confirmação de contato na etapa 2; sucesso em modal com ver anúncio. Prosseguir. |
| CX | Preservar dados e imagens em pausa/reativação; novas cobranças evitadas quando há período elegível. Mensagens de erro específicas. Não executar pagamentos, mensagens ou alterações reais em anúncios durante testes. Prosseguir. |
| Growth | Ocultar captação ao reconhecer sessão; OG SSR usa capa pública do anúncio, sem URL assinada; compartilhar por link/WhatsApp/nativo. Contabilizar vitrine, visita e CTA sem bloquear navegação. Prosseguir condicionado. |
| QA | Testar período não expirado/expirado/reembolso/troca/concorrência e dono; ordem completa sem duplicata; telefone/mensagem; consentimento único e confirmação real; métricas deduplicadas/privadas; SSR OG correto e UI mobile. pnpm validate obrigatório. Prosseguir condicionado. |

Decisão: implementar os 12 pontos localmente, migration e rollback preparados, documentação/PR com testes proporcionais. Condições de preço em página de entrada do anunciante (não exibir cobrança ao comprador). Reutilização do período exige ação explícita e bike anterior inativa; preservar prazo e trilha financeira. Newsletter visitante permanece formulário simples. Fora de escopo: publicação/migration de produção sem autorização específica, pagamentos reais e alterações de anúncios existentes para homologação.

Trade-offs: reaproveitamento altera a associação operacional do pedido ao anúncio; conservar ID original da compra e histórico de transferências, nunca alterar payment ID/valor/provedor/prazo. Métricas serão aproximações por navegador/dia, não identificação de pessoas; não prometer contagem pessoal exata. OG externo pode continuar em cache de aplicativos mesmo após a correção. Rollback preserva dados financeiros e novas colunas; desativar reuso/novos eventos e voltar código sem apagar histórico.


## Revisão posterior

| Perspectiva | Status | Evidência / decisão |
|---|---|---|
| Produto | Pass | Entrada explica R$150/90 dias antes do rascunho; reativação/troca sem nova cobrança e sem mudar a data. Uma ativa por pagamento, sem alterar o preço ou criar assinatura. |
| Arquitetura | Pass | Fachadas sobre os writers/RPCs existentes; compra mantém order/payment IDs, valor, datas e origem imutável, com histórico privado de alocação. Locks por titular cobrem publicação, transferência e observações de pagamento. SSR e preparo de fotos de 15 MB preservados. |
| IA | N/A | Nenhuma inferência, agente, prompt ou serviço de IA. |
| Segurança | Pass | Dono/gates verificados no banco; helpers/tabelas sem acesso de anon/authenticated; contato confirmado ligado ao número verificado, mudança durante checkout impede autopublicação sem perder o pagamento. Testes de usuário diferente, direitos suspensos/expirados, deduplicação, concorrência e reembolso aprovados. |
| UX | Pass | Menu com três atalhos; Todos inclui desativados; reativação direta quando elegível; etapas com contato/mensagem, controles de ordem mobile/teclado e modal de confirmação. Capturas mobile inspecionadas. Aviso de rascunho não aparece depois de publicado. |
| CX | Pass | Pausa preserva fotos/dados e período; transferência explícita e auditada; checkout bloqueado quando há direito livre. Falha ao consultar direitos tem tentativa novamente, sem liberar cobrança indevida. Rollback executado no banco descartável sem perder histórico. |
| Growth | Pass | Popup espera reconhecer sessão e não abre para logados; formulário público continua SSR para visitantes e some após reconhecer a sessão. OG/Twitter usam a capa pública, compartilhamento nativo/WhatsApp/cópia e URL versionada pela capa. Eventos não bloqueiam navegação; respeitam opt-out/DNT/GPC. |
| QA | Pass | SQL real em PostgreSQL descartável; percurso de interface em Chrome com mocks locais e larguras 320/390/1024/1280/1440; 61 testes direcionados e pnpm validate (66 testes, typecheck, build), lint direcionado e diff check aprovados. |

### Mapa dos 12 pedidos

1. `NewsletterSignup` oculta captação quando a sessão é reconhecida; popup bloqueado também durante carregamento de auth.
2. Menu: Editar meu perfil / Anuncie sua bike / Meus anúncios, mantendo Sair.
3. Todos inclui desativados; apenas rascunho completamente vazio é omitido.
4. Reativação elegível publica diretamente. Outro anúncio pode reivindicar um direito livre de uma bike inativa; prazo, pagamento, compra original e auditoria mantidos. A consulta do pedido prioriza o aberto para que uma cobrança antiga encerrada não esconda um direito realocado.
5/10. `/anuncie-sua-bike` explica valor, duração, troca, contato, validação, fotos e negociação antes de criar rascunho. CTAs levam a ela. Após login, `novo=1` é preservado com validação restrita e consumido uma vez.
6. Etapa Informações mostra número e link para validar/trocar no perfil, permite personalizar texto até 600 caracteres e mostra prévia; o nome da bike fica entre asteriscos no WhatsApp e o link é sempre acrescentado. Continuar confirma no servidor o número validado, sem um novo checkbox.
7/11. Cabeçalhos sociais SSR usam a capa atual por URL pública revalidada, nunca assinada. Página publicada tem Compartilhar / WhatsApp / Copiar link, com fallback de cópia manual. Links de compartilhamento incluem a versão da capa, sem mudar o canonical.
8. Antes/Depois reordena a lista completa de fotos, com validação contra duplicata/omissão/foto de outro anúncio. Primeira posição é a capa. Mesmo contrato no Admin.
9. Transição de pagamento pendente para confirmado abre modal com Parabéns e Ver meu anúncio quando publicado; se houve pendência de revisão, informa pagamento recebido e permite concluir a publicação. Retorno do checkout não comprova pagamento.
12. Painel mostra exibições na vitrine, visitas e cliques no WhatsApp. Deduplicação por navegador/anúncio/evento/dia de São Paulo, totais privados ao vendedor/Admin, sem e-mail/telefone/IP no evento. Impressão exige 50% do card visível. Visita é medida no browser, não no crawler do preview. Próprio dono não conta quando autenticado.

### Testes e evidências

- `python3 tests/member-community-db.py --seller`: migration, reativação/troca, data preservada, origem/auditoria, bloqueio de cobrança nova tendo direito livre, ownership, grant/RLS, ordem de fotos, métrica privada/deduplicada, vencimento e suspensão. Duas publicações simultâneas aceitam somente uma; transferência e observação de pagamento simultâneas não dão deadlock. Mudança de telefone durante checkout mantém pagamento ativo e exige nova confirmação; reembolso retira a bike atualmente vinculada. Rollback preserva histórico e restaura RPCs anteriores.
- `tests/bike-classifieds-ui.mjs`: condições antes da criação, 1>2>3, contato/mensagem, cinco fotos e ordem em telas estreitas, checkbox único, modal de pagamento, reativação direta, troca do direito sem segundo checkout, Todos/Desativados, atalhos, newsletter oculta ao logado, capa em OG, compartilhamento, métricas, SSR e perfil. Backend/Storage/Asaas sintéticos; zero cobranças, mensagens ou dados reais alterados.
- 61 testes direcionados: contratos de mensagem/compartilhamento/retorno, login/retorno, servidor de classificados, Asaas, Admin e newsletter. `pnpm validate`: 66 testes/typecheck/build.
- Capturas locais (ignoradas no Git): `artifacts/seller-experience/seller-conditions-desktop.png`, `paid-success-modal.png`, `photo-order-mobile.png`, `reused-paid-period-mobile.png`, `dashboard-mobile.png`, `listing-desktop.png`.

### Limites e operação

- Contagem é aproximação por navegador/dia, não identificação ou total de pessoas únicas. Bloqueadores, opt-out e usuários sem JS não entram; antiabuso limita 20 mil eventos por anúncio/dia. Identificador aleatório fica no navegador; no banco é substituído por hash específico de anúncio/dia. Sem coleta no localhost/preview. Aviso de privacidade atualizado.
- Aplicativos terceiros podem manter previews em cache; o servidor fornece a capa correta e os novos links compartilhados são versionados. Não houve envio real de WhatsApp para homologar cache de terceiros.
- Interface nova testada em Chrome com viewport mobile, não em iPhone físico. A otimização Safari/15 MB é a implementação já publicada e permanece intacta.
- Antes do deploy, aplicar migration no Supabase integrado do mesmo Lovable. Ela cria colunas/RPCs/tabelas e copia os vínculos originais de pedidos e os contatos consentidos dos anúncios já publicados; não muda valores, pagamentos ou datas de exibição. Invalidar schema cache é parte da migration.
- O próprio contato publicado não muda silenciosamente ao trocar o telefone do perfil: requer editar/confirmar novamente. Direitos pagos continuam válidos.

Estado: implementação e validação locais concluídas. Sem risco material pendente identificado; produção/migration/merge ainda não autorizados neste escopo. Próximo passo: PR e autorização específica. Rollback preparado em `supabase/rollback/20261105230000_classifieds_seller_experience.sql`, acompanhado do revert do código; nunca apagar tabelas ou reconstruir pagamentos.


### Pré-flight de produção (somente leitura)

Conexão Lovable confirmou Supabase habilitado. Consulta agregada ao projeto ativo: 7 anúncios e 3 pedidos (2 ativos pagos, 1 cancelado sem pagamento); contratos de visibilidade, observação de pagamento e Admin presentes. Tabela de realocações ainda não existe: migration não foi aplicada. Zero anúncios publicados elegíveis ao backfill de contato naquele momento. A migration registra a associação original dos 3 pedidos existentes; a publicação de anúncios já pagos continua dispensando nova cobrança. Nenhuma escrita produtiva foi feita nesta etapa.
