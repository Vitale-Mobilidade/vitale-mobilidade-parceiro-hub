# Abertura de perfis e Venda sua bike — 05/11/2026

Pedido atual do responsável: liberar criação de perfil e colocar a seção de venda. Substitui a espera de divulgação de 04/11. Classificação estrutural: descoberta pública e elegibilidade de anunciantes no Supabase. Autorização cobre publicação deste fluxo e ativação do gate público no projeto integrado.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência e recomendação |
|---|---|
| Produto | Abrir cadastro e anúncio para membros, mantendo R$150 único/90 dias. Não basta mostrar links com gate de piloto fechado. Prosseguir. |
| Arquitetura | Flag de navegação existente e helper de elegibilidade compartilhado por RPC/Storage. Adicionar flag pública reversível ao helper, sem duplicar serviços. Preservar SSR e contrato de pagamento. Prosseguir condicionado a teste PostgreSQL. |
| IA | N/A: nenhum agente ou conteúdo gerado é alterado. |
| Segurança | Ampliar somente elegibilidade de anúncios para contas reais, aderentes e não suspensas. Identidade, ownership, quotas, RLS, preço e comprovação financeira continuam obrigatórios. Não conceder admin nem alterar identificação do canal. Prosseguir condicionado aos testes negativos. |
| UX/UI | Entrar após Quiz; avatar logado; Venda no menu desktop/mobile e Home com três cards reais e Ver todas. Estados vazios honestos; cadastro volta ao destino. Prosseguir. |
| CX | Retirar mensagens de conta de teste. Newsletter simples independente; preservar contas, fotos, rascunhos e pagamentos. Prosseguir. |
| Growth | Navegação pública melhora descoberta; não inventar anúncios, repetir preço do espaço para compradores ou alterar Radar/Quiz/afiliados. Manter indexação atual nesta entrega. Prosseguir. |
| QA | Testar usuário comum, visitante, suspensão/anonimato, não pagamento e acesso a anúncio alheio. UI local, PostgreSQL descartável e validate antes de publicar. Prosseguir condicionado. |

Decisão: ativar navegação pública e gate de criação para membros reais, com adesão à comunidade e sem suspensão; incluir seção SSR existente na Home. Manter validação de e-mail/WhatsApp para publicar e pagar, checkout hospedado Pix/cartão, R$150/90 dias, 10 minutos e confirmação financeira. Não alterar newsletter, anúncios existentes, integrações, dados de pagamento ou privilégios. Sem novas mensagens ou cobranças de homologação. Estado vazio pode aparecer caso não existam anúncios pagos/publicados válidos.

Trade-off: manter nome histórico do helper `member_classifieds_pilot` evita reescrever todos os consumidores/políticas; sua semântica fica documentada como gate de elegibilidade e sua abertura é controlada por `public_enabled`, sem exceção para conta de teste. Não usar ocultação de links como segurança. Indexação continua como configurada, sem novo sitemap/SEO nesta tarefa.

Rollback: reverter navegação e definir `public_enabled=false`; preservar schema, contas, anúncios, pagamentos e direitos de exibição. Custo externo: hosting/serviços existentes, uso normal futuro por novos usuários; nenhum disparo ou pagamento de teste. Deploy necessário no Lovable integrado, sem uso de agente de IA para editar código.

## Revisão posterior

| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Cadastro público e navegação ativos no código; canal no Admin sem perfil/checkout e sem exceção de conta teste. |
| Arquitetura | Pass | Editor/fotos/card reutilizados; RPCs e endpoint administrativos privados; origem por anúncio e SSR da vitrine preservados. |
| IA | N/A | Nenhuma geração ou agente alterado. |
| Segurança | Pass | PostgreSQL descartável: admin sem perfil publica canal, usuário comum/admin inativo negados, RLS/ownership/privacidade, contato, imagem e pagamento de membro mantidos. Endpoint vincula ator ao JWT; payload não escolhe origem/privilégio/caminho arbitrário. |
| UX/UI | Pass | Playwright desktop/mobile: cadastro/retorno, menu público, Home com três e estado vazio, editor 1>2>3 de membro e de Admin, fotos, consentimento, publicação/desativação institucional, sem OTP/checkout do cliente no Admin. Inspeção visual do painel. |
| CX | Pass | Nenhuma conta técnica criada; WhatsApp institucional informado no anúncio; ações e métricas na navegação Admin. Rascunho pessoal existente preservado. |
| Growth | Pass | Newsletter simples independente e SSR preservados. Nenhum anúncio ou faturamento inventado; SEO/Radar/Quiz/afiliados sem alteração. |
| QA | Pass | 28 testes direcionados de endpoint/cobrança, suíte PostgreSQL sintética com migrations vigentes e lançamento, três jornadas UI locais, lint do escopo e pnpm validate (66 testes, tipos, SSR/build). |

As provas de pagamento/publicação em testes são sintéticas e isoladas, sem compra real, envio de e-mail/WhatsApp, nova conta ou anúncio na produção. Métricas deduplicam por compra, respeitam a virada de dia em São Paulo, separam sinalização de estorno/contestação e não chamam estoque institucional de faturamento. UI de membro segue cobrança padrão.

Escopo de publicação: flag/entradas públicas existentes, dois componentes de apresentação/erros, extensão do editor e dashboard compartilhados, novo módulo/rota/API administrativa, duas migrations aditivas de elegibilidade/origem/projeção/RPCs e guards. Nenhum anúncio existente é transformado em canal. Admin informa a bike e o contato institucional manualmente.

Risco residual: contagem de faturamento é bruta por primeira confirmação registrada, não saldo líquido bancário; a tela informa isso. Se for necessário interromper a abertura, reverter navegação/rotas e, em emergência, desligar public_enabled: o helper compartilhado também oculta anúncios de membros até restauração; dados e direitos pagos continuam no ledger, sem reset do prazo. Não aplicar DROP nem reescrever histórico financeiro. Novo Admin pode ser revertido no código mantendo schema aditivo e anúncios existentes.

Custo de release: hosting e banco integrados já existentes; sem agente de IA Lovable, nova cobrança ou envio. Uso futuro do cadastro gera os códigos de validação e consumo normal contratado. Publicação e ativação do gate autorizadas pelos pedidos atuais de liberação e Admin.


## Ampliação autorizada: Admin do canal e acompanhamento

O responsável esclareceu que não existe conta de teste e pediu cadastro de bikes do canal pelo Admin, sem perfil da comunidade, além de usuários, anúncios e faturamento diário. A abertura deixa de ter exceção de conta convidada.

| Perspectiva | Revisão complementar |
|---|---|
| Produto | Canal é inventário institucional criado pelo Admin, com identificação própria; nenhum pagamento interno fictício. Cliente comum continua R$150/90 dias. Prosseguir. |
| Arquitetura | Reutilizar editor, fotos e cards; origem institucional por anúncio, independente de perfil pessoal. RPC privada com ator administrativo verificado; leitura pública explícita para canal. Prosseguir condicionado aos testes de isolamento. |
| IA | N/A, sem agentes/geração. |
| Segurança | Somente role admin ativa pode gerir canal e consultar métricas. Membro não escolhe origem/canal ou isenção. Upload limitado a reserva da bike, somente WebP reencodado e tamanho limitado, sem políticas amplas. Prosseguir condicionado. |
| UX | Admin → Comunidade e anúncios, números/dias e botão Nova bike do canal, editor 1>2>3 sem cadastro, OTP ou checkout do cliente. WhatsApp institucional preenchido no anúncio pelo administrador. Prosseguir. |
| CX | Administrador informa contato institucional para o CTA, pode editar/desativar/vender; nenhuma conta técnica ou perfil é criado. Preservar anúncio pessoal já existente. Prosseguir. |
| Growth | Canal aparece na mesma vitrine com selo, sem simular vendas ou perfis. Métricas distinguem membros da newsletter simples. Prosseguir. |
| QA | Provar admin sem perfil, negar usuário comum/admin inativo, canal sem débito, cliente exige pagamento e OTP. Faturamento bruto por primeiro registro confirmado em São Paulo, uma compra contada uma vez; estorno/contestação indicados separadamente, sem inferir saldo líquido. Prosseguir condicionado. |

Decisão complementar: origem `channel` só gravável pelo servidor administrativo, contato institucional por anúncio, período de 90 dias sem faturamento fictício. Métricas agregadas, sem nomes/e-mails de membros: perfis que aderiram à comunidade, anúncios por origem/status, faturamento bruto confirmado por dia no horário de São Paulo, número de pagamentos com estorno/contestação. Não é demonstrativo contábil de saldo líquido ou taxas Asaas. Sem criar contas técnicas, alterar credenciais ou publicar bikes automaticamente. Rollback também desativa rotas Admin novas e preserva ledger e anúncios; gate público não restaura conta de teste.
