# Uma jornada de anunciante — 04/11/2026

Classificação: relevante, correção de UX. O responsável rejeitou a experiência de “gestão do canal”: quer usar sua conta pela mesma jornada de uma pessoa comum. A identificação da origem das bikes e a isenção comercial não devem transformar o painel do usuário em uma área administrativa.

## Revisão prévia e decisão

| Perspectiva | Impacto/risco/dependência | Recomendação |
| --- | --- | --- |
| Produto | Ramo administrativo criou uma experiência diferente da que precisa ser homologada | Uma única jornada Perfil → Anuncie sua bike → Meus anúncios → Fotos/Informações/Publicação |
| CTO | Mudança localizada em componentes; servidor/contratos/propriedade preservados | Não migrar nem alterar entitlement/Auth |
| IA | Sem agente/modelo/transporte novo | N/A |
| Segurança | Preservar identidade e autorização reais, sessão e classificação das bikes no servidor | Não criar bypass de prova ou simular pagamento |
| UX | Entrar no fluxo normal com ação clara; filtros vazios atrapalham primeiro uso | Estado vazio com CTA real; busca/filtros apenas com anúncios; mesmas ações e títulos em todas as contas |
| CX | Conta existente precisa ser usada diretamente sem alternar para modo admin | Remover termos de canal/piloto dos controles do proprietário; manter dados e sessão |
| Growth | Newsletter e divulgação suspensa continuam intactas | Sem novos atalhos públicos ou mudanças de preço |
| PMO/QA | Testar jornada normal com a conta designada como canal no mock, sem trocar seu tipo | Smoke direcionado + validate; rollback por revert de frontend |

Escopo: textos/primeiro uso/navegação e UI única. A origem da bike continua na prévia/vitrine e a isenção aparece somente no resumo da publicação. Integração Asaas não é simulada: cobrança geral continua fora deste delta enquanto o modelo comercial não for definido. Nenhuma alteração de banco, sessão, senha, dados de anúncio ou configuração de acesso.

Conflito: usar a mesma jornada não significa cobrar de verdade a conta da Vitale, apagar a origem das bikes ou liberar todos os usuários antes do lançamento. A correção remove a ramificação administrativa da apresentação e mantém as regras reais existentes no servidor.

Critérios: nenhum “gestão do canal”, “Bikes do canal” ou “Nova bike do canal” como controle de conta; CTA normal no perfil/menu e estado vazio; criação/rascunho/fotos/prévia/status reais continuam operacionais; isenção só na revisão da publicação; menus públicos ocultos. Rollback: revert do frontend, sem SQL/migration ou restauração de dados.


## Revisão posterior local

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Uma única jornada, sem controles exclusivos de gestão do canal |
| CTO | Pass | Quatro componentes e smoke alterados; nenhum contrato/SQL/Auth/serviço alterado |
| IA | N/A | Nenhum fluxo de IA afetado |
| Segurança | Pass | Isenção vem de feeStatus do servidor só na revisão; gate de identidade/publicação/propriedade preservado |
| UX | Pass | Estado vazio com CTA real, sem zeros/filtros; mesmos títulos/ações no perfil/menu/painel/editor |
| CX | Pass | Conta de canal no mock percorreu jornada de anunciante, sem ramificação administrativa |
| Growth | Pass | Newsletter e flag de divulgação sem mudanças; público continua sem Entrar/Venda |
| PMO/QA | Pass | Smoke completo de classificados/perfil, lint, typecheck e pnpm validate (66 testes + SSR/build) |

A cobrança Asaas não foi simulada ou ativada. A classificação de bike do canal permanece na prévia/vitrine como atributo do anúncio, enquanto todos os controles do proprietário são os mesmos. Fluxo com preço/isenção somente na etapa Publicação. Nenhuma alteração de sessão ou banco.

Estado local: GO para publicar a correção já solicitada; conferência autenticada no Chrome real após deploy. O browser nativo permitiu acessar a aba real existente; nenhuma senha ou token foi lido/copied e nenhum outro serviço aberto nas abas foi alterado.
