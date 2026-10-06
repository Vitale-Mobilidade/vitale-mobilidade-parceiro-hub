# Captura de transcrição do canal — 06/10/2026

## Classificação e objetivo
Estrutural: YouTube OAuth, Google Sheets, IA editorial e futura fila privada. Capturar legendas existentes, sem resumo/modelo na captura, e gerar rascunhos dos vídeos novos da aba Videos Youtube (gid 1172520414). Canal confirmado no perfil Lucas: UC9LuObKw8ZLoQBk6qHydEeg / @vitalemobilidade. Base operacional 11206bf, branch codex/youtube-transcript-oct06; checkout de referência não é destino de implementação.

## Revisão pré-implementação
| Perspectiva | Impacto | Risco | Dependência e recomendação |
| --- | --- | --- | --- |
| Produto | Remove copiar/colar, preserva fonte | Acervo inteiro virar geração paga | Registrar baseline primeiro; só vídeos novos. Prosseguir com condições |
| CTO | Adapter oficial e fila horária | Concorrência, timeout, geração duplicada | Claim atômico, estados persistidos, máximo um vídeo por execução; provar download antes de ativar |
| IA | Legenda intacta alimenta writer atual | Resumo, truncamento e legendas incompletas | Nenhum modelo na captura; preservar arquivo e timestamps; sem fallback para resumo |
| Segurança | OAuth server-side para canal próprio | Escopo oficial force-ssl é mais amplo que leitura | Consentimento explícito no momento, tokens nunca em logs/frontend/git; canal fixo e URLs oficiais |
| UX/UI | Status no Admin | Falha silenciosa | Pendente de legenda/erro/rascunho explícitos; operação manual preservada |
| CX | Nova entrada processada uma vez | Legendas ainda indisponíveis após upload | Retentativas limitadas e nenhuma geração até fonte válida |
| Growth | Artigo mantém conteúdo e relações reais | Superficialidade/associação errada | Writer e validações existentes, tokens Bikes desconhecidos bloqueiam; primeiro piloto revisado |
| PMO/QA | Integração com dependências externas | Declarar pronta sem OAuth/download real | Testes mockados + pnpm validate; release separado da preparação; teste real de captura sem IA |

## Conflitos e decisão consolidada
- Oficial não significa download ASR já comprovado: documentação expõe trackKind ASR, mas acesso efetivo deve ser testado no canal autorizado.
- O escopo oficial youtube.force-ssl permite mais do que leitura; código usará apenas GET de vídeos/legendas. Não conceder silenciosamente esse acesso.
- Código atual lê Videos Youtube com cache em memória de 10 min, acionado pela leitura; cron versionado encontrado é sync-bike-catalog-hourly. Ainda não comprovado cron de vídeos em produção: não confundir cache com agendamento.
- Escopo inicial: adapter de captura e testes offline; configuração OAuth e piloto real de download condicionados ao consentimento. Preparar fila/ligação editorial após prova do download. Não criar writer paralelo.
- Critérios: validar canal de cada vídeo, escolher português, guardar legenda original e texto sem reescrita, rejeitar fonte vazia/inválida, não expor secrets, não invocar IA em testes.
- Fora de escopo nesta preparação: publicar artigos, consumir IA/imagens, alterar produção, gerar acervo histórico, contratar faturamento.
- Rollback: não ativar fila; adapter isolado removível; revogar autorização OAuth pelo usuário se necessário; manter formulário manual.

## Preparação concluída até o consentimento
- Projeto Google Cloud criado no perfil Lucas: Vitale YouTube Editorial / responsible-map-510820-g4. Primeiro acesso/termos gerais aceitos diretamente pelo responsável. API YouTube ainda aguarda ativação pelo responsável ou confirmação dos termos específicos exibidos na tela.
- Adapter server-only implementado em supabase/functions/_shared/youtube-transcript.ts. Primeiro valida o canal via videos.list, escolhe faixa pt/pt-BR serving e não draft, prefere manual a ASR, baixa VTT sem tradução. Preserva originalVtt, cues, trackKind, timestamp e texto sem IA.
- Script scripts/youtube-capture.ts faz piloto unitário sem escrita no Supabase e sem IA. Lê credenciais de arquivo privado local, suporta refresh server-side, escreve VTT/JSON em diretório privado e só mostra contagem/status. Tokens nunca são argumentos do processo ou saídas.
- Testes dirigidos: 8 aprovados (fidelidade lexical, parsing inválido, texto curto/longo, ASR, bloqueio canal externo, falta pt, preferência manual/draft, erro sem exposição). Lint dirigido zero erros.
- pnpm validate aprovado: typecheck, 59 testes e build SSR. Avisos preexistentes de inputValidator/plugins/build, sem falha.
- Nenhuma chamada paga, geração real, publicação de artigo, migration ou alteração de dados em produção.
- Limites: sintaxe válida e 200 caracteres não provam transcrição completa; fidelidade deve ser comparada com a fonte real. OAuth e download real pendentes. Fila e cron não ativados.

## Revisão posterior da preparação (não equivale a aprovação do fluxo completo)
| Perspectiva | Status | Evidência / condição |
| --- | --- | --- |
| Produto | Pass | Captura isolada preserva fonte e não dispara acervo; ativação depende de piloto |
| CTO | Pass | Adapter e piloto isolados; cron de vídeo ainda não comprovado e fila adiada |
| IA | Pass | Zero modelos na captura; arquivo e fala preservados; testes de repetição |
| Segurança | Pass | Domínio oficial fixo, sem redirects, canal fixo, credenciais fora do git/logs; consentimento pendente respeitado |
| UX/UI | N/A | Nenhuma interface do produto alterada |
| CX | Pass | Falha explícita e sem fallback; fonte manual permanece operacional |
| Growth | N/A | Não houve conteúdo/rotas públicas/SEO/links alterados |
| PMO/QA | Pass | 8 testes + lint + validate; sem afirmar OAuth/download/automação concluídos |

Estado: preparação local validada; dependência externa em andamento. Nenhum GO para release da automação sem piloto real.

### Evidências adicionais
- CSV consultado em 06/10/2026: 115 linhas. Último vídeo Xn8ZUQn_HGk, data 05/10/2026, título V9 Max por MENOS de R$6 MIL: FALTA O QUE para você comprar?, Bikes V9 Max. Studio no perfil Lucas confirma o mesmo vídeo público e 115 vídeos aproximados.
- Studio do vídeo recente exige definir idioma antes de abrir fluxo de legendas; nenhum idioma/metadado do vídeo foi alterado. Não inferir dessa interface que não existem legendas automáticas: somente teste autorizado da API pode resolver a disponibilidade para o adapter.
- Download limitado a 2 MB durante streaming; fonte maior que 90 mil caracteres é rejeitada, acompanhando limite atual de análise integral do writer. Não truncar para gerar artigo.
- Typecheck estrito dirigido inclui o script e adapter (tsconfig geral não inclui scripts nem todos os helpers). Execução usa Node 24 já disponível, sem instalação de dependência.

## Continuação — API ativada
- Responsável confirmou clique/aceite da API. Tela conferida: YouTube Data API v3, Status Ativado no projeto responsible-map-510820-g4.
- Branding preparado (Vitale YouTube Editorial, conta Lucas como suporte/contato, Externo em modo de testes); aguardando aceite da política de dados do usuário das APIs exibida ao concluir. Esse aceite é separado dos termos gerais/API anteriores.
- scripts/youtube-authorize.ts preparado: cliente desktop, loopback 127.0.0.1, state criptográfico, PKCE S256, timeout 10 minutos, troca de código somente em oauth2.googleapis.com, arquivo privado mode 0600 e criação exclusiva, sem log de código/token/secret. Typecheck estrito e lint aprovados.
- Escopo oficial youtube.force-ssl necessário para captions.list/download; por permitir gestão além de leitura, consentimento e emissão de cliente serão confirmados no momento. Adapter usa apenas GET. Nenhuma credencial OAuth emitida nesta etapa.
- Responsável aceitou a política de dados; UI confirma Configuração do OAuth criada. Cliente Desktop Vitale Captura Local - Piloto preparado, aguardando confirmação no momento de emissão e armazenamento privado local. Consentimento de canal ocorrerá separadamente.
- Gate pnpm validate repetido após novo script: aprovado; sem chamada de IA.

## Cliente emitido e autorização preparada
- Responsável criou cliente Desktop com opção de agente de IA desmarcada (ajuda do Google define a opção para agentes/MCP; captura faz API direta).
- JSON baixado e movido para diretório privado fora do checkout, permissões diretório 0700/arquivo 0600. Nenhum valor de secret foi copiado para código/documentação/logs intencionais.
- Conta Lucas adicionada como único usuário de teste; UI confirma 1 usuário de teste.
- Login local em execução com PKCE/state. Tela final solicita ver/editar/excluir vídeos, comentários e legendas (youtube.force-ssl); confirmação explícita solicitada no momento. Sem conceder automaticamente o escopo amplo.
- Piloto previsto: Xn8ZUQn_HGk, captura somente, sem Supabase/IA/imagem/publicação. Custo monetário API: nenhum esperado, consumo aproximado 251 unidades (videos.list + captions.list + captions.download).

## Piloto real — resultado comprovado
- Responsável autorizou explicitamente o escopo final e clicou em Continuar. Login PKCE concluído; tokens salvos em arquivo privado 0600 fora do checkout. Nenhum token/secret em artefatos versionados.
- captions.list retornou HTTP 200, language pt, trackKind asr, status serving; captions.download retornou HTTP 200 e VTT de 52.304 bytes para Xn8ZUQn_HGk.
- VTT real tem linhas em branco com espaços dentro do cue, cues vazios de silêncio e cues de estabilização de 10 ms. Parser foi corrigido a partir dessa evidência, incluindo case-insensitive de asr. Mantém arquivo integral e cues originais não vazios; texto remove apenas linha de rolagem repetida antes de palavras com timestamps e estabilização curta. Repetições faladas dentro da linha são preservadas.
- Piloto pelo script final aprovado: 305 cues, 5.682 caracteres, último cue em 415,479 s; vídeo no Studio 6:56. Texto começa com Salve salve galera, vídeo rápido e mantém erros de legenda (p.ex. V Max), sem correção ou resumo por modelo.
- 10 testes dirigidos aprovados, incluindo fixture com estrutura ASR real, fala repetida e silêncio. Próximo gate de build após correção do parser.
- Evidência confirma disponibilidade de download ASR neste vídeo/canal. Não prova que todo vídeo futuro terá legenda disponível nem exatidão palavra por palavra.
- Nenhum artigo/capa foi criado, publicado ou modificado. A integração ainda não está agendada nem implantada.

## Decisão da próxima etapa — fila (preparação, não ativação)
- Baseline inicial: marcar as 115 entradas existentes como históricas, sem gastar IA; IDs posteriores ao primeiro snapshot completo entram na fila. Reentrada/troca de URL com t= não muda identidade. Falha de leitura não pode inicializar baseline vazio.
- Estado privado persistido: aguardando_legenda → transcricao_capturada → gerando → rascunho_concluido, com erro/necessita_revisao. Claim atômico por video_id e limite de um vídeo por execução; nunca repetir geração após resultado incerto sem reconciliar artigo/runs.
- Reutilizar writer e validações de editorial-admin, títulos e Bikes da planilha; tokens Bikes desconhecidos bloqueiam sem associação inventada. Fonte ausente nunca usa descrição/resumo como fallback.
- Criar rascunhos inicialmente; capa/publicação só após validação editorial de piloto e aprovação de ativação/custo no projeto ativo. Histórico não será processado implicitamente.
- Infraestrutura atual não contém cron de vídeo comprovado; cron de catálogo não será alterado. Confirmar pg_cron operacional antes de propor agendamento próprio de fila.
- OAuth em modo Testing tem limitações de duração do refresh token que precisam ser verificadas/mitigadas antes de operação contínua. Não declarar agendamento confiável com consentimento de piloto.
- Rollback: flag disabled, desativar apenas job novo, manter registros e formulário; revogar OAuth opcionalmente pelo proprietário. Nenhum rollback com exclusão de artigos.

## Fila — política local preparada
- youtube-editorial-queue.ts implementa somente política de orquestração com contrato de persistência explícito: baseline transacional, claim atômico, consulta de artigo antes/depois da captura, persistência de fonte antes de geração, marca gerando antes do writer pago e resultado incerto em revisão sem replay automático.
- Não é worker implantável ainda: adapter de banco transacional, integração concreta com writer, cron e status Admin pendentes. Não afirmar exclusão mútua ponta a ponta nem prevenção de corrida com geração manual sem implementar/testar persistência e reserva compartilhada.
- 8 testes da política aprovados; total dirigido 18. Gate pnpm validate aprovado após parser e política. Lint e typecheck estrito dos novos scripts/helpers aprovados.
- OAuth Testing: refresh token expira após 7 dias para escopo YouTube, segundo https://developers.google.com/identity/protocols/oauth2#expiration . Antes de rotina permanente, completar branding e preparar mudança de status/renovação com autorização específica; piloto não configura operação permanente.
- Transcrição piloto aberta no editor para revisão lexical. Fila real/capa/publicação permanecem desativadas.
- Revisão final: Produto/IA/Segurança/CX/PMO Pass para captura e política local; CTO Pass para módulos isolados, integração operacional ainda sem evidência; UX/Growth N/A sem interface pública alterada. Release da automação bloqueado por persistência/cron/OAuth contínuo pendentes, não por disponibilidade de ASR (esta comprovada no piloto).

## Conexão contínua — decisão prévia em 06/10
Classificação estrutural (OAuth, privacidade, IA). Usuário confirmou prosseguimento e uso dos créditos Lovable para artigo/capa. Código confirma LOVABLE_API_KEY e gateway Lovable; não foi acionado modelo nesta preparação.

| Perspectiva | Impacto / risco | Dependência / recomendação |
| --- | --- | --- |
| Produto | Conexão sem reconexão semanal; não prometer token irrevogável | Status produção e novo consentimento; prosseguir |
| CTO | Refresh server-side reutilizável; evitar refresh duplicado em paralelo | Cache em memória e expiração; prosseguir |
| IA | Legenda original permanece fonte; gateway existente preservado | Não criar fallback de resumo; prosseguir |
| Segurança | Acesso duradouro broad scope; política deve explicar uso real | Confirmar ampliação de duração no momento; tokens server-only; prosseguir condicionado |
| UX | Política legível, sem detalhes de infraestrutura no fluxo | Preservar preferências e SSR; prosseguir |
| CX | Revogação deve interromper geração | Erro sanitizado reconectar, sem retry pago; prosseguir |
| Growth | Política informa fonte editorial; sem alegar fidelidade absoluta | Manter metadados e indexação; prosseguir |
| PMO | Publicar OAuth não instala fila | Separar evidências e pedir release do delta concreto; prosseguir condicionado |

Decisão: preparar refresh server-only com erros de reconexão e falhas temporárias diferenciados; atualizar política para uso autorizado de dados do canal e envio da transcrição ao serviço de IA do Lovable. Conferir página pública antes de cadastrar links Google. Não publicar política, app OAuth nem secrets sem aprovação específica. O OAuth atual está Testando; Publicar app desabilitado pede completar Branding. O uso restrito ao proprietário enquadra a exceção pessoal documentada pelo Google, sem garantir aprovação automática do console. Rollback: reverter texto, desativar nova rotina e revogar acesso pelo proprietário; não apagar dados/artigos automaticamente.

## Conexão contínua — revisão posterior do corte local
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Escopo conexao continua separado da ativacao de artigos/capas; sem promessa de token eterno |
| CTO | Pass | Refresh reutilizavel, cache com margem de 60s, deduplicacao concorrente; testes de expiracao |
| IA | Pass | Nenhum modelo chamado; origem preservada; scripts usam refresh comum |
| Segurança | Pass | Endpoint oficial fixo, redirects proibidos, timeout, erros sanitizados; teste de grant rejeitado e config vazia |
| UX/UI | Pass | Texto sem novo fluxo interativo, links rotulados, preferências existentes mantidas, SSR build aprovado; inspeção visual pós-publicação pendente |
| CX | Pass | Reconexao obrigatoria distinguida de falha temporaria; fila instalada ainda pendente |
| Growth | Pass | Canonical/metadata/robots inalterados; política descreve uso original sem promessa de exatidao |
| PMO/QA | Pass | 23 testes dirigidos, ESLint, tsc estrito e pnpm validate aprovados; nenhum modelo/produção alterado |

Proposta específica de próxima ação: publicar somente a atualização de /privacidade no projeto ativo; configurar Branding com página inicial https://vitalemobilidade.com e política https://vitalemobilidade.com/privacidade; mudar OAuth para produção e emitir nova autorização offline do mesmo canal/scope. Risco médio pelo aumento de duração do acesso. Custo da configuração Google nenhum; publicação existente poderá consumir infraestrutura/credits do Lovable conforme workspace, sem chamada editorial/imagem. Rollback reverter política/desativar acesso pelo proprietário. Exige confirmação no momento da ampliação da duração segundo política de computer use. O guardrail de publicação exige autorização explícita do release da página.

Não ativar a fila ainda: falta implementação concreta da persistência, reserva compartilhada com manual, worker/cron, integração capa e gate de publicação. O token de teste permanece intacto na pasta privada; não substituir antes do novo consentimento.

## Execução autorizada — conexão contínua
Responsável autorizou publicação da política e mudança de OAuth em 06/10, reforçando não gerar o histórico porque a maior parte já foi feita. Snapshot privado contém 115 IDs de vídeo, política historical_excluded, nenhum artigo gerado. Este snapshot local ainda não equivale a baseline instalado no banco.

Somente src/routes/privacidade.tsx foi enviado a main em 8c24eb699fdd3d0d328cc5b5de118fdb2a217d64. Backend/scripts/testes continuam locais e desativados. Push precisou usar a conta Vitale-Mobilidade já autenticada; conta ativa anterior restaurada. Lovable confirma commit sincronizado e build completado. Publicação foi solicitada; conferência pública em andamento, não declarar concluída antes da evidência. Cadastro Google salvo com home, /privacidade e domínio vitalemobilidade.com. OAuth ainda aguarda confirmação da mudança de status. Nenhum faturamento ativado, nenhum modelo invocado.

## Conexão contínua — resultado verificado
- /privacidade publicado no projeto ativo; UI Lovable mostra Your website is up to date. Chrome confirma H1 Privacidade e uso de dados e seção Conteúdo do canal no YouTube com envio ao Lovable, revogação e contato. Release somente do texto em 8c24eb6; sem backend editorial modificado.
- OAuth no projeto responsible-map-510820-g4 confirmado Em produção. Mesmo cliente desktop, mesmo canal e mesmo scope. Novo consentimento concluído diretamente pelo responsável enquanto a UI era atualizada; servidor callback confirmou youtube_authorization_saved. Arquivo separado privado, modo 0600, contém refresh_token e não retorna refresh_token_expires_in. Ausência de prazo no retorno não garante acesso irrevogável; Google mantém causas de revogação/expiração.
- Script real renovou access token no endpoint oficial e baixou novamente legenda do vídeo piloto: 305 cues, 5682 caracteres, pt/asr. Nenhum modelo, artigo, capa ou banco chamado.
- Matriz pós-release: Produto Pass (fase autorizada concluída); CTO Pass (status e refresh/download comprovados, worker ainda não instalado); IA Pass (fonte original); Segurança Pass (consentimento autorizado, tokens privados); UX Pass (política pública conferida); CX Pass (reconexão e histórico explicitados); Growth Pass (sem mudança editorial/SEO); PMO Pass (23 testes/strict tsc/lint/pnpm validate anteriores ao release e smoke público/OAuth real).
- Tokens de produção continuam somente locais: transferir para secrets do backend é etapa separada. A automação completa ainda depende de persistência, reserva com writer manual, worker/cron, capa e gate de publicação. Nenhum histórico disparado; 115 IDs do baseline local devem ser importados como excluídos, sem geração implícita.
- Rollback de política: reverter somente 8c24eb6 e publicar delta, mediante autorização. Rollback do acesso: responsável revoga Vitale YouTube Editorial nas conexões Google; rotina permanece não instalada.
