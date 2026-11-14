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

O CTA segue sem aviso de publicidade conforme a decisão anterior. O site não coleta uma escolha atual de marketing. O Google Ads tem rascunho existente, mas a versão pública continua restrita à medição permitida. Para a Meta, o número informado é de conta de anúncios, não evidência do ID do Pixel. O release desta preparação não inclui produção. Reverter o frontend e desligar a coleta com a flag da Edge se necessário; preservar dados agregados e evitar rollback destrutivo do banco.

O responsável autorizou medição em 14/11/2026 e pediu o texto “Entrar no Grupo de Ofertas” nos cards. A escolha individual de medição de anúncios será discreta e independente do convite, válida na aba e revogável. A tag publicitária registra a abertura do convite iniciada por um clique. A contagem interna distingue botão principal e ofertas por posição e modelo. Quando a segunda aba for bloqueada, o link direto da oferta continua disponível e a visita ao convite não é presumida. O clique que inicia o convite pode aguardar o callback do GTM por até 500 ms; abrir a segunda aba continua síncrono dentro do gesto. O Admin segue limitado aos administradores.
