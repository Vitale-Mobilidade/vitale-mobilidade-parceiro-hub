# Radar da newsletter — três quedas históricas verificadas

Classificação: estrutural, por envolver seleção de preços do Radar e newsletter. O responsável pediu três bikes com preço inferior ao de outras datas, sem limitar a um fechamento e sem a frase de fechamentos/verificação abaixo dos cards. A autorização de aplicar/publicar a correção permanente da curadoria da newsletter já foi dada nesta thread; esta solicitação refina essa curadoria e sua apresentação, sem novo disparo, schema ou agenda.

## Diagnóstico

A regra atual escolhe apenas o fechamento imediatamente anterior ao período da edição (`sinceDay`). Mesmo havendo diversos preços antigos superiores aos atuais, eles não podem concorrer. Na edição #9 isso resulta só em V29 Pro. O template também imprime uma nota agregada com datas e verificação, em HTML e texto.

## Revisão prévia

| Perspectiva | Impacto | Risco | Dependência | Recomendação |
|---|---|---|---|---|
| Produto | Até três bikes com queda real | Completar três com ofertas sem queda | Histórico e oferta ativa | Prosseguir sem fabricar candidatos |
| CTO | Seleção determinística sem since | Escolher referência futura ou preço sem confirmação atual | Daily verificado e currentPrice atômico | Prosseguir preservando frescor e identidade |
| IA | Não usa modelo para preço | Texto sugerir queda recente sem evidência | Template determinístico | Prosseguir retirando recorte temporal da copy |
| Segurança | Somente template e draft específico | Alterar links ou dados comerciais | Validações e lease/CAS existentes | Prosseguir sem alterar RLS/dados de catálogo |
| UX/UI | Três cards compactos; retirar nota de datas | Perder acesso ao histórico | Link Ver histórico em cada card | Prosseguir mantendo histórico acessível |
| CX | Corrigir #9 já preparada e próximas gerações | Duplicar agenda ou reescrever a edição | Mesmo draft, número e cron | Prosseguir com revisão incremental |
| Growth | Preço anterior e atual verificáveis | Escolher máximo histórico para inflar desconto | Último preço maior, nunca maior pico | Prosseguir com ranking por variação |
| PMO/QA | Testar regra e renderer | Nova regra ficar apenas na prévia local | Patch comparável, validate e deploy autorizado | Prosseguir com prova no dado real e rollback |

## Decisão consolidada

- Cada bike precisa de oferta atual válida e observação verificada há no máximo 24h, com fechamento igual ao preço atual.
- Comparar com o **preço verificado mais recente que seja maior que o atual, em dia anterior ao registro atual**, em todo o histórico disponível. Não selecionar o maior preço histórico e não inventar três quedas quando houver menos de três.
- Ordenar pela variação percentual e manter até três bikes distintas; preservar exclusão editorial de motos, imagens, links e cálculo do badge.
- Retirar somente a nota agregada de fechamentos/verificação abaixo dos cards em HTML e texto; guardar datas na estrutura interna e manter Ver histórico.
- Aplicar à edição #9 de 30/10 às 06h30 por CAS, sem mudar textos, agenda ou disparar agora. A regra definitiva entra no mesmo renderer/curadoria já usados pelo worker.

Trade-off: a comparação pode usar uma data antiga quando esse é o último preço maior verificado, como pedido pelo responsável. Não chamá-la de queda de hoje, oferta inédita ou desconto promocional. Datas ficam auditáveis no payload e no histórico público.

Rollback: reverter o patch para `215c567151aea5e8902a91decb8a322ee72a151f`; restaurar o snapshot da revisão 3 apenas antes de formar campanha e com CAS. Não alterar nem reenviar edições já enviadas.


## Validação local e revisão posterior

48 testes direcionados passaram (regra histórica, renderer, editorial, contrato e disponibilidade), assim como lint do escopo, `git diff --check` e `pnpm validate` com 64 regressões, tipos e build. A prova read-only revalidou fontes inéditas, ofertas atuais, política editorial, HTML e janela de 30/10 às 06h30. Não houve chamada a modelos.

Dados reais selecionados: S20 Pro 7.690 → 6.686, −13,1%, referência de 20/10; V20 Max 7.527 → 6.715, −10,8%, referência de 26/10; Ouxi GT20 Pro 7.589 → 7.070, −6,8%, referência de 18/10. Datas ficam internas; a nota agregada foi retirada de HTML e texto.

| Perspectiva | Status | Evidência |
|---|---|---|
| Produto | Pass | Há três quedas reais elegíveis e nenhum card artificial |
| CTO | Pass | Regra determinística, preço atual confirmado em 24h e referência em dia anterior |
| IA | Pass | Nenhum modelo calcula preço; copy não promete queda de hoje |
| Segurança | Pass | URLs e validações preservadas, nenhum segredo ou schema alterado |
| UX/UI | Pass | Teste verifica três cards e ausência das datas em HTML/texto; links de histórico preservados |
| CX | Pass | Mesmo draft e agenda, revisão incremental e snapshot restaurável |
| Growth | Pass | Última referência maior, sem selecionar pico antigo, ranking calculado |
| PMO/QA | Pass | Testes direcionados e validate; pronto para aplicar e publicar no escopo autorizado |
