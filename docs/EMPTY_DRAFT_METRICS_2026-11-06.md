# Contador de anúncios e rascunhos vazios

## Contexto e decisão prévia
Mudança estrutural localizada (RPC Supabase). O painel soma um registro institucional vazio criado em 06/11 às 10h32, enquanto `ListingDashboard` o oculta por `isEmptyBikeDraft`. A resposta anterior identificou o registro, mas omitiu a regra que o escondia da interface.

| Perspectiva | Impacto / risco / dependência | Recomendação |
|---|---|---|
| Produto | Um clique em criar não deve aparentar um anúncio preenchido. | Excluir placeholders totalmente vazios da apuração, mantendo rascunhos com conteúdo. |
| CTO | Predicado SQL precisa refletir o helper do dashboard; datas/marco permanecem. | Função privada e correção apenas dos totais de criação na RPC usada por atual, anterior e diário. |
| IA | Nenhum fluxo de IA afetado; campos são dados. | Preservar IA e automações existentes. |
| Segurança | Nenhuma exclusão, grant, RLS ou transação financeira nova. | Manter helper e agregação sem acesso direto de anon/authenticated/service_role. |
| UX/UI | Lista vazia precisa corresponder a zero criação sem conteúdo. | Explicar que o total inclui rascunhos com conteúdo e desativados; manter lista/editor. |
| CX | Registro reservado é reutilizado quando o Admin começa a cadastrar uma bike. | Não apagar o rascunho; preservar edição, histórico e pagamentos. |
| Growth | A criação só passa a contar quando houver conteúdo/foto; possível saída do total se todo conteúdo for apagado. | Usar a mesma regra operacional da lista, sem inventar evento de criação definitiva. |
| PMO/QA | Correção pequena de writer de relatório, sem ampliar escopo. | Backup da função, teste descartável de paridade/rollback, lint e validate; publicar após aprovação. |

Conflito: contar qualquer INSERT é tecnicamente possível, mas não representa a experiência do Admin. Decisão: o KPI conta registros com conteúdo, inclusive rascunhos e desativados; não apenas publicados. A condição desconsidera o status como o próprio Dashboard faz. Alterar usuários, anúncios, pagamentos, apuração de receita, períodos, integração Asaas ou lista administrativa fica fora do escopo.

Critérios: o placeholder atual resulta em zero; título real ou qualquer campo não padrão ou foto reservada/pronta conta; mídias removidas não contam. Atual/anterior/diário usam a mesma agregação; provas de identidade, valores, marco e exclusões de teste permanecem. Rollback restaura a definição anterior da agregação, sem restaurar ou apagar dados porque nenhum registro é alterado.

## Revisão posterior
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Placeholder não conta; rascunho com conteúdo conta, preservando a regra da gestão. |
| CTO | Pass | Helper SQL privado e agregação compartilhada; intervalo e contrato JSON preservados. |
| IA | Pass | Nenhum prompt, agente ou automação alterado. |
| Segurança | Pass | Sem escrita em anúncios/pagamentos, sem grants novos; helper inacessível diretamente aos papéis da API. |
| UX/UI | Pass | Zero no KPI e lista vazia para o mesmo registro reservado, em desktop e 390 px. Nota distingue rascunhos com conteúdo. |
| CX | Pass | Rascunho reutilizável preservado; nenhum registro financeiro ou fila de avisos alterado no ensaio. |
| Growth | Pass | Contagem passa a refletir o inventário com conteúdo; sem mudança em receita, publicação ou prazos. |
| PMO/QA | Pass | Backup/rollback restauram a função original exatamente; SQL, interface, lint e validate aprovados. |

## Testes e evidências
- `python3 tests/member-community-db.py --empty-drafts`: permissões, placeholder, 13 variações de conteúdo, espaços, status, foto reservada/pronta/removida, atualização de atual/anterior/diário, rascunhos retidos, invariância financeira e rollback com restauração exata da definição anterior.
- `tests/empty-drafts-ui.mjs`: Admin sintético recebe uma reserva vazia e mostra zero criação/lista vazia, em desktop/mobile; nenhuma mutação ou rede externa permitida.
- Lint de `CommunityMetrics.tsx` sem avisos; `pnpm validate`: 66 testes, typecheck e build aprovados.
- Imagens em `artifacts/empty-drafts/`; não são resultados de produção.

## Estado e release
Correção preparada localmente. Não aplicada em produção. Publicação exige autorização específica para a migration e merge/publicação desta correção, conforme `docs/EXECUTION_GUARDRAILS.md`. Parecer: GO condicionado somente à autorização de release. Nenhum rascunho será apagado ou promovido a anúncio.
