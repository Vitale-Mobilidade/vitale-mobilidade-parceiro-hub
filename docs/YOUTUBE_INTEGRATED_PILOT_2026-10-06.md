# Piloto integrado no projeto ativo

Classificação: estrutural (Sheets, OAuth, IA, persistência). O teste local anterior comprovou download, não comprovou o fluxo Lovable. A conferência posterior encontrou 115 vídeos e 107 artigos publicados associados por ID, oito pendentes sem correspondência exata por título. Não gerar histórico em lote.

## Decisão e revisão anterior à liberação

| Perspectiva | Impacto | Risco | Dependência / recomendação |
|---|---|---|---|
| Produto | Um piloto no Admin e futuros vídeos pela mesma entrada | Disparo do acervo | Baseline transacional; oito históricos só por escolha explícita |
| CTO | `generate-from-sheet` e `youtube-hourly` chamam o writer atual | Corridas manual/automático e interrupções | Reserva única persistida; revisar execução incerta; prosseguir condicionado ao teste cloud |
| IA | Transcrição original capturada no servidor | Resumo/truncamento/ASR errado | Sem modelo na captura; arquivo e cues preservados; sem fallback |
| Segurança | OAuth somente em secrets do projeto | Tokens públicos / cron aberto | RLS sem grants clientes; chave privada do worker; owner Admin válido |
| UX | Opção no formulário dispensa copiar texto | Operador supor sucesso em falha | Progresso por estágio; rascunho aberto; erro explícito |
| CX | Falha requer conferência | Repetição paga após timeout | Reserva durável; nunca replay automático; registrar origem privada |
| Growth | Writer/SEO existente preservados | Publicar conteúdo não revisado | Nenhuma publicação automática no piloto |
| QA | Mesma Edge Function na entrada Admin/horária | Declarar validação real com mock | Testes locais antes; teste integrado só após instalação no projeto |

## Escopo e conflitos

- Criar artigo pela entrada Admin de um vídeo selecionado, com título/bikes da planilha e legenda oficial obtida pelo servidor. Browser envia somente o ID; não envia resumo/transcrição manual nesse modo.
- Fonte integral fica em tabela privada antes da chamada de IA. Reserva exclusiva por vídeo também cobre a criação manual de novos artigos quando integração habilitada. Falha incerta permanece reservada para conferência; não liberar/repetir automaticamente.
- Artigo existente de qualquer status ativo é reutilizado no modo automático, sem regenerar IA. Links diferentes mantêm o mesmo ID.
- Entrada horária privada consulta a planilha e usa o MESMO generateStream. Primeiro snapshot guarda histórico; máximo um candidato novo por execução; flags horária e captura separadas.
- Capa do formulário continua pelo compositor browser atual. Isso **não equivale a capa autônoma no servidor**. O cron preparado nesta etapa gera somente rascunho de artigo. Publicação/capa sem browser dependem de implementação e validação próprias; não afirmar fluxo completo artigo+capa+publicação pronto.
- Divergência: automatizar capa agora requer mover renderização de título/crop para runtime server, mudança além da captura. Escolha: provar pipeline integrado do artigo primeiro, mantendo requisito de capa autônoma pendente e explícito.
- Rollback: desligar YOUTUBE_HOURLY_ENABLED e YOUTUBE_EDITORIAL_ENABLED; desativar somente cron novo, manter fontes/artigos/fluxo manual. Não excluir fontes nem artigos.

## Instalação pendente

Migration privada; secrets YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, flags; deploy editorial-admin e frontend. Chave/owner/cron apenas após piloto. Nenhuma migration/deploy/geração desta etapa executados até o registro do teste cloud. O agendamento não está incluído na migration de fontes para impedir ativação acidental.


## Evidências da preparação e segunda revisão

- 55 testes dirigidos aprovados: entrada Admin/horária, autenticação do worker, flags, baseline sem IA, recusa de snapshot parcial/duplicado, reserva concorrente, captura e persistência antes do writer, reuso sem gasto, erros sem fallback, parser/OAuth e catálogo.
- pnpm validate aprovado: typecheck, 59 regressões e build SSR.
- Lint de regras de código sem erros; quatro avisos de hooks preexistentes. Formatação geral preexistente não foi reescrita (checagem dirigida com prettier/prettier desativado).
- Consultas read-only do ambiente Lovable: 107 artigos publicados, nenhum ID de vídeo ativo duplicado; cron existente apenas catálogo de bikes e workers de imagens/perfis. Nenhum job de vídeo foi encontrado.
- Config de gateway preparada com verify_jwt=false: Admin continua verificando JWT com getUser e associação ativa; a entrada horária verifica chave privada e owner Admin. Necessário para o job não depender de sessão humana. Deve ser instalado junto do código, nunca isoladamente.
- Migration acrescenta índice único por vídeo ativo como segunda barreira contra duplicação; tabelas sem acesso anon/authenticated. Nenhuma migration executada nesta preparação.
- Falha na captura fica em conferência, sem retentativa automática neste piloto. A política de retentativas preparada anteriormente ainda não está conectada a essa reserva. Isso precisa ser tratado antes de liberar operação horária contínua.

| Perspectiva | Resultado da preparação local | Evidência/limite |
|---|---|---|
| Produto | Pass | Um vídeo explícito; nenhum histórico em lote; flags desligadas por padrão |
| CTO | Pass | Caminho compartilhado Admin/worker, reserva e índice; execução cloud ainda pendente |
| IA | Pass | Fonte oficial persistida integralmente antes de IA; nenhum resumo aceito do cliente |
| Segurança | Pass | Secrets só servidor, RLS privado, autenticação própria para ambos os caminhos |
| UX | Pass | Opção localizada no formulário, progresso/erro/reuso explícitos; revisão visual cloud pendente |
| CX | Pass | Falha incerta bloqueia replay pago; retentativa contínua ainda pendente |
| Growth | Pass | Só rascunho; writer existente; publicação automática não liberada |
| QA | Pass | 55 testes dirigidos + validate; preparação não é prova integrada de produção |

Estado: código preparado localmente para instalação e piloto de artigo no Lovable. NÃO validado em cloud. NÃO concluído o fluxo autônomo de capa/publicação nem liberado cron. Nenhum GO para operação editorial contínua; somente instalação controlada e teste unitário real após autorização de escopo.
