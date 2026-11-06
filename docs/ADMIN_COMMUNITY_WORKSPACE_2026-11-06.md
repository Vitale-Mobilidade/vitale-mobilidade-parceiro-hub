# Gestão da comunidade: tabela, períodos e remoção

## Classificação e revisão prévia
Estrutural: contratos privados, Supabase, Auth e indicadores administrativos. Escopo solicitado: remover três contas de homologação, ordenar usuários em tabela e comparar períodos de operação.

| Perspectiva | Impacto, risco e dependência | Recomendação |
|---|---|---|
| Produto | Gestão real de usuários; evitar confundir estoque atual com desempenho no período. | Prosseguir: quatro KPIs de fluxo (cadastros, criação, primeira publicação de cada bike, faturamento); ativos agora como informação separada. |
| CTO | Ordenação e paginação no banco; datas calculadas no servidor em São Paulo. Auth via API administrativa oficial, nunca UPDATE direto em auth.users. | Prosseguir com RPCs privadas, intervalos limitados e desempate determinístico. |
| IA | Nenhum prompt ou agente alterado; conteúdo de nomes e buscas é dado, sem execução. | Preservar os fluxos de IA existentes. |
| Segurança | Remoção impede login e publicação, preserva referências financeiras; risco de apagar Admin e de falha parcial entre Auth/Storage/banco. | Bloquear remoção de qualquer membro editorial e do próprio operador; preparação suspende, API remove, finalização anonimiza. Retentativa idempotente; confirmação com e-mail exato. |
| UX/UI | Tabela sem perder contatos e detalhes; ordenação acessível, datas e comparação explícitas. | Cabeçalhos com aria-sort, scroll restrito à tabela; campos de data e erros visíveis; estados vazios e de remoção. |
| CX | Contas de teste Lucas, Anastasia e Guilherme Palmerio têm sete anúncios e duas compras. | Excluir acesso/perfil e imagens; arquivar anúncios, preservar compras, vencimentos, exclusões da apuração e assinaturas independentes da newsletter. |
| Growth | Comparação relativa precisa, sem percentuais infinitos ou base fabricada. | Semana inicia segunda; mês compara mesma parte do mês anterior; datas antes do marco não geram comparação. |
| PMO/QA | Migration, backup/restauração, Auth mockado e publicação dependente de aprovação específica. | SQL descartável, testes HTTP, desktop/mobile e pnpm validate; nenhuma mensagem, compra ou cortesia real de teste. |

## Decisão e conflitos
Comparar o estoque de anúncios ativos exigiria um histórico de estados que não existe. Não reconstruir números fictícios: medir primeiras publicações por bike no período e exibir ativos atuais separadamente. Registrar primeira publicação imutável; a carga inicial usa a primeira evidência disponível, sem inventar transições anteriores. O marco de 06/11 permanece válido.

A remoção é lógica irreversível no Auth (API deleteUser com shouldSoftDelete=true), acompanhada da anonimização do perfil e retirada dos anúncios. O UUID residual mantém integridade de compras/auditoria; não é apenas ocultação de cartões. Uma falha mantém a conta suspensa e permite concluir a remoção. Não faz estorno, não remove Google Cloud nem altera destinatários de notificações ou newsletter independente.

## Critérios de aceite
- Busca por nome/e-mail/telefone preservada; tabela ordena todas as páginas por nome, anúncios e cadastro, ascendente/descendente.
- Hoje/ontem/semana/mês/7/30/90/personalizado; limites e intervalo comparado visíveis. Personalizado até 366 dias, sem datas futuras.
- KPIs de fluxo respeitam intervalo e marco; porcentagem somente com base anterior coberta e não nula. Comparação parcial/indisponível indicada.
- Exclusão exige Admin ativo, confirmação exata e alvo sem vínculo editorial. Falhas parciais recuperáveis; usuário não volta a publicar com sessão antiga. Compras não são apagadas ou modificadas.
- Publicação e remoções produtivas somente após revisão final, backup e aprovação específica do escopo.

## Rollback planejado
Reverter interface/contratos e restaurar definições privadas anteriores. Manter datas de primeira publicação e tombstones privados. Remoção do Auth não tem restauração de credenciais: novo cadastro cria nova identidade; não prometer rollback de exclusão. Indicadores anteriores e valores financeiros preservados.

## Estado
Preparação local em andamento; nenhuma dessas três contas foi removida.

## Implementação e operação
- `admin_member_period_metrics` é privado e mantém `admin_member_metrics` compatível com a Visão geral. Comparação usa intervalos de calendário em São Paulo; o mês anterior é limitado ao último dia existente. Personalizado aceita até 366 dias inclusivos.
- Ordenação por nome normaliza acentos portugueses; contagem de anúncios e datas são ordenadas antes de paginar, com UUID como desempate. E-mail, telefone e validação ficam na coluna Contato; quantidade ativa acompanha o total de anúncios.
- `first_published_at` registra a primeira publicação e não muda em reativação. A carga inicial usa a evidência mais antiga disponível de publicação/início de exibição. Não representa um histórico de estoque de anúncios ativos.
- `remove_member` verifica token e papel editorial no servidor. Preparação privada suspende o perfil e arquiva anúncios; Storage remove somente caminhos reservados sob o UUID do usuário; Auth usa `deleteUser(id,true)`; finalização anonimiza perfil/anúncios e elimina dados de validação. Não expõe preparação ou finalização ao navegador.
- Autoexclusão e qualquer alvo com vínculo editorial ou bike institucional são protegidos. Checkout ainda vigente bloqueia a remoção, sem cancelar cobranças. Falhas após preparação deixam indicação de remoção pendente para retentativa. Chamadas repetidas preservam o tombstone.
- A opção de remoção fica no detalhe do usuário, exige digitar seu e-mail e apresenta o caráter irreversível. A API oficial do Auth preserva o UUID por soft deletion; ela não permite recuperar credenciais ([documentação Supabase](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)).
- As três remoções solicitadas são somente da comunidade: Lucas Vitale, Anastasia e Guilherme Palmerio (endereços exatos conferidos privadamente no banco). Não incluem o Admin editorial, contas Google Cloud, destinatários dos avisos, newsletter independente ou estornos de compras.

## Governança — revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Tabela ordenável e KPIs de fluxo; estoque atual identificado separadamente; marco preservado. |
| CTO | Pass | Paginação/ordenação e datas no banco; APIs compatíveis; índices de data; testes de calendário e restauração. |
| IA | Pass | Fluxos e prompts preservados; nenhum agente ou crédito de IA utilizado. |
| Segurança | Pass | Admin real, RLS e grants restritos, alvos protegidos, caminhos limitados ao proprietário; Auth oficial mockado, retentativas e anonimização testadas. |
| UX/UI | Pass | Desktop e 390 px, cabeçalhos acessíveis, nome fixo na rolagem, estados de erro, datas, comparação e confirmação explícita. |
| CX | Pass | Detalhes/contatos/cortesias e bikes do canal preservados; falha parcial recuperável; histórico financeiro e fila de avisos intactos no teste SQL. |
| Growth | Pass | Períodos relativos e comparação sem infinito; base anterior indisponível antes do marco. |
| PMO/QA | Pass | SQL descartável e backup restaurado, rollback, testes HTTP, quatro jornadas locais e gate validate. Release sujeito à aprovação abaixo. |

## Validação
- `python3 tests/member-community-db.py --workspace`: banco isolado sem TCP, migrações anteriores e nova; permissões, dias em São Paulo, mês curto, personalizado, ordenação com 25 usuários, contagem por período, exclusão de compra de teste, publicação imutável, preparação/retentativa/finalização da remoção, proteção de Admin/checkout e integridade financeira.
- Restauração completa do backup sintético anterior à migration; rollback mantém pagamentos, cortesias, histórico e contas suspensas. Hash de cada campo financeiro e quantidade de avisos iguais antes/depois da migration.
- 13 testes HTTP direcionados: identidade real, contratos estritos, permissão, período, preparação/Storage/Auth/finalização, injeção de caminhos e falhas parciais.
- Jornadas locais: `admin-community-workspace-ui.mjs`, `admin-members-partners-ui.mjs`, `community-reporting-ui.mjs` e `admin-community-ui.mjs`. Rede externa bloqueada; contatos e dados sintéticos.
- Lint dos sete arquivos TypeScript alterados; `pnpm validate`: 66 testes, typecheck e build. Nenhum e-mail, WhatsApp, compra ou cortesia real de teste.
- Evidências em `artifacts/admin-workspace/`; nenhum teste em dispositivo físico.

## Release e limitações
Implementação local pronta; migration, integração e publicação ainda dependem de aprovação específica. As três contas ainda não foram removidas em produção.

Comparações anteriores ao marco ficam indisponíveis. A primeira publicação histórica é a primeira evidência disponível, sem reconstrução fictícia das republicações. Remoção Auth é irreversível, embora os indicadores e o código possam ser revertidos. Após remover, os sete anúncios permanecem arquivados/anônimos para integridade dos vínculos; as compras e seus vencimentos não mudam. URLs de upload previamente assinadas podem durar até a expiração do token, mas os objetos não terão publicação nem acesso por perfil removido.
