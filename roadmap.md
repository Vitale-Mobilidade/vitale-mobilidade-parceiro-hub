# Ajuste estrito da Home e navegação

# Instagram independente — 13/11/2026
- [x] Remover imports WASM de source; binários em public/wasm, loader exclusivo navegador; snapshot mantém JSON/auth sem codecs.
- [ ] Integrar composição compatível ao workflow: servidor pausa antes de IA, pois este stack rejeita WASM tanto dinâmico quanto importado.
- [ ] Validação Worker hospedado e snapshot admin real: aguardam publicação/preview do novo commit e sessão admin; sem flags/IA/Meta.
- [x] SQL aplicado pelo proprietário e verificado em 13/11; sem reaplicar migrations/journals; 4 podcasts preparados preservados.
- [x] Bucket instagram-carousels privado, 12582912 bytes; MIME não configurável pela ferramenta, restrição no escritor mantida.
- [x] Variável INSTAGRAM_CAROUSEL_RELEASE_ENABLED=true salva; somente editorial-admin implantada (SHA 3eb1c2a4756a418a3ac26d92590efe9e0665ec15278042460421972ba68abc7e).
- [ ] Publicar Hub: ferramenta desativada por preferência de aprovação; proprietário usará publicação autorizada pelo conector/UI.
- [ ] Habilitar somente generation_enabled após confirmação do app publicado; publishing_enabled/automation_enabled continuam false. Proprietário gera pelo navegador; nenhum job criado.
- [x] Corrigir fixture WebP 1150×1082/quadro 600×564 em y118; 36 testes dirigidos passaram em 13/11 22:22 UTC.
- [ ] Contrato, fonte elegível, estados persistidos e migrations somente versionadas.
- [ ] Geração Gemini protegida, JPEGs determinísticos e envio Meta aprovado/idempotente.
- [ ] Admin Instagram e retirada dos comandos sociais do podcast.
- [ ] Testes simulados, validação dirigida, revisão das oito perspectivas e commit.
- [ ] Release: depende de autorização para migration, storage, publicação e gates; sem cron instalado.

- [x] Unificar navegação e rodapé sem links de Bikes ou comparação; usar logo oficial e favicon.
- [x] Trocar primeiro atalho pelo Quiz e remover bloco de comparação somente da Home.
- [x] Exibir até três artigos publicados reais; remover a seção independente de vídeos da Home.
- [x] Usar “Radar de preços” nos links da navegação, bikes e rodapé; ajustar a cápsula do logo para #FBF9F8.
- [x] Inspecionar proporcionalmente mobile/desktop e abertura de artigo na prévia, sem suíte de testes.
- [x] Não publicar.

# Fundação editorial (preview, sem publicar)
- [x] Aplicar PR #2 adaptado ao HEAD; outline-only como ação padrão.
- [x] Etapas persistidas/reprocessáveis; publicação automática atrás de gate técnico.
- [x] Classificar as 5 transcrições de teste sem forçar arquétipos; sem artigos completos.
- [x] Testes/validate; migration NÃO aplicada no banco vivo; sem publicar.
- [x] Patch runtime outbox Hotpipe (AbortController, validação chave, log seguro)

# Agente newsletter — 08/10/2026
- [x] Revisar oito perspectivas e registrar decisão/modelos sem alterar provedor.
- [x] Remover curiosidade de contrato, abertura, validação, renderer, admin e testes ativos.
- [x] Simplificar Radar em cartões email-safe com contexto de datas global.
- [x] Validar preservação da diversidade/agenda/UTMs, testes e visual; registrar oito pós-revisões.
- [ ] Geração real e teste único posterior: aguardam a etapa posterior determinada pelo responsável; sem publicação/ativação agora.
- [ ] Investigar request10276 pelas razões seguras do revisor; corrigir apenas inconsistência confirmada e validar uma geração, sem envio ou ativação.
