# Limites visíveis no formulário do anúncio

Pedido de04/11: evitar bloqueio inesperado mostrando contagem atual e mínimo/máximo nos campos limitados. Mudança relevante de UX, sem schema, integração ou regras novas. Reutiliza revisão de UX/UI da Vitale aplicada nesta conversa.

## Revisão prévia

| Perspectiva | Impacto, risco e decisão |
|---|---|
| Produto | Mostrar requisitos antes de continuar; manter rascunho e ordem1→2→3. Prosseguir. |
| Arquitetura | Componente visual de contador e metadados existentes; mesmo estado e persistência. Prosseguir sem backend. |
| Segurança | Nenhuma permissão, secret ou gate modificado. Preservar. |
| UX/UI | Atualização durante digitação, restantes/limite e vínculo acessível ao campo, sem alertas por tecla. Prosseguir com smoke mobile. |
| CX | Distinguir título opcional com geração por marca/modelo de mínimos obrigatórios; número mostra faixa, não contador de caracteres. Prosseguir. |
| Growth | Transparência das restrições sem afrouxar critérios ou ampliar abertura pública. Prosseguir. |
| IA | N/A sem geração ou agentes. |
| QA | Testar contagem, mínimo de descrição, máximo e espaços, avanço e layout; validate e lint. Prosseguir condicionado. |

Decisão: todos os seis textos limitados do editor mostram atual/máximo e regra mínima; título vazio continua permitido, título próprio exige6. Contagem de máximo segue maxlength/JavaScript e mínimo usa trim, como a validação atual. Campos numéricos mostram suas faixas. Não alterar validação nem preencher descrição pelo usuário. Rollback pelo frontend. Sem dados reais, cobrança ou código de identidade nos testes.

## Revisão posterior

| Perspectiva | Resultado |
|---|---|
| Produto | Pass: limites informados durante preenchimento, sem alteração das exigências. |
| Arquitetura | Pass: contador puro e sem novos efeitos, writers ou chamadas; mesmo estado da ficha. |
| Segurança | Pass: sem grants/secrets/dados reais ou mudanças de acesso. |
| UX/UI | Pass local: seis contadores com atual/máximo, mínimo/restantes e limite atingido; descrição vinculada por aria-describedby, sem live region a cada tecla. |
| CX | Pass: título opcional explicado e faixas de preço/km/ano visíveis; espaços extras não satisfazem o mínimo. |
| Growth | Pass: avanço/aceites preservados e restrições transparentes antes do CTA; newsletter e abertura pública intactas. |
| IA | N/A sem modelo. |
| QA | Pass local: Playwright testa os seis contadores,5/4.000 e15 restantes, espaços, máximo1.000 e regressão de wizard/checkout; lint e pnpm validate (66 contratos, types e builds). |

Regra de UX para próximas evoluções: todo campo com restrição deve informar a regra antes de submeter; textos usam contador atual/máximo e mínimo pertinente, números usam faixa e unidade. Este corte aplica a regra ao formulário de anúncio, sem modificar a newsletter ou outro cadastro.

Evidências locais sintéticas em outputs/vitale-field-counters-2026-11-04; nenhuma cobrança/envio real. Rollback pelo frontend, sem alteração de dados ou regra de validação. Publicação autorizada neste escopo; conferência no domínio próprio após merge/deploy.

## Publicação

PR83 integrada em6a7aea32734f80d9c6fba80db0a4f3c73230cb53; deployment441fa157-bf1d-4836-a2f7-b39f00675fc0 no mesmo Lovable. Bundle público conta_.anuncios-COSgPssf.js conferido no domínio próprio com contador, mensagens de mínimo/restantes e máximo atingido, preservando o CTA do pagamento. Preview Netlify e headers passaram; Pages/Redirect skipped; Vercel mantém falha de baseline fora da hospedagem operacional.

Conferência visual mobile: contadores quebram linha sem overflow, nomes de campos estáveis e faixas numéricas visíveis. Artefato local sintético field-counters-mobile.png. Nenhuma atualização automática da aba do responsável para evitar perda de dados não salvos. Produto, Arquitetura, Segurança, UX/UI, CX, Growth e QA: Pass no escopo publicado; IA: N/A. Sem alteração de backend/validação, dados de anúncio, pagamento, newsletter ou abertura pública.
