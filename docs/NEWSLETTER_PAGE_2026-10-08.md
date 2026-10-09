# Página de inscrição — 08/10/2026

Classificação estrutural: rota pública, SEO e reutilização da integração newsletter. Autorização nesta conversa: criar, linkar no rodapé e publicar diretamente.

## Revisão prévia
| Perspectiva | Impacto | Risco | Dependência | Recomendação |
| --- | --- | --- | --- | --- |
| Produto | URL compartilhável /newsletter | Dispersar inscrição | Formulário existente | Prosseguir com formulário principal |
| CTO | SSR e metadata de rota | Formulário duplicado | SiteFooter e pageHead | Ocultar formulário repetido só nesta página |
| IA | Conteúdo descritivo acessível | Prometer citações ou inventar fatos | Texto fiel ao serviço | Sem geração ou promessa de ranking |
| Segurança | Opt-in existente | Dados pessoais e abuso | Consentimento, honeypot, backend atual | Reutilizar contrato; sem migration |
| UX | Inscrição mobile | IDs duplicados e competição de CTAs | Design system | Um formulário, rótulos e feedback existentes |
| CX | Canal de cadastro existente | Alterar rotina de envio | newsletter-interest | Preservar frequência e operação |
| Growth | Canonical, OG e sitemap | Card genérico e conteúdo oculto | SSR e imagem própria | Metadata específica, FAQ visível sem FAQ schema |
| PMO | Publicação autorizada | Publicar mudanças alheias | Base main atual e validate | Branch isolada, diff e smoke |

## Decisão consolidada
Criar /newsletter com apresentação clara, formulário atual, benefícios ligados a conteúdo real, perguntas frequentes e privacidade. Link do rodapé para a rota, preservando formulário em outras páginas e âncora antiga. Imagem OG própria 1200x630, canonical, Twitter e WebPage JSON-LD coerentes. Incluir somente a nova rota no sitemap. Sem envio real, mudança de banco ou novos serviços. Aceite: 200 SSR, um formulário, metadata correta, imagem disponível, link no rodapé, testes direcionados e pnpm validate. Rollback: reverter commit desta entrega e republicar; cadastros permanecem intactos.

Trade-off: compartilhar o formulário evita divergência de consentimento e integração; footer precisa de opção explícita para não duplicar campos. Revisão feita pelas oito perspectivas nesta tarefa, sem atribuir pareceres a agentes independentes. SEO/GEO segue fundamentos e conteúdo textual conforme Google Search Central: https://developers.google.com/search/docs/appearance/ai-features .

## Revisão posterior
| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | URL própria, inscrição gratuita e proposta clara |
| CTO | Pass | SSR verificado por HTTP; um formulário; build e typecheck |
| IA | Pass | Texto visível, fatos limitados ao serviço, sem promessa de citações |
| Segurança | Pass | Consentimento e honeypot atuais; nenhuma alteração de secrets, RLS ou dados |
| UX | Pass | Navegador desktop e 390px; sem overflow, rótulos e feedback reutilizados |
| CX | Pass | Mesma newsletter-interest, preferências e rotina; nenhum disparo |
| Growth | Pass | Canonical limpo, OG próprio inspecionado, Twitter, WebPage e sitemap |
| PMO | Pass | 10 testes direcionados, gate pnpm validate, diff --check e smoke SSR |

Gate executado com verify-deps-before-run=false para reutilizar dependências já instaladas; nenhum pacote novo. Publicação autorizada pelo usuário. Risco residual: cache de plataformas sociais e indexação dependem dos respectivos crawlers. Fluxo de gravação preservado e não foi criado cadastro fictício em produção. Rollback por revert do commit e republicação.
