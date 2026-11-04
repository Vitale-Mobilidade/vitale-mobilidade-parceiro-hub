# Perfil, validação e gestão das bikes do canal — 04/11/2026

Classificação: estrutural (onboarding autenticado, validação e contratos Supabase). Demanda: foto e contato no primeiro bloco; códigos de e-mail e WhatsApp ao criar conta; vantagem/CTA de anúncio em segundo bloco; conta do responsável como gestão de bikes do canal; tirar três placeholders vazios e permitir desativar anúncios com experiência de painel.

## Revisão prévia

| Perspectiva | Impacto / risco / dependência | Recomendação |
| --- | --- | --- |
| Produto | Separar vendedor do canal de anunciante comum; evitar cobrar/copy piloto para gestão da Vitale | Identificação de vendedor do canal no servidor, sem criar administração global por e-mail no cliente |
| CTO | Perfil integrado e onboarding com sessão; código deve ser enviado uma vez por cadastro e por canal, sem efeito React que duplique transportes | Reusar Resend/Hotpipe e RPCs; intenção de onboarding bloqueia apenas redirect do novo signup enquanto valida |
| IA | Nenhum modelo envolvido no OTP ou anúncio | Transporte determinístico, sem crédito de IA |
| Segurança | Sessão não equivale à validação; dados privados/propriedade/piloto mantidos; ocultar menu não é autorização | Prova real continua obrigatória; não promover usuário a editorial admin; novas projeções só expõem tipo de vendedor |
| UX | Foto, nome, e-mail e telefone juntos; depois anúncio e indicações. Painel de cards com busca/filtros/status e editor dedicado | Remover placeholders do painel e reaproveitar rascunho vazio em vez de multiplicar; salvar parcial, prévia viva e ações explícitas |
| CX | WhatsApp é canal de negociação; falha de um OTP não deve repetir o outro nem impedir newsletter | Mostrar estado por canal/reenvio, explicar link e mensagem padrão; desativação reversível com confirmação |
| Growth | Captação simples/menus ocultos/Radar/Quiz/afiliados preservados | Não inventar alcance, curadoria ou resultados; CTA direto wa.me com título e URL canônica |
| PMO/QA | Delta estrutural limitado a contrato de classificados e frontend; três rascunhos atuais são realmente vazios | Rehearsal SQL/backup antes de aplicar; arquivar somente IDs inspecionados após validar local; nunca DELETE |

## Decisão consolidada

Prosseguir localmente. Perfil único com foto no começo e painel de verificação integrado fora do form de nome. Cadastro pede celular com DDD e aceite de OTP; envia ambos após sessão/adesão, com resultado independente e formulário de códigos. Login comum continua voltando à origem. Falhas não viram sucesso nem disparam novo par automaticamente. Não persistir telefone/código em localStorage/metadata pública.

Configuração privada de canal identifica apenas o vendedor do canal e não concede permissões editoriais globais. Dashboard com foto, preço, status, busca, filtros; editor em três etapas Fotos / Informações / Publicação, teclado nas etapas, confirmação antes de descartar campos e prévia lateral no desktop; editar, desativar, vendida e reativar para rascunho; estados vazios reais e sem placeholders repetidos. Rascunhos parciais podem ser salvos; publicar permanece estrito, com fotos, prova real e autorização do contato.

Mensagem: “Olá! Vi a bike {título} na Vitale Mobilidade e gostaria de saber se ainda está disponível. {URL do anúncio}”. Link `https://wa.me/55...?...`, sem redirecionador/analytics bloqueante. Na prévia, explicar a mensagem sem permitir contato fictício.

Critérios: duas entregas mock exatamente uma vez em signup, reenvio isolado, verificação real preservada; perfil primeiro bloco e segunda seção de vantagens; painel sem vazios, criação reutiliza vazio, arquivamento/reativação/vendida corretos e propriedade negada; cinco fotos/preview mobile; menus permanecem ocultos; `pnpm validate`.

Rollback: revert frontend e funções anteriores; coluna privada pode ficar sem uso. Configuração do canal e arquivamento têm snapshot anterior, restauração apenas dos IDs afetados e sem sobrescrever conteúdo novo. Sem migração de Auth/RLS/Storage ou outro writer de newsletter. Abertura pública fora do escopo.


## Revisão posterior

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Gestão do canal, vantagens e fee privado separado; acesso público continua oculto |
| CTO | Pass | Três funções versionadas e coluna privada; sem mudança de writer/Auth/RLS/Storage; SSR/build/typecheck |
| IA | Pass | Nenhum modelo executado; OTP determinístico existente, testes sem mensagens reais |
| Segurança | Pass | UUID privado, projeção limitada, provas reais preservadas, rejeição de outro usuário e de payload que tenta se promover; sem admin editorial global |
| UX/UI | Pass | Perfil integrado; painel desktop/mobile; wizard com teclado, prévia e descarte confirmado; cinco fotos/capa e estados por canal |
| CX | Pass | Falha WhatsApp com reenvio isolado testada, um par automático por signup; desativar/vendida/reativar testados; sessão real intacta |
| Growth | Pass | Newsletter simples e flag de navegação sem diff; links wa.me diretos com mensagem e URL canônica |
| PMO/QA | Pass | 20 testes direcionados, 66 do validate + SSR/build, dois smokes UI, ensaio SQL sobre nove definições reais restauradas com dados sintéticos, baseline de três funções conferido |

Ensaios incluem rascunho parcial sem publicação, reaproveitamento de vazio, tipo de vendedor e nome Vitale na projeção pública, desativação retirando a bike da vitrine, reativação como rascunho, negação de acesso a outro usuário, sem promoção editorial. Lint dos módulos alterados passou. A inspeção visual mostrou os três blocos na ordem pedida e cards com foto/preço/status e ações. O dashboard evita representar um vazio técnico como um anúncio; alterações de km=0, conservação/bateria/nota, texto ou foto contam como conteúdo e não são ocultadas.

Trade-offs: a designação “canal” não dá poderes sobre anúncios de terceiros; corresponde à gestão das bikes próprias da Vitale, que é a necessidade atual. Rascunhos parciais são permitidos, mas a publicação continua estrita. Continuar no site sem digitar OTP não libera interação/publicação. Não houve novo disparo de transporte real para homologação; os provedores preservados já tiveram recebimento confirmado pelo responsável e o delta de orquestração foi simulado.

Backup: snapshot privado fresco de configurações, três funções e três rascunhos vazios; os três corpos reais conferem exatamente com o baseline local. Rollback das funções salvo fora do Git; ensaio de restauração de esquema/contratos bem-sucedido. Não restaurar banco inteiro nem sobrescrever conteúdo posterior para desfazer esta mudança.

Autorização: o responsável reiterou “pode implementar” nesta etapa após a descrição do escopo. Aplicação será no mesmo Supabase/Lovable, sem abertura dos atalhos públicos, nova permissão global, envio de teste ou cobrança. Custo externo da execução: nenhum crédito de IA/WhatsApp/Resend; cadastros reais futuros usam os dois envios solicitados e o saldo/plano existente.

Estado: GO para aplicar o delta já autorizado; registrar resultado da ativação e verificação após release.
