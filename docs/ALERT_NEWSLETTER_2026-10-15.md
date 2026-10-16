# Alerta → newsletter — preparação local
Classificação: estrutural (Radar, integração e consentimento).

## Revisão prévia
| Perspectiva | Impacto / risco / dependência / recomendação |
|---|---|
| Produto | Retenção adicional; não condicionar alerta ao marketing; opção independente. Prosseguir. |
| CTO | Backend grava inscrição após alerta; falha parcial precisa resposta própria; reutilizar tabela e gate existentes. Prosseguir condicionado. |
| IA | Sem geração ou alteração de agentes. Sem impacto; N/A. |
| Segurança | Consentimento do alerta não cobre newsletter; checkbox desmarcado, texto v2 existente, não importar antigos nem reativar supressões. Prosseguir condicionado. |
| UX | Opção rotulada, opcional e descadastro explicado; sucesso parcial explícito. Prosseguir. |
| CX | Dedupe por e-mail sem sobrescrever preferências; falha newsletter não invalida alerta salvo. Prosseguir. |
| Growth | Mais inscrições com escolha explícita; preservar segmentação de inscritos atuais. Prosseguir. |
| PMO | Testes de opt-in estrito, falha e duplicata; validate; publicação separada. Prosseguir condicionado. |

Decisão: adicionar opt-in específico e inscrição backend idempotente para novos e-mails com interesse Radar; preservar registros existentes integralmente. Aceite: sem opt-in não grava; duplicata não reativa; falha parcial visível; nenhuma importação retroativa ou envio direto. Trade-off: duplicatas suprimidas exigem fluxo próprio de reinscrição, sem revelar existência do contato. Rollback: reverter frontend e função; nenhuma migration necessária. Produção e dados antigos fora do corte local.

## Revisão posterior do corte local
| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Opt-in independente, alerta preservado. |
| CTO | Pass | Writer no backend; upsert com ignoreDuplicates por email; sem schema novo. |
| IA | N/A | Nenhum agente ou geração alterados. |
| Segurança | Pass | Boolean estrito; texto separado v2; registro existente não atualizado; sem PII em logs adicionais. |
| UX | Pass | Checkbox rotulado inicialmente falso; aviso de falha parcial; revisão visual em preview pendente para publicação. |
| CX | Pass | Sucesso do alerta independente; sem reativação ou sobrescrita de preferência. |
| Growth | Pass | Novos interessados entram no segmento Radar pelo gate existente. |
| PMO | Pass | 7 testes direcionados, pnpm validate e git diff --check aprovados. |

Consulta somente leitura: 11 alertas ativos, apenas 1 e-mail encontrado na newsletter. Não infere consentimento para os demais e não importa contatos antigos. Código preparado em branch codex/alert-newsletter, base c60a758; não publicado. Testes usam mocks; integração remota e QA visual continuam necessários antes da ativação. Custo externo adicional: nenhum nesta preparação. Rollback: reverter os arquivos; inscrições consentidas novas devem ser preservadas. Publicação do frontend e deploy da Edge Function exigem autorização específica conforme AGENTS.md e EXECUTION_GUARDRAILS.md; nenhuma escrita produtiva nesta task.


## Revisão de escopo — confirmação única solicitada pelo usuário
Substitui a decisão de duas caixas: uma caixa inicialmente desmarcada descreve explicitamente alerta e newsletter, com cancelamento/descadastro. Frontend envia consent e newsletterConsent juntos. Backend exige newsletterConsent estritamente true para não inscrever usuários de formulários antigos que só exibiam consentimento do alerta; versão do alerta passa a v4. Mantém texto v2 da finalidade newsletter no registro específico, dedupe, supressão e falha parcial.

Revisão prévia atualizada: Produto e Growth aprovam a escolha única solicitada; Segurança condiciona à descrição explícita das duas finalidades e sinal novo para compatibilidade; CTO preserva o contrato antigo sem inferir opt-in retroativo; UX elimina a segunda caixa; CX mantém cancelamentos e falha parcial; IA N/A; PMO exige repetir teste e validate. Conflito registrado: a separação anterior dava escolhas independentes no formulário; usuário escolheu adesão conjunta, com finalidades descritas antes da confirmação. Nenhuma inscrição retroativa e nenhuma publicação autorizada.

Revisão posterior da confirmação única: Produto Pass (adesão conjunta solicitada); CTO Pass (flag explícita preserva clientes antigos); IA N/A (sem agentes); Segurança Pass no corte local (finalidades explícitas, checkbox falso, supressões preservadas e sem importação); UX Pass na inspeção do código (uma caixa rotulada, descadastro explicado; preview visual pendente); CX Pass (aviso de falha parcial preservado); Growth Pass (inscrição Radar conjunta); PMO Pass (7 testes específicos e pnpm validate novamente aprovados; diff sem erros). Estado: preparado localmente, não publicado. Risco residual: formulário de adesão conjunta não oferece alerta sem newsletter nesta entrada; decisão explícita do usuário registrada acima. Cancelamentos posteriores continuam preservados.

## Release autorizado
Usuário autorizou implementar e publicar nesta conversa. Revisão final: texto combinado compartilhado pelo frontend e backend e armazenado literalmente nos novos registros; clientes antigos preservam texto/versão v3. Os oito pareceres anteriores seguem aplicáveis (IA N/A); 8 testes dirigidos agora incluem duplicata suprimida e falhas; validate passou novamente com 62 testes e build. Nenhuma migration, importação retroativa ou disparo de teste. Publicação coordenada: sincronizar main, implantar somente bike-price-alert pelo runtime integrado Lovable, conferir compilação, publicar frontend, smoke da interface. Custo: operações normais de deploy e uso pontual do agente Lovable apenas para implantação exclusiva do runtime, estimativa pequena, sem geração de conteúdo. Rollback: reverter commit deste release e reimplantar função/frontend preservando inscritos consentidos.
