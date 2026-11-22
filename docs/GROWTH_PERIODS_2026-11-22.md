# Growth — 14 dias e última semana

## Revisão pré-implementação

Classificação: pequena. Mudança localizada no filtro administrativo, reversível,
sem alterar API, Supabase, métricas, integrações ou páginas públicas.
Base: `origin/main` em `9294a41`, do repositório ativo sincronizado com Lovable.

| Perspectiva | Impacto, risco, dependência e recomendação |
| --- | --- |
| Produto e Estratégia | Dois atalhos pedidos pelo usuário; preservar 7 dias como padrão. Prosseguir. |
| CTO e Arquitetura | Usar datas explícitas no contrato existente para os novos períodos; 14 não é aceito como rangeDays pelo servidor atual. Não alterar backend. Prosseguir com essa condição. |
| IA e Agent Engineering | N/A: sem IA, prompts ou agentes. |
| Segurança | N/A: sem mudança em permissões, dados, segredos ou validação externa. |
| UX/UI | Acrescentar 14 dias após 7 dias e Última semana como segunda a domingo anteriores, distinguindo do período móvel. Preservar select nativo e rótulo. Prosseguir. |
| CX e Operação | Semana anterior deve excluir a semana corrente inclusive no domingo. Dependência: calendário de São Paulo já existente. Prosseguir com validação de limites. |
| Growth e CRO | Facilitar consulta quinzenal e semanal mantendo todas as métricas existentes. Risco de confundir semana completa com 7 dias; registrar a semântica. Prosseguir. |
| PMO e QA | Testar payload, limites de semana/mês/ano e opções renderizadas; rodar pnpm validate. Prosseguir condicionado aos checks. |

### Decisão consolidada e trade-offs

- Escopo: adicionar 14 dias corridos incluindo hoje e Última semana (segunda a domingo anteriores) ao filtro Growth.
- Dependências: cálculo a partir do dia de São Paulo, consulta existente por startDate/endDate e chave de cache contendo o intervalo para datas explícitas.
- Aceite: no dia 22/11/2026, 14 dias = 09–22/11 e última semana = 09–15/11; preservar 7 dias padrão, demais opções e validação personalizada.
- Trade-off: enviar 14 dias como datas explícitas evita alteração desnecessária no contrato rangeDays do servidor e dispensa deploy de Edge Function.
- Conflitos: nenhum identificado; revisão por perspectivas feita pelo mesmo agente, sem alegar validação independente.
- Fora do escopo: publicar, merge, alterar banco, métricas, comparações ou fuso.
- Rollback: reverter apenas os arquivos desta mudança; sem migração nem dados para restaurar.
- Custo externo: nenhum; implementação e testes locais.

## Revisão pós-implementação

| Perspectiva | Status | Evidência ou justificativa |
| --- | --- | --- |
| Produto e Estratégia | Pass | Dois atalhos adicionados; padrão continua 7 dias. |
| CTO e Arquitetura | Pass | Payload com datas explícitas aceito pelo growthRange atual; nenhum arquivo de backend alterado. Cache inclui preset e limites das datas. |
| IA e Agent Engineering | N/A | Sem IA, prompts ou agentes. |
| Segurança | N/A | Sem alterações de acesso, dados ou validação externa. |
| UX/UI | Pass | Select nativo rotulado preservado; teste de renderização confirma ambas as opções. |
| CX e Operação | Pass | Testes cobrem domingo, segunda-feira e mudança de dia em São Paulo antes/depois das 03h UTC. |
| Growth e CRO | Pass | 14 dias inclusivos e semana anterior completa confirmados no mesmo contrato de consulta; métricas inalteradas. |
| PMO e QA | Pass | 28 testes direcionados, lint do componente/helper/novo teste, git diff --check e pnpm validate aprovados. |

### Fechamento

- Validação direcionada: 3 arquivos, 28 testes (períodos, limites existentes e renderização do Growth).
- `pnpm validate`: typecheck, 69 testes do gate e build cliente/SSR concluídos com exit code 0.
- Build mantém avisos existentes de depreciação de inputValidator e recomendação de resolução nativa de tsconfig paths; nenhum erro.
- Documentação: este registro e referência em ADMIN_ANALYTICS_V2_2026-10-08.md.
- Risco residual: baixo; sem smoke no ambiente autenticado de produção, pois não houve publicação.
- Estado: implementado e validado localmente em codex/growth-periods-14d-last-week. Nenhum merge, deploy, publicação ou crédito Lovable utilizado.
- Release: aguarda autorização explícita do usuário para integrar e publicar somente este escopo no projeto ativo.

## Ampliação autorizada antes da publicação

O usuário autorizou integrar/publicar e, antes do envio, pediu também **Este mês**
e **Mês passado**. Mesma classificação pequena: dois atalhos no contrato existente.

Revisão prévia das perspectivas afetadas: Produto aprova os dois atalhos;
Arquitetura mantém payload de datas explícitas sem backend; UX distingue mês
corrente parcial do anterior completo; CX exige calendário de São Paulo;
Growth preserva 30 dias como janela móvel; QA exige primeiro dia do mês, ano e
fevereiro bissexto. IA e Segurança continuam N/A pelos mesmos motivos da matriz.
Sem conflito adicional. Decisão: Este mês = dia 1º até hoje; Mês passado = primeiro
até último dia do mês anterior. Aceite em 22/11: 01–22/11 e 01–31/10. Rollback e
escopo externo permanecem os mesmos; validar localmente antes da publicação.

### Revisão posterior da ampliação

Produto Pass (quatro atalhos); Arquitetura Pass (mesmo contrato, datas explícitas);
UX Pass (quatro opções no select nativo); CX Pass (limites de São Paulo);
Growth Pass (períodos móveis e calendário distintos); PMO/QA Pass (37 testes
direcionados, lint e pnpm validate com 69 regressões, tipos e build, exit code 0).
IA e Segurança N/A, com justificativas inalteradas. Testes mensais incluem dia 1º,
virada de ano, fevereiro comum/bissexto e divergência UTC/São Paulo.
Autorização de integração/publicação concedida nesta conversa; nenhum backend
ou dado produtivo será alterado. Publicação e smoke serão registrados a seguir.
## Publicação verificada

Os quatro atalhos foram salvos no repositório ativo em
`26ab88e682cff90adf7e2498ba9c3ab988a71e6d`, com diff local equivalente (apenas
newline final diferente em três arquivos). Build automático pronto, 37 testes
aprovados no Lovable. Publicação `de57f8f2-08ce-4c28-ab50-b75c3a726628`.
No domínio oficial autenticado, lista contém as quatro opções. Smoke conferiu
14 dias = 09–22/11/2026, Última semana = 09–15/11/2026 e Este mês = 01–22/11/2026,
com dados carregados. Mês passado presente na lista e limites validados em testes;
a seleção manual desse último não foi concluída devido à interação concorrente
com a janela. Sem backend, banco ou geração alterados. Git local e conector
GitHub recusaram escrita (403); integração exata via Lovable consumiu 2,8 créditos.
Estado: publicado e verificado, matriz de perspectivas permanece aprovada.