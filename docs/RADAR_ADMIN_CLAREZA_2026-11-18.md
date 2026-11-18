# Radar admin — indicadores e período de cadastro

Classificação: estrutural (Radar e contrato de consulta Supabase), com alteração restrita à leitura e apresentação administrativa.
Pedido: simplificar KPIs, retirar “resultado incerto” do destaque e mostrar/filtrar data de cadastro. Autorização de implantação e pequeno custo já concedida nesta conversa para o pacote de alertas e seus ajustes.

## Revisão prévia pelas oito perspectivas

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Quatro indicadores de pessoas, alertas, espera e envio | Confundir alerta com pessoa ou envio com entrega | Contadores existentes | Prosseguir distinguindo as unidades e entrega confirmada como detalhe |
| CTO e Arquitetura | Filtros opcionais sobre created_at antes da paginação | Cortar dia final ou mudar fuso | Contrato POST validado, timestamps no PostgreSQL | Prosseguir com dias civis America/Sao_Paulo e fim exclusivo do dia seguinte |
| IA e Agent Engineering | Nenhuma mudança em agentes | Desencadear conversa por ação administrativa | Manter leitura somente | Prosseguir sem alterar prompts nem envios |
| Segurança | Consulta privada por intervalo | Injeção, acesso indevido ou PII em logs | Auth admin antes da leitura; datas ISO estritas | Prosseguir preservando no-store, autorização e erros sanitizados |
| UX/UI | Uma linha de cards, cadastro visível e intervalo rotulado | Mobile apertado ou filtro ambíguo | Formulário responsivo; labels e erro de intervalo | Prosseguir com campos De/Até e indicação de São Paulo |
| CX e Operação | Diagnósticos recolhidos em linguagem clara | Ocultar pendências reais e permitir reenvio duplicado | Preservar estados e detalhe operacional | Prosseguir sem alterar ou reenviar registros históricos |
| Growth e CRO | Operação encontra cadastros de uma campanha/data | Alterar jornada de compra sem necessidade | Links e mensagens atuais preservados | Prosseguir no admin apenas |
| PMO e QA | Release pequeno e reversível | Regredir busca/paginação/permissões | Testes dirigidos, lint, pnpm validate e inspeção visual | Prosseguir após gates |

## Conflito e decisão consolidada

Simplificar o painel não autoriza apagar evidência de envio sem confirmação. Remover o KPI “incerto” e mover o diagnóstico para detalhes recolhidos, chamado “Precisam de conferência”. Não converter esses registros em sucesso/falha nem reenviá-los.

Escopo: quatro cards globais; entrega confirmada como informação do card de envio; últimas inscrições no gráfico; datas na lista; intervalo opcional inclusivo para o cadastro de cada alerta. Os filtros alteram a lista e o total da lista; os cards continuam globais. Não há uma tabela separada de pessoas: data exibida é a do cadastro do alerta daquela pessoa/bike.
Dependências: campos e métricas existentes; nenhuma migration, RLS, secret, template ou ação de envio.
Aceite: cadastro visível sem expandir; busca/estado/data combináveis; início/fim opcionais e mesmo dia; rejeitar datas impossíveis/invertidas; fim cobre todo dia em São Paulo; paginação mantém filtros; limpar reinicia filtros; quatro cards sem “incerto”; diagnóstico auditável recolhido.
Rollback: reverter o commit de código e republicar a versão anterior. Sem alteração de dados.
Custo externo: desenvolvimento e testes locais; publicação determinística Lovable, sem geração por créditos.

## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto e Estratégia | Pass | Quatro cards com unidades explícitas; entrega confirmada subordinada a envio |
| CTO e Arquitetura | Pass | Filtro opcional antes de range/count, PostgreSQL interpreta dias com timezone IANA; sem schema novo |
| IA e Agent Engineering | N/A | Nenhum agente, prompt ou automação alterado |
| Segurança | Pass | Mesmos testes de auth/role/no-store; filtros inválidos rejeitados antes de contatos; nenhuma escrita |
| UX/UI | Pass | Prévia local renderizada com CSS real: uma linha de quatro cards, campos De/Até rotulados e cadastro visível sem expansão |
| CX e Operação | Pass | Pendências recolhidas; estados históricos preservados; nenhuma ação de reenvio |
| Growth e CRO | N/A | Nenhuma alteração pública, SEO, oferta, afiliação ou mensagem |
| PMO e QA | Pass | 38 testes dirigidos, lint dos sete arquivos, pnpm validate (69 regressões + TypeScript + build) aprovados |

A sintaxe de timezone é suportada pelo PostgreSQL: [Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-INPUT-TIMESTAMPS).
Risco residual: o serviço externo pode continuar com envios sem confirmação; a tela preserva esse fato no detalhe operacional. Os totais principais são globais e não uma soma de etapas de um funil.
Release: apto à publicação autorizada nesta conversa; rollback por reversão do commit. Smoke de produção será registrado após publicação.
