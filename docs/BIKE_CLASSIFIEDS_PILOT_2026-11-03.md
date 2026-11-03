# Venda sua bike — piloto de 03/11/2026

> **Estado atual: publicado e ativado.** [Vitrine](https://vitalemobilidade.com/venda-sua-bike), [Meus anúncios](https://vitalemobilidade.com/conta/anuncios). Criação liberada apenas à conta convidada, sem cobrança piloto; publicar exige adesão e provas de e-mail/celular do próprio anunciante. Registro de etapas anteriores preservado abaixo.

Classificação: estrutural (Supabase, Storage, identidade, SSR e novas rotas públicas).

## Revisão pré-implementação

| Perspectiva | Impacto | Risco | Dependências | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | Classificados separados do catálogo; preço R$150 | Confundir piloto com pagamento | Acesso restrito ao UUID da conta solicitada | Prosseguir com isenção piloto explícita, sem cobrança |
| CTO | RPC privada, projeção pública SSR, mídia em bucket privado | Rascunhos em cache ou mídia pública permanente | Supabase integrado atual, sessão existente | Prosseguir com RLS, URLs temporárias e leitura pública sem service role |
| IA | Anúncios escritos pelo anunciante | Conteúdo do usuário entrar no contexto editorial | Nenhuma nova IA | Preservar agentes e não alimentar newsletter/Radar com anúncios |
| Segurança | Upload, dados do vendedor e publicação | IDOR, falsa quitação, exposição de telefone | Identidade real validada e consentimento específico | UUID imutável no servidor; nenhuma permissão administrativa; publicar exige duas provas |
| UX | Header à direita do Quiz, perfil com foto, formulário com cinco imagens | Menu lotado no mobile e perda de edição | Design system e estados explícitos | Menu acessível; prévia; rascunho; retirar do ar e marcar vendida |
| CX | Piloto individual e contato direto com vendedor | Parecer que Vitale intermedeia pagamento/garantia | Explicação operacional no hub | Informar R$150, isenção piloto e negociação entre pessoas |
| Growth | Home com até três anúncios e hub completo | Inventar oferta, alterar captação ou canibalizar Radar | Apenas anúncios reais publicados | Preservar newsletter byte a byte; piloto noindex, sem mudança no sitemap |
| PMO/QA | Nova entrega aditiva | Liberar para toda base ou regredir autenticação | SQL isolado, UI mock, validate e documentação | Gate direcionado antes de ativar/publicar |

## Conflitos e decisão consolidada

O usuário pediu visibilidade pública e criação restrita. A navegação e a vitrine serão públicas; o servidor autorizará criação apenas para o UUID correspondente a gpalmerio@gmail.com. Não haverá anúncios fictícios. Home mostra até três anúncios reais mais recentes; hub repete esses destaques e lista todos. Nenhum algoritmo de destaque pago é prometido.

O preço normal é R$150 por anúncio; nesta fase o único anunciante terá isenção piloto, registrada como `pilot_exempt`, nunca como pagamento recebido. Checkout e abertura para outros anunciantes ficam adiados.

Acesso ao formulário não equivale a prova de identidade: rascunhos do piloto são permitidos, publicação exige e-mail e celular verificados pelo fluxo existente. A divulgação do WhatsApp verificado exige consentimento específico ao publicar. Nome/foto do vendedor acompanham o anúncio, e-mail nunca é público.

Mídia: bucket privado, reservas emitidas por RPC, caminhos imutáveis e no máximo cinco imagens por anúncio. Upload WebP até 2MB, conversão local sem EXIF; URLs assinadas curtas com RLS apenas na edição. A mídia pública usa endpoint estável, credencial pública, revalidação de publicação e cabeçalhos no-store/nosniff; checa assinatura WebP e tamanho. URLs privadas já assinadas podem sobreviver à retirada por até cinco minutos. Não há promessa de revogação instantânea nem de moderação automática das imagens. Perfil recebe foto própria; nenhuma listagem pública de perfis.

Critérios: conta no header após Quiz, perfil editável com foto, criação restrita no banco, upload e capa, validação no publish, SSR público sem rascunhos, valor correto sem cobrança, estados vazio/erro/vendida, proteção mobile/teclado, newsletter e Radar intactos.

Fora do escopo: checkout, cobrança de usuários, prova documental de propriedade da bike, fórum/feed/curtidas, geração de anúncios, moderação para abertura geral, migração de catálogo. Não criar anúncio nem validar identidade em nome do usuário.

Rollback: desabilitar `member_classifieds_settings.enabled` interrompe publicação/leitura pública/uploads de anúncios; retirar links por revert do commit. Preservar dados e migrations aditivas. Não apagar mídia por SQL (usar Storage API). Antes de produção, validar restore proporcional e registrar ação/autorização.

Estado: revisão concluída; implementação e validação em andamento. Não publicado.


## Implementação e evidências locais

- `/venda-sua-bike`: três anúncios publicados mais recentes em destaque, seguidos de todos os anúncios disponíveis, com paginação de 12. Detalhe próprio e estado indisponível para bikes vendidas/retiradas. Rotas do piloto noindex, canonical próprio; nenhum sitemap alterado.
- Home reaproveita o mesmo card e mostra até três anúncios reais. Estado vazio honesto; nenhuma bike do catálogo vira anúncio automaticamente.
- Header: Entrar/Minha conta depois do Quiz em desktop; foto e menu acessível; adaptação entre 320 e 1440px. Conta e editor continuam fora de analytics, popups e assistente.
- `/conta/anuncios`: listar, criar, salvar, prévia, publicar, retirar, marcar vendida, arquivar e reabrir; guarda de alterações não salvas; fotos reencodadas localmente, capa e remoção. Publicar exige as duas provas existentes e consentimento específico de contato. Nenhuma identidade ou adesão foi criada em nome do piloto.
- Nome editável e foto própria em `/conta`. O menu atualiza após edição. Perfis não recebem acesso administrativo.
- Valor fixo no servidor: 15000 centavos; `pilot_exempt` é o único estado de liberação desta fase. Não há checkout, cartão, webhook ou quitação simulada.
- Migração aditiva `20261103230000_bike_classifieds_pilot.sql`: três tabelas privadas, coluna de avatar, funções e bucket privado de 2MB/WebP. RLS Storage restritiva protege o novo bucket mesmo se existir policy permissiva ampla em outros módulos. Reservas de mídia serializadas, cinco posições e limite diário. Feature flag começa desligada e sem UUID liberado.
- NewsletterSignup e página `/newsletter`: comparação com `540fc1d` sem diferenças. Nenhum contrato do Radar, Sheets, Quiz, fontes editoriais ou envio foi alterado.

### Validações executadas

1. PostgreSQL isolado: migrations anteriores, novas tabelas/RPCs, permissões anon/usuário, IDOR com troca de entitlement, valor não forjável, rascunhos e imagens privados mesmo com policy legada ampla, publicação com prova/consentimento, suspensão/troca de e-mail, estado vendida e disputa simultânea pelo quinto upload. Pass.
2. Restore proporcional: nove definições reais e constraints de chaves/check do backup de 03/11, enum Storage, trigger real de entrega da newsletter, apenas linhas sintéticas. Todas as migrations e contratos passaram. Sem dados pessoais restaurados, TCP, cron ou chamadas externas. Artefato privado `vitale-member-recovery-2026-11-03/classifieds-scoped-restore-result.json`; não é ensaio de recuperação integral da plataforma.
3. Testes direcionados: 29 contratos de projeção SSR com chave pública, mídia WebP/no-store/nosniff, estados erro/vazio, dados e retornos seguros, exclusão do editor do rastreamento. Pass.
4. Playwright local: cinco uploads reais contra mock local, conversão WebP, capa/preview, gate de identidade, preço/isenção, SSR de três destaques + quatro anúncios sintéticos na lista completa, detalhe e Home, header depois do Quiz, telas 320/390/1024/1280/1440, foto/nome, negação ao não convidado. Pass, zero runtime errors.
5. Regressão UI local: adesão/cadastro, login, recuperação, alteração de senha/perfil, convites, descadastro, newsletter independente, prova nos dois canais, comentários e moderação. Pass. Nenhuma mensagem, cobrança ou anúncio real.
6. Lint dos novos módulos, typecheck e `pnpm validate` (66 testes do gate + build SSR). Pass. `git diff --check` sem erros.

As capturas em `artifacts/bike-classifieds/` usam exclusivamente dados e fotos sintéticos. Não representam anúncios existentes nem uma validação real da conta do responsável.

### Dependência para ativação

Inspeção somente leitura no Supabase integrado confirmou a conta piloto única e ausência do novo módulo/bucket. A conexão de consulta usa `postgres` sem superuser e não é membro/proprietária de `storage.objects`. Portanto não executar a migração por essa conexão nem tentar assumir propriedade/elevar privilégios. As policies precisam do fluxo privilegiado oficial de migrações do Lovable; essa é uma operação exclusiva da plataforma, com possível consumo pequeno de créditos. Não enfraquecer RLS para contornar essa restrição.

Após autorização específica para produção: integrar a PR, aplicar a migração exata pelo fluxo privilegiado mantendo flag desligada, conferir histórico e policies, resolver privadamente o UUID de `gpalmerio@gmail.com` (exatamente um usuário não anônimo), liberar apenas esse UUID, publicar o frontend e conferir os URLs normais. Não inserir anúncios, consentimentos ou provas pelo operador. Se a operação privilegiada não puder preservar as policies aprovadas, não ativar/publicar esta funcionalidade.

## Revisão pós-implementação

| Perspectiva | Status | Evidência / limite |
| --- | --- | --- |
| Produto e Estratégia | Pass | Vitrine e conta piloto; R$150 separado da isenção; cobrança e abertura geral adiadas explicitamente |
| CTO e Arquitetura | Pass local | SSR/projeção pública, sessão existente, mídia privada, build e restore real do escopo; ativação exige migração privilegiada |
| IA e Agentes | Pass | Nenhum agente, prompt ou fonte editorial alterado; anúncios não alimentam geração |
| Segurança | Pass local | RLS/ownership, cinco slots concorrentes, identidade e contato por consentimento testados; nenhuma ampliação de papel ou prova forjada |
| UX/UI | Pass | Desktop/mobile e teclado; header após Quiz, foto, rascunho/prévia/feedback, estado vazio honesto |
| CX e Operação | Pass | Retirada/vendida/arquivo reversíveis, preço e isenção claros; negociação direta; plano de rollback sem apagar dados |
| Growth e CRO | Pass | Cards SSR reais, noindex do piloto, captação original preservada byte a byte, sem mudanças de relevância/Radar/afiliados |
| PMO e QA | Pass local | Testes direcionados, regressão e validate concluídos; evidência sintética identificada e release de produção ainda não executado |

Estado: implementação local concluída, pronta para revisão/ativação autorizada. Não confundir os Pass locais com liberação produtiva: migration, entitlement, merge/publicação e teste real do anunciante ainda pendentes. Nenhum crédito Lovable consumido nesta implementação, nenhum pagamento cobrado.

Rollback preparado em `supabase/rollback/20261103230000_bike_classifieds_pilot.sql` (desabilita flag; preserva conteúdo). Para retirar toda a interface, reverter o commit da PR. Não remover migrations aplicadas ou apagar metadados Storage por SQL.

Referências primárias utilizadas: [controle de acesso Storage](https://supabase.com/docs/guides/storage/security/access-control), [URLs assinadas e permissões SELECT](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).


## Release autorizado — em execução

O responsável autorizou integrar, aplicar a migração, restringir a conta convidada e publicar, após a apresentação do escopo/custo/rollback. PR #65 integrada em `25f121a1d9b825c35d43feb6a745b36e2c6cb7c5`. Prévia Netlify passou. O status Vercel falha também no main anterior `b732443` e não é o hosting ativo; não houve desvio para corrigir essa configuração herdada.

Migração solicitada ao fluxo privilegiado oficial do Lovable com flag desligada, arquivo exato SHA256 `a8db95adf6b35349189f1d71925baa8a6b7b45f6f5aad8cd50d94df2536a9c02`, sem mudança de ownership, concessão de novos papéis ou enfraquecimento de RLS. Esta operação exclusiva foi o único uso de agente Lovable autorizado para este release. Verificações/entitlement/publicação serão registrados abaixo após conclusão real.


### Ajuste da sequência de aplicação (mesmo contrato)

O fluxo oficial recusou antes de escrever: não aceita INSERT em storage.buckets nem BEGIN/COMMIT e mantém journal próprio. Custo reportado: 0,9 crédito. Nenhum objeto criado nessa tentativa. Não é necessário mudar o contrato nem ampliar permissões.

Revisão de dependência: Produto/UX/Growth/IA/CX preservam o mesmo resultado e escopo; CTO/Segurança/PMO aprovam separar aplicação de tabelas/RPCs (transação como proprietário legítimo), criação do bucket pelo recurso oficial e aplicação das sete policies pelo fluxo privilegiado. Nenhuma troca de ownership/novo papel é permitida. A flag permanece desligada e o histórico só será marcado concluído após os três passos e conferência das definições. Se uma etapa falhar, não ativar/publicar; os objetos novos permanecem privados/desligados. A migração original continua como contrato de referência e não será reexecutada sobre objetos existentes. O journal gerado pela plataforma será documentado para evitar dupla execução.


### Reconciliação do journal já aplicado

A segunda operação oficial (0,9 crédito) encontrou o journal Drizzle parado em 0005; 0006–0010 já estavam aplicadas fora desse journal. Não refazer o Quiz/grupos: comparação direta dos sete corpos de funções com o código confirmou igualdade normalizando apenas whitespace, configurações/volatilidade/definer e grants esperados, dois índices válidos, colunas/RLS/policy e grants por coluna dos grupos preservados. O histórico anterior de seis linhas foi salvo em artefato privado sem dados pessoais.

Decisão revisada das oito perspectivas: Produto/UX/CX/Growth/IA não mudam resultado nem comportamento; CTO/Segurança/PMO autorizam a reconciliação de cinco registros de histórico correspondentes a SQL já instalado e comprovado. Transação com trava curta e guards contra alteração concorrente do journal e dos sete corpos; não reexecutar DDL antigo. Um PostgreSQL descartável com o migrador oficial Drizzle demonstrou que, após o checkpoint 0010, somente as sete policies novas executam e nenhum DDL antigo é repetido. Não há migração de dados, alteração de funções existentes ou aumento de permissões nessa reconciliação.

O bucket foi criado pelo painel oficial de Storage e configurado por UPDATE autorizado, limitado exclusivamente ao novo bucket, com file_size_limit=2097152, MIME image/webp e public=false. Nenhum objeto/metadata de arquivo existente foi alterado.


### Banco e entitlement concluídos

- Policies aplicadas pelo fluxo oficial, idênticas byte a byte ao trecho aprovado: três permissivas + quatro restritivas. Ownership de storage.objects permanece supabase_storage_admin; nenhum papel elevado.
- Plataforma gerou `drizzle/migrations/0011_member_media_storage_policies.sql`, snapshot 0011 e journal; regeneração automática de tipos Supabase foi inspecionada. Nenhuma alteração de interface ou módulos preservados. Custo do agente nesta aplicação: 1,0 crédito; total das três operações Lovable: 2,8 créditos.
- Migração original registrada uma única vez como 20261103230000 após conferir bucket e sete policies. O journal Drizzle cobre 0011; não reexecutar o DDL da referência.
- Flag ativada só para o UUID resolvido da conta solicitada. Leitura confirmou requested_account_only=true, pilot_entitled=true e other_accounts_denied=true. Valor 15000 centavos. Zero anúncios/mídias criados pelo operador.
- A conta Auth convidada existe; perfil da comunidade e provas de posse ainda não concluídos nesse fluxo. A pessoa conclui a própria adesão/validação na conta. Não houve criação de consentimento/prova pelo operador. O acesso ao piloto não dispensa a verificação para publicar.
- `pnpm validate` repetido após geração de tipos: Pass (66 testes e build SSR). Hash do SQL original preservado; migration 0011 igual ao trecho da referência. Nenhuma diferença nos formulários originais da newsletter.
- Publicação solicitada pelo conector: deployment 1090bc98-60fe-4948-a495-70c26ed2a584. Verificação pública ainda em andamento; não considerar o retorno pending como conclusão.


## Verificação de produção e fechamento

Deployment 1090bc98-60fe-4948-a495-70c26ed2a584 confirmado no domínio público por navegação nova, sem URL especial de preview ou cache-busting:

- `/venda-sua-bike`: título correto, novo item de navegação, Entrar à direita do Quiz, R$150 e isenção piloto, estado vazio real (zero anúncios), CTA para área privada. A leitura pública retornou `{items:[],total:0}` com o módulo ativo.
- `/conta/anuncios`: visitante recebe CTA de login com retorno preservado, robots noindex/nofollow e ausência do assistente na página privada. Nenhuma sessão, senha ou identidade real foi criada para o smoke.
- Home: seção “Venda sua bike aqui” publicada; até três anúncios reais aparecerão automaticamente conforme publicados. Catálogo/Radar e conteúdo já existentes permanecem apresentados.
- `/newsletter`: formulário original de nome/e-mail/aceite e botão Cadastrar e-mail, sem cadastro completo. Screenshot e comparação com 540fc1d confirmados. Nenhuma assinatura de teste foi enviada.
- Storage: grants normais SELECT/INSERT/DELETE de authenticated presentes e SELECT de anon, todos limitados pelas sete policies aprovadas. Ownership continua supabase_storage_admin. Bucket privado/WebP/2MB conferido. Nenhuma foto de teste foi enviada a produção.
- Entitlement: piloto solicitado corresponde ao UUID configurado e todas as outras contas são negadas. Perfil/validações serão concluídos pela própria pessoa, sem consentimentos ou provas forjados. Operador não publicou anúncio.

Capturas públicas reais: `artifacts/bike-classifieds/production-hub.png`, `production-home.png` e `production-newsletter-preserved.png`. Diferem das evidências mock documentadas no mesmo diretório.

### Parecer final das oito perspectivas

| Perspectiva | Status | Conclusão |
| --- | --- | --- |
| Produto e Estratégia | Pass | Piloto individual ativo, preço/isenção claros; cobrança e abertura geral continuam backlog |
| CTO e Arquitetura | Pass | Schema/RPCs, sete policies oficiais, tipos regenerados e SSR publicados; journal reconciliado sem repetir DDL antigo |
| IA e Agentes | Pass | Nenhum fluxo de IA/editorial alterado; 2,8 créditos Lovable usados somente na lacuna operacional exclusiva |
| Segurança | Pass | Bucket privado, ownership preservado, RLS/roles/entitlement conferidos; publicação exige identidade e consentimento |
| UX/UI | Pass | Header/CTA/Home/vitrine públicos conferidos; editor protegido e formulário validado localmente em mobile/desktop |
| CX e Operação | Pass | Acesso piloto disponível, edição/rascunho/vendida/retirada implementados; anunciante fará seu primeiro cadastro de bike real |
| Growth e CRO | Pass | Newsletter original pública preservada; classificados SSR separados do Radar, noindex nesta fase |
| PMO e QA | Pass | PR65 integrada, validate repetido após tipos, restore e teste real do migrador; release e rollback registrados |

Parecer: GO para o piloto autorizado. Entrega publicada e banco ativo. Limite de evidência: CRUD e uploads completos foram exercitados localmente; em produção foram conferidos estrutura/permissões/entitlement/projeção e interface pública/guest. A primeira publicação real depende de ação do anunciante após concluir seu perfil e provas; nenhum conteúdo comercial foi inventado para simular essa etapa. Não há checkout nem cobrança ativa.
