# Favoritos e alerta nos cards do Radar — 06/11/2026

Estado inicial: preparação local; base operacional `3c9c07c89d9766b747a4c84446e9db20af55a715`, branch `codex/radar-favorites-price-alerts-2026-11-06`. Checkout raiz é referência; implementação no worktree do repositório conectado ao Lovable. Nenhuma publicação ou migration produtiva autorizada.

## Classificação e revisão pré-implementação

Mudança **estrutural**: Radar, autenticação e persistência privada no Supabase. Pedido: incentivar cadastro de alerta com sininho visível e permitir favoritar bikes após login.

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto e Estratégia | Salvar bikes para voltar e encontrar alerta no card | Confundir favorito com inscrição | Bike existente e conta atual | Prosseguir; favorito não cadastra alerta |
| CTO e Arquitetura | Um carregamento privado por catálogo, RPC isolada | N chamadas por card, resposta de sessão antiga, regressão SSR | Auth existente; tabela aditiva com FK Bike | Condicionado a consulta compartilhada, invalidação por usuário e SSR público preservado |
| IA e Agent Engineering | Nenhuma mudança em agentes | Novo teste disparar serviço pago ou dado privado virar grounding | Nenhuma integração de IA necessária | Prosseguir sem chamadas IA e sem alimentar agentes com favoritos |
| Segurança | Favoritos privados vinculados ao Auth UUID | Ler/escrever favorito alheio, sessão anônima, URL provocar escrita | RPC derivando auth.uid, grants restritos, RLS e validação | Condicionado a teste em PostgreSQL; intenção de login local temporária, nunca mutação por query string |
| UX/UI | Coração e sininho com rótulo, favorito ativo e filtro | Botões dentro de link; erro ser exibido como sucesso | Separar controles do link; feedback e alvos >=44px | Prosseguir com teclado, mobile, erro/retry e retorno do login |
| CX e Operação | Recuperar favoritos e remover preferências | Prometer entrega ou alterar operação de alertas | Reutilizar PriceAlertDialog e writer existentes | Prosseguir sem alterar jobs, newsletter, contatos ou entrega |
| Growth e CRO | CTA de alerta no catálogo sem visita obrigatória ao detalhe | Excesso de CTA e barreira de login no alerta | Hierarquia visual e analytics existentes | Prosseguir: sininho com texto; login exigido apenas ao favoritar |
| PMO e QA | Entrega local testável e rollout aditivo | Declarar código como publicado; migration sem backup | Testes de UI, persistência/isolamento e pnpm validate | GO condicionado aos testes locais; release separado |

## Conflitos, trade-offs e decisão consolidada

- Growth pede visibilidade; UX preserva leitura e detalhe: CTA “Alerta de preço” com sininho abaixo do preço/diagnóstico e coração junto, fora do link. O card mantém link de imagem, título e histórico. Nenhum clique afiliado é disparado em testes.
- Favoritar deve exigir login sem inscrever automaticamente em alerta. A intenção criada por clique explícito fica em sessionStorage por até 15 minutos e é retomada após login na mesma aba. URL externa ou query isolada não escreve favorito. Se storage estiver bloqueado, o usuário volta ao card e pode clicar de novo.
- Escopo: salvar/remover favoritos por conta, filtro “Meus favoritos” no catálogo, estado compartilhado por página, CTA de alerta com Bike ID/nome/preço do card e formulário existente. Sem novo sistema de Auth, writer ou entrega de notificações.
- Dependências: migration aditiva no mesmo Supabase, após backup restaurável/ensaio e autorização específica. Implementar/testar localmente primeiro. Frontend só pode ser disponibilizado junto da RPC aplicada.
- Aceite: anônimo vê controles e é encaminhado ao login para favoritar; login retoma intenção; favoritos persistem ao recarregar e são isolados por usuário; remover é idempotente; falhas não alteram visual para sucesso; logout/troca de conta não vaza estado; sininho abre alerta da bike certa; favoritos não enviam contatos; sem botões aninhados em links; mobile/teclado e SSR preservados; pnpm validate.
- Ajuste consolidado de UX/CTO/CX/QA após inspeção visual: limitar a altura de PriceAlertDialog ao viewport móvel e permitir rolagem interna; nenhum campo, consentimento ou writer é alterado. Aceite adicional: botão de cadastro alcançável em 390×844.
- Fora de escopo: mudar consentimento/entrega do alerta, adicionar favoritos ao Quiz/detalhe/conta, gamificação, analytics novo ou mudanças em catálogo/SEO/afiliados.
- Rollback: reverter frontend para a base identificada; revogar execução da nova RPC se necessário mediante autorização. Preservar tabela/dados; não fazer DROP nem reaplicar histórico de migrations. Schema não afeta os writers existentes.

## Contrato implementado

- `member_radar_favorites` guarda somente Auth UUID, Bike ID e data, com chave única usuário/bike e remoção em cascata quando a conta é excluída. Não copia contatos, preços ou ofertas.
- RPC homônima com `search_path=''`, execução apenas para `authenticated`, autor derivado de `auth.uid()`, rejeição de sessão anônima/deletada, feature gate da comunidade e validação de ação/ID/booleano. Tabela com RLS sem políticas e sem grants públicos, inclusive para membros; chamadas não recebem um usuário-alvo.
- `set(saved)` é idempotente; leitura retorna somente os Bike IDs da conta. O frontend valida a resposta, faz uma leitura compartilhada por montagem do catálogo e só mostra sucesso depois da confirmação da escrita. O teste em desenvolvimento observou remount de efeitos: a retomada do login preserva a intenção até a confirmação e usa escrita idempotente, evitando perda ou duplicação de favoritos.
- Troca de conta invalida imediatamente a visibilidade do estado anterior e ignora resposta atrasada daquele usuário. Sem consulta de favoritos nem sessão durante SSR. Não há conteúdo privado nos loaders/cache públicos.
- A intenção após clique exige mesma aba, expira em 15 minutos e não vem da URL. Storage indisponível mantém login funcional, mas requer clicar no coração novamente após voltar. Favoritos salvos continuam no banco entre visitas/dispositivos.
- Filtro exibe apenas favoritos ainda disponíveis no catálogo atual e combina com filtros/busca existentes. Uma Bike sem oferta atual não é reintroduzida no catálogo pelo favorito; a preferência persiste e reaparece se o modelo voltar.
- Sininho usa o `PriceAlertDialog` único, montado somente ao abrir, com Bike ID/nome/preço do card; fechar/trocar bike reinicia o formulário. Reusa `radar_alert_opened` com `source=catalog` e eventos de sucesso existentes. Nenhum evento de favoritos ou dado de contato foi acrescentado ao analytics.
- Formulário, aceite, writer `bike-price-alert`, newsletter e capacidade de entrega são herdados e operacionais; o delta não configura nem dispara serviços. A classe de altura/rolagem do diálogo foi ajustada para telas móveis.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Coração, persistência privada, retomada do login e filtro disponíveis; favorito não registra alerta. |
| CTO e Arquitetura | Pass | Reuso de Auth e writer; leitura compartilhada, SSR sem RPC/sessão, respostas antigas ignoradas; typecheck/build aprovados. |
| IA e Agent Engineering | N/A | Diff não altera agentes, prompts, geração ou grounding; nenhum serviço IA chamado. |
| Segurança | Pass | PostgreSQL isolado comprova grants/RLS, bloqueio anônimo/deletado/flag, isolamento de leitura/remoção, IDs inválidos e cascata na exclusão de conta. Sem secrets ou PII em código/evidências. |
| UX/UI | Pass | Cards desktop/celular inspecionados; sininho rotulado, coração com aria-pressed, alvos >=44px, zero botões dentro de links; teclado, erros/retry, estado vazio e diálogo rolável testados. |
| CX e Operação | Pass | Falha de gravação mantém favorito anterior; retry do carregamento e remoção disponíveis; jobs/contatos/entrega não alterados. |
| Growth e CRO | Pass | Cadastro de alerta acessível sem login; mock confirma bike e meta corretas; oferta/detalhe e analytics existentes preservados. Sem afirmação de aumento de conversão já medido. |
| PMO e QA | Pass | 11 testes direcionados, smoke de navegador, teste PostgreSQL e pnpm validate aprovados; release produtivo explicitamente separado. |

### Evidências e reprodução

- `pnpm exec vitest run --config vitest.config.ts src/lib/radar-favorites.test.ts src/components/radar/RadarBikeCard.test.tsx src/pages/Acompanhamento.ssr.test.tsx src/lib/quiz-price-alert.test.tsx`: **11/11**.
- `python3 tests/radar-favorites-db.py`: **Pass**, PostgreSQL descartável local, socket privado, sem conexão com banco existente. Cobre persistência/idempotência, isolamento, grants/RLS, validação, feature gate e exclusão de conta.
- Smoke `tests/radar-favorites-ui.mjs`: **Pass**, Chrome em desktop 1440×1100 e celular 390×844. APIs/Auth/alertas simulados e chamadas externas bloqueadas. Cobre alerta sem login, payload de Bike/meta/consentimento, retorno/login, persistência após reload, filtro, erro de escrita, troca de usuário com resposta pendente, remoção, estado vazio, erro de leitura/retry, logout, teclado e rolagem do formulário.
- Para reproduzir o smoke: iniciar `pnpm dev --host 127.0.0.1 --port 4326`, com `VITE_MEMBER_ACCOUNTS_ENABLED=true`, Supabase server/client em `http://127.0.0.1:54321` e chaves falsas locais; executar `node tests/radar-favorites-ui.mjs`. `PLAYWRIGHT_MODULE` pode apontar para Playwright já instalado. Harness não integra o bundle/rotas produtivas.
- Lint dos novos módulos, card e testes: **Pass**. `Acompanhamento.tsx` e `PriceAlertDialog.tsx`: regras funcionais aprovadas com `prettier/prettier` desativada para preservar formatação herdada e evitar reformatar arquivos inteiros.
- `pnpm validate`: **Pass**, typecheck, **66/66** testes do gate e build cliente/SSR/Nitro. Avisos herdados de inputValidator/dependências/chunks não são novos bloqueios.
- `git diff --check`: **Pass**.
- Capturas locais com catálogo/preços simulados: [desktop](../artifacts/radar-favorites/cards-desktop.png), [card móvel](../artifacts/radar-favorites/card-mobile.png), [alerta móvel](../artifacts/radar-favorites/alert-mobile.png). Não são evidência do domínio publicado.

### Fechamento e condição de release

Decisão: **GO para entrega local; GO condicionado para produção**. Nenhum Fail local ou risco material sem mitigação identificado. Sem custo externo, créditos Lovable ou envios reais.

A única dependência nova de produção é a migration `20261106230000_radar_favorites.sql` no Supabase integrado ao mesmo Lovable. Antes de aplicá-la: verificar backup restaurável e ensaio, obter autorização específica e aplicar somente esse SQL aditivo. Publicar frontend após confirmar a RPC; merge/publicação exigem autorização desta thread. Não reaplicar o histórico de migrations.

Rollback: voltar ao frontend base `3c9c07c89d9766b747a4c84446e9db20af55a715` (ou ao predecessor efetivo identificado no release), preservando tabela e favoritos; revogar execução da RPC apenas se necessário e autorizado. Não apagar dados para desfazer a UI. O rollback de frontend é imediato; o schema aditivo pode permanecer sem afetar catálogo/alertas existentes.
