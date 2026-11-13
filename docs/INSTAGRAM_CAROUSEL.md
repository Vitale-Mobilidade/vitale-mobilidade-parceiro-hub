# Instagram independente — contrato e release suspenso

## Brief
O administrador escolhe o par vídeo/artigo elegível, prepara um carrossel privado, revisa as evidências e aprova uma revisão específica antes de enviar. A primeira tela mostra fonte, estado e ação principal “Gerar rascunho”; não inicia trabalho ao abrir. A transcrição é factual; artigo publicado do mesmo ID fornece contexto. Sem fonte elegível ou foto específica, o estado é explícito. A publicação não depende de áudio/RSS. Métrica: rascunhos aprovados/publicados sem duplicação ou alegações sem suporte.

## Governança disponível
`AGENTS.md` foi lido. `docs/EXECUTION_GUARDRAILS.md` e `docs/SQUAD_GOVERNANCE.md` não existem neste checkout; não foram inventados nem substituídos. Aplicam-se os limites explícitos do proprietário, testes sem rede e revisão proporcional abaixo.

## Limites deste release
Código e SQL versionados apenas. Nenhuma migration aplicada, bucket criado, chamada Gemini/Meta real, email, cron, deploy ou publicação. O gate server-side `INSTAGRAM_CAROUSEL_RELEASE_ENABLED=true` e os settings persistidos são necessários; padrão fechado. Não há cron nem horário novo. O gatilho futuro descobre apenas pares elegíveis após o corte de ativação, nunca completa com histórico.

O ambiente recusou novos arquivos em ambos os históricos protegidos (`supabase/migrations` e `drizzle/migrations`) porque esses diretórios representam migrations aplicadas. O SQL pendente está versionado em `docs/sql/instagram-release/20261113220000_instagram_carousel.sql`; não integra o journal aplicado. Promover byte a byte pela ferramenta oficial, em release posteriormente autorizado. Nenhum desvio por shell foi usado nesses diretórios.

## Estados e custo
`queued → scripting → scene → rendering → review → approved → publishing → published`; falhas preservam arte/roteiro em `blocked`, publicação desconhecida fica `uncertain`. CAS de revisão e lease de 15 minutos. Flags de tentativa são persistidas antes de chamadas pagas; resultado de roteiro desconhecido não repete geração. Cenário salvo é reaproveitado; cenário desconhecido permite concluir sem cenário. Máximo uma chamada de roteiro e uma de cenário por job, nenhuma IA na composição JPEG ou retomada de render. Sem retries automáticos; 402/403 pausam o fluxo persistido. Falhas temporárias permanecem para inspeção, sem cobrança oculta.

Novas chamadas usam Gemini atual do catálogo autenticado: `google/gemini-3.8-flash` para roteiro; `google/gemini-3-pro-image` para ambiente, sem mudar integrações existentes. Catálogo lido sem geração. Tarifas observadas em 13/11: roteiro = tokens de entrada × 0,000003 + tokens de saída × 0,000015 créditos; cenário = entrada textual × 0,000008 + saída imagem × 0,00048 e texto × 0,000048. O custo depende do uso real informado pelo Gateway; não existe preço fixo inventado. Validação custa zero créditos de geração.

## Release e rollback (aguardam autorização)
1. Backup restrito das definições das funções sociais legadas e view `podcast_prepared_episodes`; preservar dados e jobs. Rever SQL em ambiente isolado e então aplicar o SQL pendente pela ferramenta oficial.
2. Criar via Storage API bucket **privado** `instagram-carousels`, limite 12 MiB, MIME image/jpeg e image/png, sem políticas anon/authenticated. Não criar bucket via SQL.
3. Publicar app somente após autorização e implantar `editorial-admin` alterada separadamente, para retirar caminhos sociais legados do podcast. A migration neutraliza claims/dispatch/trigger legados mesmo com código anterior; não altera cron nem exclui histórico.
4. Configurar gate de release, origem absoluta `INSTAGRAM_PUBLIC_ORIGIN=https://vitalemobilidade.com` e reutilizar as configurações Meta server-side existentes; somente depois habilitar geração. Publicação permanece desligada até autorização. `PODCAST_*` é apenas o nome legado das credenciais reutilizadas, não vínculo ao ID/status do episódio.
5. Futuro agendamento usa endpoint assinado, owner admin ativo, corte de ativação e deduplicação. Não foi instalado cron nem escolhido horário. Agendamento só prepara revisão; nunca aprova ou publica.
6. Pausar no Admin desativa os três gates persistidos. Gate externo false desliga rotas e imagens imediatamente. Não remover dados/arquivos. Rollback de podcast exige reimplantar artefato anterior e restaurar somente as definições guardadas no passo 1; não reativar cron social durante rollback. Tabelas/coluna novas podem permanecer aditivas.

A exposição à Meta é token opaco de 1 hora, vinculado ao job e revisão aprovada, hash no banco, endpoint somente JPEG validado por hash e dimensões, cache no-store. O token é revogado ao confirmar publicação ou pausar. Rascunhos usam download autenticado, nunca URL pública de Storage.
Uma tentativa `media_publish` é registrada antes da chamada. Retomada com tentativa registrada só reconcilia; ausência/ambiguidade permanece sem confirmação, nunca dispara novamente. Os IDs dos containers não necessariamente coincidem com IDs dos filhos publicados; reconciliação deve permanecer conservadora onde a Meta não fornecer correlação inequívoca.

## Retomada e reconciliação operacional
- WebP reutiliza @jsquash/webp 1.5.0 já instalado no Hub, com WASM incorporado e inicialização preguiçosa, sem dependência nova. Assinatura real determina PNG/JPEG/WebP; máximo 12 MiB, 4.200.000 pixels e 8192 por eixo, checados antes da decodificação; animação recusada. Fixture de catálogo: `src/assets/bikes/v20-ultra-landing.webp`, pixels inteiros com contain, sem crop. Cenário JPEG/PNG mantém extensão/MIME reais e checkpoint; nunca refaz chamada paga.
- Fotos são deduplicadas por bike e fingerprint dos pixels, registrado em cada arte para retomada. Layouts usam geometrias diferentes por pauta; encerramento é sempre determinístico com as quatro ações. Sem imagem, a narrativa segue tipográfica; nenhum desenho inventado de acessório.
- `media_publish` confirmado persiste `media_id` e `published` antes de buscar permalink; falha do link registra `meta_permalink_pending`, sem reclassificar nem republicar.
- Em `uncertain`, nunca resetar `publish_attempted`, recriar job ou chamar publicação de novo. Primeiro consultar o status do container do álbum. Se não estiver PUBLISHED, manter incerto. Container/filhos de criação não são IDs de mídia publicada: igualdade com os IDs de filhos não é prova válida na operação normal.
- Operador autorizado consulta a mídia da conta na janela de `publish_attempted_at`, incluindo todas as páginas necessárias, e compara legenda exata, número/ordem e visual de cada JPEG aprovado. Hora/legenda isoladas não bastam. Registra ID do álbum **publicado**, IDs dos filhos **publicados**, permalink e evidência visual/temporal, com revisão por segundo administrador. Sem correlação inequívoca, mantém incerto, sem repost.
- A ação automática atual só confirma correlação exata; normalmente IDs divergentes exigem o procedimento acima. Não há override de reconciliação operacional nesta entrega: persistir confirmação requer operação restrita separadamente autorizada; não foi realizada. Falha de consulta nunca autoriza novo envio.
- SQL preserva a elegibilidade dos podcasts antigos via `prepared_instagram_post` existente e dos novos via `prepared_cover_path`, mantendo versão do artigo, ordem, áudio/RSS e histórico. Não considera versão isolada como preparo completo. Funções sociais tornam-se no-op, sem editar cron ou histórico. SQL ainda não executado: validar tipos/DDL em banco isolado antes do release.

## Revisão das oito perspectivas
- Produto: pauta completa no Instagram, 4–7 slides, revisão humana, sem Reels ou CTA externo.
- CTO: fluxo TanStack server-side independente; CAS/lease e checkpoints duráveis; podcast preserva áudio/RSS/capas.
- IA: Gemini existente, entrada não confiável, citações literais por alegação; sem autonomia estimada apresentada como medição. Sem testes faturados.
- Segurança: membership ativo `admin` verificado no servidor; tabelas/bucket privados, somente service_role; acesso temporário à Meta somente à revisão aprovada.
- UX: fonte/estado/legenda/prévia ordenada/evidências/download numerado/aprovação explícita; erros mantêm checkpoint.
- CX: ausência de bike/cenário não usa thumbnail ou imagem sintetizada; pode concluir tipograficamente.
- Growth: quatro ações determinísticas no encerramento; sem link da bio, site, artigo ou podcast.
- PMO: release separado, migrations não aplicadas, validação simulada e rollback restrito registrados.