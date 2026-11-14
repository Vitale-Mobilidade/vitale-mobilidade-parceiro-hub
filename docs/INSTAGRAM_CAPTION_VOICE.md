# Voz do especialista nas legendas do Instagram

Mudança estrutural no fluxo editorial do Instagram. O usuário aprovou o tom atual dos artigos e pediu uma legenda que soe como o especialista comentando a bike. A causa foi localizada no seletor de frases: a transcrição confirmava os trechos, enquanto a legenda copiava a prosa do artigo e abria com o resumo.

## Decisão

- Produto e UX: abrir com um gancho sobre a bike ou a escolha e priorizar observações do teste, limitações e veredito em parágrafos curtos.
- Arquitetura e operação: reusar os blocos do artigo e seus trechos literais no vídeo correspondente. A composição continua local e automática, inclusive sem saldo de IA.
- IA editorial e Growth: usar o acervo como referência de registro, preservando dados, condições, diferenças entre ficha e teste e o rodapé solicitado.
- Segurança e QA: tratar a transcrição apenas como fonte de evidência e sinal de linguagem. Validar com o exemplo de novembro da FT07 e verificar limites e o contrato do agendador.

Leitura do Hub encontrou 167 transcrições com mais de 200 caracteres. “A gente” ocorre em 165, “pra” em 158, “eu achei” em 37, “na prática” em 33 e “vale a pena” em 28. Amostras de reviews, comparativos e testes mostraram expressões de fala direta junto com cacoetes e chamadas comerciais. A legenda adota frases diretas e pontes curtas, sem repetir cacoetes ou incorporar CTAs dos vídeos. O artigo, os posts publicados e as reservas com aprovação vinculada à impressão digital permanecem com suas versões originais. Rollback por reimplantação do commit anterior da função editorial-admin.

## Revisão após implementação

| Perspectiva | Status | Evidência |
| --- | --- | --- |
| Produto | Pass | Tom de fala separado do artigo e rodapé solicitado. |
| Arquitetura | Pass | Compositor existente, com o mesmo contrato. |
| IA editorial | Pass | Padrões baseados no corpus; amostras de saída preservam condições e fatos. |
| Segurança | Pass | Nenhum serviço externo recebe a transcrição; revisão exata dos agendados preservada. |
| UX | Pass | Observação de uso vem cedo, seguida de ressalvas e do veredito, com parágrafos curtos. |
| Operação | Pass | Nenhuma chamada paga, agendamento ou geração de imagem adicional. |
| Growth | Pass | Nenhuma reedição de publicados, oferta vigente fabricada ou mudança na assinatura. |
| QA | Pass | Teste dedicado à FT07, teste de evidência e reposição e validação do projeto. |

Validação offline incluiu cinco pautas reais do Hub, reconstruindo as entradas com resumo e blocos confirmados na transcrição. O compositor adapta construções recorrentes e exige evidência como antes. Pode preservar trechos mais formais quando a construção ainda não é reconhecida. O deploy afeta apenas as próximas legendas preparadas pela função.
