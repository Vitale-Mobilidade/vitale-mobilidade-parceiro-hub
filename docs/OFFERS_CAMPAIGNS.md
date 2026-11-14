# Campanhas do grupo de ofertas

## Revisão prévia

Mudança estrutural. Base Git e PR #142 reconciliados em branch isolada; a consulta somente leitura no Supabase do Lovable confirmou que a tabela e a função do rascunho ainda não existem. O PR original permanece intacto.

| Perspectiva | Decisão |
| --- | --- |
| Produto | Manter convite manual; ofertas atuais têm ação e métrica próprias. |
| Arquitetura | Compartilhar catálogo e cálculo do Radar, renderizar no servidor e manter CTA funcional se a leitura falhar. |
| IA | N/A. Dados do catálogo, sem geração. |
| Segurança | Consulta administrativa exige papel admin na Edge Function e SQL restrito a service_role. Coletar somente dimensões agregadas e enumerações conhecidas. |
| UX | Explicar as duas ações. Quando a nova aba for impedida, seguir a oferta pelo link e manter o convite como ação separada na landing. Nenhum atraso ou popup ao visitar. |
| Operação | Preservar destino administrado do WhatsApp, links afiliados diretos e versão pública das tags. |
| Growth | Destaques positivos acima de zero contra o preço típico; separar oferta, CTA e entrada confirmada. Nenhum backfill ou otimização de campanha. |
| QA | Verificar SSR, limites, permissões, dados sem cobertura, abertura e fallback com testes locais; dispositivos reais e tags em ambiente de teste exigem acesso e consentimento verificável. |

Na versão pública anterior, o CTA saiu sem escolha de publicidade. A nova versão inclui uma escolha de publicidade. O Google Ads tem rascunho existente, mas a versão pública continua restrita à medição permitida. Para a Meta, o número informado é de conta de anúncios, não evidência do ID do Pixel. O release desta preparação não inclui produção. Reverter o frontend e desligar a coleta com a flag da Edge se necessário; preservar dados agregados e evitar rollback destrutivo do banco.

O responsável autorizou medição em 14/11/2026 e pediu o texto “Entrar no Grupo de Ofertas” nos cards. A escolha individual de medição de anúncios será discreta e independente do convite, válida na aba e revogável. A tag publicitária registra a abertura do convite iniciada por um clique. A contagem interna distingue botão principal e ofertas por posição e modelo. Quando a segunda aba for bloqueada, o link direto da oferta continua disponível e a visita ao convite não é presumida. O clique que inicia o convite pode aguardar o callback do GTM por até 500 ms; abrir a segunda aba continua síncrono dentro do gesto. O Admin segue limitado aos administradores.

### Resultados da revisão

| Perspectiva | Resultado |
| --- | --- |
| Produto | Pass. Quatro destaques com ofertas vigentes abaixo do típico e catálogo com todos os modelos retornados pelo Radar. |
| Arquitetura | Pass. SSR com a RPC pública existente e CTA preservado se o catálogo falhar. |
| IA | N/A. Sem geração ou agentes no fluxo. |
| Segurança | Pass local. SQL com RLS e funções restritas a service_role. Consentimento ausente, recusado ou revogado não gera o evento publicitário. Links de saída preservam o destino cadastrado e omitem o referrer. |
| UX | Pass local. Chrome desktop e 320×568, abertura das duas abas e fallback com bloqueio. Validação do navegador interno dos apps segue pendente. |
| Operação | Pass local. Relatório pronto para o Admin. Contagem começa após implantação do coletor e do SQL integrado. |
| Growth | Pass local para o evento. Google e Meta exigem prova de disparo no ambiente validado. |
| QA | Pass local. `pnpm validate` com 69 testes, 57 testes direcionados, ensaio PostgreSQL 17 e smoke de browser com destinos simulados. |

O inventário da campanha recebido do Ads Manager registrou 4 anúncios Demand Gen e 1 da Meta com `utm_source=google|meta`, `utm_medium=paid`, `utm_campaign=vitale_grupo_ofertas` e `utm_content=brand_feed`. O relatório distingue canal e campanha. Esse `utm_content` compartilhado não distingue peças.

Para liberar a coleta, aplicar o SQL dedicado no Supabase integrado, implantar `site-analytics` e `editorial-admin` e publicar a landing. Em seguida validar a rota e a leitura do Admin autenticado, inclusive ausência de dados antes do início. O rollback desativa a coleta por frontend/Edge e preserva a tabela e os totais. A versão publicada anterior é o PR #145.

No GTM, validar a ação secundária Google Ads da conta 521-126-5158 com o mesmo ID e label verificados. Restringir o acionador à landing e às posições `^(hero|sticky|carousel|grid)$`. Em Tag Assistant deve haver zero conversões na visita e na recusa, e um único evento por clique que encaminha ao convite após consentimento. O rascunho anterior ainda lista `after_faq`. Verificar a origem de eventos da Meta antes de criar a conversão personalizada. Nenhuma entrada no grupo é inferida, e nenhuma conversão offline foi importada.
