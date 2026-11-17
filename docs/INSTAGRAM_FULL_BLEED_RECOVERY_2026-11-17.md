# Correção do enquadramento do Instagram em 17/11

Classificação estrutural. A reposição implantada em `644feea` aceitava uma foto horizontal em caixa verde em vez de exigir uma imagem que cobrisse 1080 × 1350. A GT20 Pro foi publicada assim às 11h45. A V29 Pro das 17h45 foi reservada com o mesmo erro. A apresentação aprovada é a do Z8 Pro e do FT07, com foto de ponta a ponta, título sobre degradê e bike inteira.

| Perspectiva | Revisão anterior à implementação |
|---|---|
| Produto | Recuperar o enquadramento aprovado na fila e respeitar a nova capa da V29 Pro salva pelo proprietário. |
| Arquitetura | Reusar o renderizador de recorte verificado. Depende de original 4:5 ou com evidência de recorte. |
| IA | A correção não precisa de geração. Original nativo ou foto existente com enquadramento atestado. |
| Segurança | Vincular enquadramento à origem exata. Manter o controle da revisão, dimensões, lease, caminho privado e regras de envio. |
| UX | Validar visualmente 4:5, foto nas bordas, tipografia legível e bike inteira. |
| Operação | Pular enquadramento incompatível e tentar a próxima fonte. Se nenhuma servir, sinalizar revisão no painel. |
| Growth | Manter reserva, legenda, pauta, histórico e rotina de agendamento. |
| QA | Reproduzir com as duas fotos reais, testar pixels e testar fila sem enquadramento válido. Conferir a reserva em produção após autorização. |

Decisão: impedir o fallback com faixas ou JPEG de artigo já legendado no fluxo automático. Aceitar originais 4:5 ou recorte verificado que contenha a bike. O proprietário já salvou uma capa 4:5 para a V29 Pro. A leitura de produção verificou um novo JPEG às 11h51min45s, associado à reserva das 17h45, ainda sem tentativa de envio. A correção não precisa editar essa reserva. A janela pode ficar vazia se não houver recorte seguro nas fontes elegíveis, preservando o padrão visual acordado. A GT20 Pro publicada fica fora da troca, pois esta edição do painel só alcança a fila. Rollback pela versão anterior da função editorial-admin. Sem alterações de cron, RSS, SQL ou permissões.

## Revisão posterior

| Perspectiva | Resultado | Evidência |
|---|---|---|
| Produto | Pass | Reposição aceita somente composição com a foto ocupando a tela inteira. |
| Arquitetura | Pass | Reúso do compositor e da fonte privada. Sem mudança de contratos de publicação. |
| IA | Pass | Reposição sem nova geração. Teste cobre original nativo e recorte atestado. |
| Segurança | Pass | A evidência acompanha a foto exata baixada. O compositor recusa enquadramento inválido e fora dos limites. |
| UX | Pass | Prévia local de 1080 × 1350 renderizada com a mesma cena da GT20 Pro. Inspeção visual confirma foto de ponta a ponta e bike inteira no formato do post. |
| Operação | Pass | Foto horizontal sem recorte verificado não sobe nem reserva. A fila mantém o tratamento de revisão e pode testar outra fonte. |
| Growth | Pass | A reserva das 17h45 continua com a arte noturna que o usuário salvou. |
| QA | Pass local | 49 testes direcionados, Deno check, `pnpm validate` (69 testes, tipos e build) e diff verificado. |

GO local. A implantação exige somente a integração do commit e atualização da Edge Function `editorial-admin`. A aprovação é para os próximos posts. O JPG local da GT20 Pro é uma prévia de recorte derivada da foto do post original e não substitui o post público. Depois do deploy, conferir o horário e o arquivo da V29 Pro pelo Admin e observar a próxima reposição. Fontes sem original 4:5 ou recorte verificado podem deixar a fila sem nova reserva. Rollback pela função anterior. Custo zero de geração de imagens e eventual consumo baixo pela implantação no Lovable.
