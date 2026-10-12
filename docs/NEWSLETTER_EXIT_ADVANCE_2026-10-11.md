# Newsletter: saída e preparação antecipada

Classificação estrutural: integração editorial/IA/Supabase e exclusão do Quiz.

## Revisão prévia
| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Captar e permitir edição D-1 | Interromper jornadas | Formulário existente | Prosseguir sem Quiz/admin |
| CTO | Modal global hidratado; draft por data | Duplicação/conflito | Lease e índice único | Prosseguir com snapshot por campanha |
| IA | Antecipar geração existente | Regerar e apagar ajuste | Writer/revisor atuais | Uma geração por edição; falha bloqueia envio |
| Segurança | Consentimento e dados existentes | Identificação invasiva | Storage só timestamp/flag | Não guardar email no browser; RLS privada |
| UX | Saída desktop, retorno ao topo mobile | Modal intrusivo | Dialog acessível | Não interceptar navegação, Escape/fechar com 72h |
| CX | Rascunho no editor existente | Envio ignorar alterações | Data de edição explícita | Reusar draft atualizado, congelar ao criar campanha |
| Growth | Conversão newsletter | Irritação/SEO | Conteúdo SSR intacto | Exibir após 15s, não mostrar a cadastrado neste browser |
| PMO | Tests locais e release controlado | Antecipação ainda não publicada | Migration e app coordenados | Gate validate e autorização para release |

Trade-offs: saída real não é detectável de forma confiável em mobile; usar retorno ao topo após leitura, sem travar voltar/fechar. 72h identifica navegador, não pessoa entre dispositivos. Antecipação evita custo adicional de geração: move chamada existente; preços são datados D-1. Conteúdo editado mantém validação de estrutura, não recebe alegação de nova revisão factual por IA.

Decisão GO local: modal nas páginas públicas exceto /quiz e descendentes; intervalo 72h após fechamento; confirmação de cadastro suprime modal. Draft automático domingo/quarta após 06h30 São Paulo para segunda/quinta; consumir somente draft da data correta e nunca gerar no envio. Sem draft, falhar fechado. Campanha existente congela conteúdo. Sem mudar frequência/hora. Rollback: reverter app, manter colunas/dados privados; pausar automação durante rollback se necessário. Nenhuma geração/envio/publicação real autorizada nesta preparação.

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Captação pública e revisão D-1; Quiz/admin/API excluídos por segmento |
| CTO | Pass | Lease existente; índice único de data; snapshots de campanhas preservados; SSR sem modal inicial |
| IA | Pass | Mesmo writer/revisor, uma geração por edição; testes simulados, nenhuma chamada real |
| Segurança | Pass | SQL local verifica acesso anon/authenticated negado; storage só timestamp/flag; opt-in existente |
| UX | Pass | Dialog existente com Escape/foco e fechamento; IDs de formulário únicos; gatilho após 15s; mobile sem interceptar voltar |
| CX | Pass | Data/horário visíveis; ajustes usados no worker; falta de draft pausa; edição não envia |
| Growth | Pass | Cadastro confirmado suprime modal; 72h verificadas nos limites; conteúdo/metadata públicos preservados |
| PMO | Pass | Testes worker: geração D-1, reuso, consumo de edição humana e ausência bloqueando envio; SQL e validate locais |

Validação: 30 testes direcionados; `pnpm validate` com 61 regressões, types e build; lint dos arquivos de implementação; migrações em PGlite isolado (unicidade, fingerprint e permissões). Teste antigo da página newsletter foi atualizado: formulário já está no footer, que o mock anterior removia. Sem alterações de produção, contatos ou disparos. Verificação visual/interação no preview publicado e criação real do draft continuam como critérios de liberação operacional; não comprovados por mocks. Avisos preexistentes inputValidator deprecated permanecem.

Evidência somente leitura de produção em 11/10: enabled=true, cron vitale-newsletter ativo */5; campanha geral de 08/10 sent, horário registrado 17h31 São Paulo; somente rascunho test_import. Próxima janela configurada 12/10 06h30–08h30 São Paulo, condicionada ao runtime/provedor. last_error= newsletter_busy é histórico e não prova falha de envio futuro. Não prometer entrega sem observação da execução.

Release proposto: migration aditiva + código no projeto ativo, publicação coordenada e geração antecipada pelo cron, validando rascunho datado no painel. Não enviar teste real nem disparar lote manual como efeito da publicação. A edição de amanhã só pode ser antecipada hoje se houver publicação/geração antes da janela; após domingo, ausência de draft bloqueia envio. Custo: geração existente antecipada (2 chamadas writer/reviewer, até 4 com correção), sem nova frequência; nenhuma chamada/credito consumido na preparação. Rollback: reverter código, preservar tabela/colunas/drafts e campanhas; pausar se houver incompatibilidade; nunca remover histórico.

## Decisão atualizada — recuperação autorizada em 11/10
O responsável esclareceu: antecipar apenas criação, nunca envio; autorizou implementação/publicação do escopo e pediu fallback. Oito perspectivas revistas antes do ajuste: Produto exige horário preservado e draft editável; CTO exige tentativas persistidas e lease; IA recomenda fallback determinístico das fontes publicadas, sem usar texto rejeitado; Segurança mantém RLS e consentimento; UX exige estado simples do rascunho; CX precisa tentativas com intervalo e erro visível; Growth prefere edição reduzida a falha de IA, sem repetir conteúdo antigo; PMO exige limites de custo e testes de recuperação. Todos recomendam prosseguir com essas condições.

Escopo revisado: duas tentativas do writer existente por data, espaçadas em 30 minutos; terceira tentativa gera edição simples sem IA, com artigos/vídeos inéditos disponíveis e bike ativa verificada. Tentativas persistidas antes da chamada, contador persistido limitado a três; após isso somente fallback sem IA é retentado em intervalos de 30 minutos até o fim da janela, permitindo recuperação de fontes sem custo de modelo; queda do processo não reinicia contador. D-1 normalmente; recuperação D0 disponível até o fim da janela de envio, usando fallback determinístico quando já chegou a janela. Draft pronto/ajustado nunca é sobrescrito. Sem fonte confiável, não enviar texto inventado ou edição antiga: registrar erro; não prometer ausência absoluta de falhas externas. Não alterar agenda 06h30–08h30 segunda/quinta. Nenhum envio fora dela. Release/merge/migration autorizados nesta conversa. Geração do draft de amanhã faz parte da ativação autorizada; nenhum teste real ou lote manual de emails.

## Gate posterior do escopo autorizado
A decisão de recuperação acima substitui a regra inicial de bloquear imediatamente quando não há draft. Produto Pass (envio preservado); CTO Pass (contador persistido, lease, unicidade, conteúdo congelado); IA Pass (até duas tentativas com modelo e recuperação determinística, testes provam zero modelo/transcrição no fallback); Segurança Pass (permissões SQL locais negadas para anon/authenticated); UX Pass (data e origem do draft visíveis, fechamento acessível e IDs únicos); CX Pass (estado/erro/retentativa no editor, retorno das fontes recuperável); Growth Pass (não repete acervo enviado, fallback aceita edição reduzida); PMO Pass (37 testes direcionados + SQL isolado, lint e pnpm validate/61 regressões/types/build). Dois ciclos de IA podem chegar a oito chamadas totais quando houver autocorreção; fallback/retries seguintes não usam modelo.

Rollback preparado: código base e3042fd6129a078b2d1f3b7647d2746868ce97c1; preservar migration aditiva, drafts, preparação e campanhas. Nenhuma coluna/tabela histórica é removida. Publicação deve confirmar novo bundle, cadastro sem submissão real e draft datado; geração real pode consumir quota normal já autorizada. Falhas de fonte/transporte externas permanecem possíveis e são tratadas, não se declara erro zero.

## Recuperação imediata após primeira rejeição real
Release cf229bec-cc75-4940-a404-7aa444a72808 confirmado por HTML SSR com IDs únicos. Primeira preparação real para 12/10 recebeu newsletter_writer_review_failed; resposta HTTP200 com preparationRetry=true, próxima tentativa em30min; nenhum draft/campanha/envio novo. Ajuste local complementar: admin autenticado pode Preparar edição simples sem IA durante cooldown, e dispatcher assinado aceita modo prepare-fallback para recuperação operacional equivalente. Mesma trava, fontes, índice de data e proteção contra sobrescrever draft editado; nenhuma campanha/envio nesse modo. Oito perspectivas prévias aprovam: Produto/CX (rascunho disponível imediatamente), CTO (helper existente/lease), IA (zero modelo), Segurança (admin ou assinatura existente), UX (ação junto ao erro), Growth (sem conteúdo rejeitado), PMO (teste de cooldown e não sobrescrita). Custo adicional de IA zero; SQL/service reads usuais. Autorização atual de implementação/publicação cobre este reparo.

Gate posterior da recuperação imediata: mesmas oito perspectivas Pass. Helper protegido contra sobrescrita; somente modo fallback passa cooldown; assinatura/admin obrigatórios; sem campanha/envio pelo modo de recuperação; testes dirigidos de autorização/recovery/helper passaram, lint/types/build e pnpm validate (61) passaram. Acesso público sem assinatura retorna403; admin sem sessão401 na publicação inicial. Tabelas drafts/preparations verificadas em produção: RLS=true, anon_read=false, authenticated_insert=false. Conta CLI GitHub ajustada para a conta existente Vitale-Mobilidade após403 da conta pessoal; falha de Vercel já existe no commit base e não pertence ao hosting ativo Lovable. Nada de DNS/hosting externo foi alterado.
