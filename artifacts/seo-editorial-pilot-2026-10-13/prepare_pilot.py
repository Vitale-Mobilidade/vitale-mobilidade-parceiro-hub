"""Prepare reviewable local editorial edits. Never connects to production."""
import copy
import json
import difflib
import re
import hashlib
from pathlib import Path

BASE = Path(__file__).parent
rows = json.loads((BASE / "source-backup.local").read_text())["rows"]
selected = json.loads((BASE / "selected-slugs.json").read_text())

edits = {
selected[0]: {
 "title": "Mangosteen FT03 vale a pena? Subidas, autonomia e uso sem garupa",
 "seo_title": "Mangosteen FT03 vale a pena? Subidas, bateria e garupa",
 "meta_description": "A FT03 é para uma pessoa. Veja a resposta em subida com 76 kg, a estimativa de autonomia da bateria de 18 Ah e as limitações do painel.",
 "summary": "A Mangosteen FT03 faz sentido para quem anda sozinho e procura resposta do motor em subidas. No percurso observado, um condutor de 76 kg subiu sem usar todo o acelerador, mesmo com a bateria abaixo da carga total. A bateria de 48 V e 18 Ah tem estimativa de 50 a 60 km em condução moderada; essa faixa não foi medida até o fim da carga. Garupa, atraso na leitura da velocidade e buzina baixa são pontos que mudam a escolha.",
 "block_heading": "Como interpretar a resposta em subida",
 "new_heading": "A Mangosteen FT03 sobe ladeira? O resultado com 76 kg",
 "new_text": "A FT03 avançou em uma subida longa e íngreme com um condutor de **76 kg**, sem exigir aceleração total e com a bateria abaixo da carga cheia. Essas condições ajudam a entender o resultado: a resposta foi favorável naquele percurso, sem que o motor precisasse receber o comando máximo.\n\nA observação não determina a inclinação máxima que a FT03 vence nem sua velocidade em qualquer subida. Carga transportada, relevo e nível de bateria mudam a resposta. Para quem enfrenta ladeiras no uso diário, vale considerar o resultado junto da proposta de uso individual e da possibilidade de recarga ao longo da rotina.",
},
selected[1]: {
 "seo_title": "V9 Max: 15,6 Ah, 20 Ah ou duas baterias?",
 "meta_description": "Compare V9 Max de 15,6 Ah, 20 Ah e V9 Max S com duas baterias de 20 Ah. Entenda as estimativas de alcance e quando a capacidade extra faz sentido.",
 "summary": "A escolha entre V9 Max e V9 Max S começa pela bateria: uma de 15,6 Ah, uma de 20 Ah ou duas de 20 Ah. As estimativas apresentadas são de 40 a 50 km, 50 a 60 km e 100 a 120 km, respectivamente, em condução moderada. São referências de alcance, não resultados garantidos de um teste de descarga. A capacidade extra importa quando a distância entre recargas justifica o custo; o nome V9 Max sozinho não identifica a configuração da oferta.",
 "block_heading": "Como comparar os preços sem perder de vista a oferta",
 "new_heading": "Quando vale pagar por uma segunda bateria?",
 "new_text": "A segunda bateria faz mais sentido para quem precisa percorrer distâncias maiores entre recargas. Se os deslocamentos são curtos, a capacidade adicional pode pesar menos na decisão que o preço da bicicleta. Para uma rotina mais longa, compare a distância necessária com as faixas de alcance estimadas, sem planejar o dia pelo limite superior.\n\nAntes de comparar ofertas, identifique **a quantidade e a capacidade das baterias incluídas**. Uma V9 Max de 15,6 Ah, uma de 20 Ah e uma V9 Max S com duas de 20 Ah não oferecem a mesma reserva de energia. Os preços variam com o momento e a condição de pagamento; use a oferta atual no Radar e compare o valor total, em vez de tomar o preço de um mês anterior como referência de compra.",
},
selected[2]: {
 "seo_title": "V20 Pro ou V8 Ultra: motor, bateria e banco removível",
 "meta_description": "Compare Inow V20 Pro e Ouxi V8 Ultra: banco traseiro removível, baterias de 15,6 e 15 Ah, resposta do motor e uso com carga ou garupa.",
 "summary": "Inow V20 Pro e Ouxi V8 Ultra têm banco traseiro removível e motor declarado de 1.000 W. A V20 Pro combina bateria de 48 V e 15,6 Ah com suspensão traseira única; a V8 Ultra usa 48 V e 15 Ah, suspensão traseira dupla e foi percebida como mais forte na resposta. As duas permitem adaptar a traseira para carga. Para levar um adulto com frequência, a posição do banco bipartido merece mais peso na decisão do que a simples indicação de dois lugares.",
 "block_heading": "A versatilidade é parecida; o motivo para pagar mais precisa ser claro",
 "new_heading": "V20 Pro ou V8 Ultra: o que muda além do banco removível?",
 "new_text": "As duas oferecem **traseira adaptável**: a almofada do banco bipartido pode ser retirada para abrir espaço para carga ou outros acessórios. Essa versatilidade é compartilhada, portanto não resolve a comparação sozinha.\n\nA V8 Ultra foi percebida como mais forte na resposta e tem suspensão traseira dupla, enquanto a V20 Pro usa uma unidade traseira. O conforto foi considerado parecido. Se o objetivo principal é instalar um baú e os equipamentos atendem à mesma necessidade, o preço atual ganha peso; se a resposta do motor e os acessórios adicionais da unidade fazem diferença no uso, a V8 Ultra merece atenção. Compare também a forma de pagamento: um valor no Pix e outro parcelado não mostram, por si só, a diferença real de custo.",
},
selected[3]: {
 "title": "Ouxi GT2000 vale a pena? Autonomia, subidas e terrenos de uso",
 "seo_title": "Ouxi GT2000 vale a pena? Autonomia, subidas e terreno",
 "meta_description": "Veja para quem a Ouxi GT2000 faz sentido: uso individual, bateria de 30 Ah, consumo observado em cerca de 30 km e limites em terra e asfalto.",
 "summary": "A Ouxi GT2000 faz sentido para uma pessoa que enfrenta subidas, asfalto ruim e trechos de terra batida. A bateria declarada é de 48 V e 30 Ah. Depois de cerca de 30 km acumulados, em modo 5, com bastante acelerador e pouco pedal, havia indicação aproximada de 60% de carga. Essa leitura não mede a autonomia até a bateria acabar. O modelo não atende à necessidade de garupa nem tem proposta de trilha agressiva com pedras e raízes em velocidade.",
 "block_heading": "Autonomia: o jeito de acelerar muda a conta",
 "new_heading": "Qual é a autonomia da GT2000? O que os 30 km indicam",
 "new_text": "A GT2000 tem bateria declarada de **48 V e 30 Ah**. Em cerca de 30 km acumulados, usando modo 5, pouco pedal e bastante acelerador, a indicação de carga estava em aproximadamente 60%. O condutor relatou 76 kg. É uma observação de consumo naquele uso, não uma medição de descarga completa.\n\nNão se pode transformar 30 km e 60% no painel em uma autonomia exata: a leitura de carga é aproximada e o consumo muda ao longo do percurso. As faixas apresentadas são estimativas de **50 a 60 km em condução intensa** e **60 a 80 km em ritmo moderado**. A escolha deve considerar a distância entre recargas e o modo de conduzir, sem presumir que a bateria sempre chegará ao limite superior.\n\nA bateria é removível e o carregador é portátil e bivolt. Para quem não tem tomada perto da bike, retirar a bateria facilita a recarga sem mover a bicicleta inteira.",
},
selected[4]: {
 "seo_title": "V40 Pro ou V9 Max: bateria de 18 Ah ou 15,6 Ah?",
 "meta_description": "Compare Inow V40 Pro e V9 Max: baterias de 18 e 15,6 Ah, uso com garupa, autonomia estimada e a diferença de preço que orienta a compra.",
 "summary": "A Inow V40 Pro se destaca pela bateria de 48 V e 18 Ah; a V9 Max usa 48 V e 15,6 Ah. Ambas têm motor declarado de 1.000 W, banco alongado e capacidade informada de até 150 kg. Com preços próximos e configurações equivalentes, a bateria maior favorece a V40 Pro. A V9 Max ganha espaço quando a diferença de preço compensa a menor capacidade para o trajeto previsto. As faixas de autonomia são estimativas, e o painel e os pneus podem mudar entre unidades.",
 "block_heading": "Quando a diferença de preço compensa?",
 "new_heading": "Qual escolher: V40 Pro ou V9 Max?",
 "new_text": "Com configurações equivalentes e preços próximos, **a bateria de 18 Ah da V40 Pro** é a diferença concreta a favor dela. A V9 Max tem 15,6 Ah e passa a fazer mais sentido quando sua oferta custa menos e a distância entre recargas cabe na rotina. As duas têm motor declarado de 1.000 W e banco alongado; esses pontos em comum não dão uma vantagem decisiva a uma delas.\n\nNão há um desconto universal que torne a V9 Max a melhor compra. O peso da diferença de preço depende do orçamento e de quanto a capacidade adicional da V40 Pro será usada. Compare ofertas atuais no Radar, com bateria, painel, pneus e acessórios equivalentes. Se levar garupa e percorrer distâncias maiores são prioridades, a capacidade de 18 Ah merece mais atenção; se a V9 Max atende ao percurso e custa menos, ela continua na comparação.",
},
selected[5]: {
 "title": "V9 Max: o que um teste de 19 km revela sobre o consumo da bateria",
 "seo_title": "V9 Max: o que o teste de 19 km mostra sobre a bateria?",
 "meta_description": "A V9 Max percorreu 19 km no modo 5 com uso frequente do acelerador. Entenda a carga restante no painel e por que isso não mede a autonomia total.",
 "summary": "A V9 Max completou 19 km no modo mais forte e com uso frequente do acelerador, terminando com a indicação de bateria um pouco abaixo da metade. Esse resultado mostra o consumo observado naquele deslocamento. Não demonstra uma autonomia total de 38 ou 40 km: a bateria não foi esgotada e sua barra de carga varia durante o uso. Para planejar ida e volta, o resultado precisa ser lido junto do relevo, da ajuda nos pedais e das oportunidades de recarga.",
 "block_heading": "O que os 19 km permitem concluir",
 "new_heading": "19 km no modo 5: resultado observado e limite da medição",
 "new_text": "O resultado concreto foi **19 km percorridos no modo mais forte**, com uso frequente do acelerador e indicação de bateria um pouco abaixo da metade ao final. A V9 Max completou o trajeto sem esgotar a carga.\n\nA projeção de 35 a 40 km feita a partir dessa indicação não é um segundo resultado medido. A bateria não foi levada até acabar, e a barra do painel varia durante acelerações e subidas. Por isso, **não é correto dobrar os 19 km e apresentar 38 km como autonomia comprovada**.\n\nEsse deslocamento também não representa assistência leve: houve pedalada, mas a bicicleta permaneceu no modo 5 e usou bastante o acelerador. Para um percurso diário parecido, a observação ajuda a planejar a recarga; a margem para a volta deve considerar as condições reais do trajeto, em vez de assumir que a carga restante rende a mesma distância.",
},
selected[6]: {
 "seo_title": "Bike para duas pessoas: V8 Pro, V40 Pro ou V9 Max?",
 "meta_description": "Compare V8 Pro, V40 Pro e V9 Max para garupa: limite combinado de 150 kg, baterias, conforto observado e o que muda na escolha.",
 "summary": "Para levar duas pessoas, V8 Pro, V40 Pro e V9 Max oferecem banco alongado e limite informado de 150 kg para a carga combinada. A V40 Pro tem a maior bateria declarada do trio, de 48 V e 18 Ah; a V9 Max usa 15,6 Ah e a V8 Pro, 15 Ah. No conforto percebido, V40 Pro e V9 Max tiveram uma ligeira vantagem; a V8 Pro foi percebida como mais forte na resposta. A escolha começa pela carga e pelo trajeto, depois passa pelo preço da unidade disponível.",
 "block_heading": "Qual das três faz mais sentido para você?",
 "new_heading": "Qual bike escolher para levar garupa?",
 "new_text": "A **V40 Pro** merece atenção quando a distância entre recargas é a prioridade: sua bateria de 18 Ah é a maior das três. A **V9 Max**, com 15,6 Ah, teve conforto percebido próximo ao da V40 Pro e entra na decisão conforme a oferta atual. A **V8 Pro**, com 15 Ah, foi percebida como um pouco mais forte na resposta, enquanto sua suspensão original ficou ligeiramente atrás das outras duas na avaliação de conforto.\n\nSão diferenças de especificação e de percepção de uso, não uma classificação universal. As três têm motor declarado de 1.000 W e limite informado de 150 kg para a carga combinada. Some os pesos de condutor, passageiro e objetos; depois considere a distância prevista e o piso do trajeto. As estimativas de autonomia em condução moderada não garantem o mesmo alcance com garupa.\n\nO preço atual pode mudar a escolha. Compare a configuração efetivamente vendida no Radar, sem presumir que a V9 Max seja sempre mais barata ou que os acessórios de uma unidade acompanhem todas as outras.",
},
selected[7]: {
 "seo_title": "Ouxi GT20 Pro ou GT2000: garupa ou bateria de 30 Ah?",
 "meta_description": "A GT20 Pro leva garupa; a GT2000 é individual e tem bateria de 30 Ah. Compare uso, capacidade de bateria, pneus e limites do terreno.",
 "summary": "A primeira diferença entre Ouxi GT20 Pro e Ouxi GT2000 é o uso: a GT20 Pro tem banco alongado para garupa; a GT2000 é individual. As baterias declaradas são de 48 V e 15 Ah na GT20 Pro e de 48 V e 30 Ah na GT2000. A capacidade dobrada não garante o dobro de autonomia em todo trajeto. As duas combinam pneus cravados com uma proposta para ruas ruins e terra batida, sem equivaler a bicicletas para trilhas agressivas.",
 "block_heading": "Garupa ou uso individual: comece por essa decisão",
 "new_heading": "Qual leva garupa: GT20 Pro ou GT2000?",
 "new_text": "Entre estas duas, **a Ouxi GT20 Pro é a opção para levar uma segunda pessoa**: tem banco alongado e apoio para os pés do passageiro. A GT2000 foi concebida para uma pessoa e não atende à mesma necessidade de transporte. Se levar garupa faz parte da rotina, essa diferença vem antes da comparação de potência e bateria.\n\nPara uso individual, a GT2000 oferece a maior capacidade declarada: 48 V e 30 Ah, contra 48 V e 15 Ah da GT20 Pro. As duas têm motor nominal de 1.000 W. A bateria maior amplia a reserva disponível, mas o alcance depende também do terreno, da carga e da condução. Portanto, escolher a GT2000 pela bateria não significa contar com autonomia dobrada em qualquer percurso.",
},
selected[8]: {
 "seo_title": "Bike elétrica para delivery: bateria, carga e recarga",
 "meta_description": "Compare cinco bikes para delivery: BW1, X50 Action Pro, V20 Pro, FT03 e V35. Veja bateria, baú, uso individual e planejamento da recarga.",
 "summary": "Para delivery, escolha pela distância entre recargas e pela forma de transportar as entregas. BW1 e X50 Action Pro usam uma bateria de maior capacidade nominal; a V20 Pro tem almofada traseira removível para abrir espaço para baú; a FT03 é individual; e a V35 permite trabalhar com uma ou duas baterias. A segunda bateria faz mais diferença quando não há uma pausa confiável para carregar. As faixas de alcance são estimativas, não quilômetros garantidos por turno.",
 "block_heading": "Como fechar a escolha para o seu trabalho",
 "new_heading": "Qual bike faz mais sentido para o seu turno de delivery?",
 "new_text": "Com uma pausa real para recarga, **BW1 e X50 Action Pro** entram pela bateria única de maior capacidade nominal: 20 Ah e 19,2 Ah, respectivamente, ambas de 48 V. A X50 Action Pro também tem suporte traseiro para carga. A **V20 Pro**, com 15,6 Ah, permite retirar a almofada traseira para abrir espaço para baú; a fixação precisa corresponder à carga que será transportada.\n\nA **FT03**, de 18 Ah, é uma opção de uso individual. Já a **V35** traz duas baterias de 48 V e 15,6 Ah e funciona também com apenas uma delas. Essa flexibilidade merece mais peso quando não existe uma pausa confiável para recarregar entre os turnos. A capacidade nominal ajuda na comparação, mas não estabelece quantos quilômetros cada modelo fará durante o trabalho.\n\nComece pela distância entre oportunidades de recarga. Depois, escolha onde e como as entregas serão levadas. Se a mesma bike precisa transportar um passageiro fora do expediente, inclua essa necessidade na decisão: a FT03 não oferece garupa, e o banco bipartido da V20 Pro exige atenção à posição do passageiro.",
},
selected[9]: {
 "seo_title": "UFOFAST VL20 vale a pena? Garupa, bateria e limitações",
 "meta_description": "Veja para quem a VL20 vale a pena: banco para duas pessoas, bagageiro dianteiro, bateria de 15,6 Ah e limites do painel, suspensão e para-lama.",
 "summary": "A UFOFAST VL20 faz sentido para quem precisa levar duas pessoas e pequenos objetos, com banco alongado, bagageiro dianteiro e vários acessórios instalados. O limite informado é de 150 kg de carga combinada; a bateria de 48 V e 15,6 Ah tem estimativa de 40 a 50 km em condução moderada. Na unidade usada, o para-lama traseiro deixou água atingir as costas após a chuva, o painel foi difícil de ler de dia e a suspensão era de entrada. Esses detalhes pesam conforme o piso e a rotina.",
 "block_heading": "O para-lama traseiro precisa de atenção no piso molhado",
 "new_heading": "VL20 no piso molhado: o que aconteceu com o para-lama?",
 "new_text": "Na unidade usada, **o para-lama traseiro não cobriu todo o pneu**. Depois da chuva, a roda lançou água nas costas e na mochila. Para quem usa a bike para trabalhar ou precisa chegar sem respingos, essa foi uma limitação concreta, mesmo com o componente instalado.\n\nA questão está na extensão do para-lama, não na ausência dele. O ajuste da posição ou a instalação de um extensor foram apontados como possibilidades para aumentar a cobertura. Esse resultado pertence à configuração observada e deve entrar na comparação de quem percorre piso molhado com frequência, junto do bagageiro dianteiro e da necessidade de levar garupa.",
},
}

def norm(s):
    return " ".join(s.split()).casefold()

proposals = []
evidence = []
anchors = [
 ["76 kg", "não tô acelerando tudo", "bateria de 18"],
 ["a de duas é a V9 Max S", "preços flutuarem", "quanto mais rápido"],
 ["V20 Pro versus V8 Ultra", "suspensão dupla traseira", "ela anda muito"],
 ["uns 60%", "uns 30 km", "tenho 76 kg"],
 ["a V40 Pro ganha", "mais barata", "150 kg"],
 ["foram 19 km", "metadinha da bateria", "não se apegue muito"],
 ["ligeira vantagem em conforto", "bateria maior", "150 kg"],
 ["duas pessoas", "48 V e 30", "48 V e 15"],
 ["duas baterias", "19.2", "20 A", "almofadinha"],
 ["não tá cobrindo", "extensor", "150 kg"],
]
def source_window(transcript, anchor):
    pattern = r"\s+".join(re.escape(part) for part in anchor.split())
    match = re.search(pattern, transcript, re.IGNORECASE)
    if not match:
        raise ValueError(f"Source anchor missing: {anchor}")
    return transcript[max(0, match.start()-120): min(len(transcript), match.end()+600)]
reviews = ["# Dez artigos — propostas locais", "", "URLs e datas de publicação serão preservadas. Nenhuma atualização produtiva foi executada.", ""]
for slug in selected:
    old = next(a for a in rows if a["slug"] == slug)
    e = edits[slug]
    fields = {k: e[k] for k in ["title", "summary", "seo_title", "meta_description"] if k in e}
    blocks = copy.deepcopy(old["blocks"])
    index = next(i for i,b in enumerate(blocks) if b.get("heading") == e["block_heading"])
    blocks[index]["heading"] = e["new_heading"]
    blocks[index]["text"] = e["new_text"]
    source_quotes = [source_window(old["transcript"], anchor) for anchor in anchors[selected.index(slug)]]
    # Evidence stays private; visible prose must never expose transcript excerpts.
    fields["summary_source_excerpt"] = source_quotes[0]
    if slug in [selected[3], selected[8]]:
        blocks[index]["sourceExcerpt"] = source_quotes[0]
    fields["blocks"] = blocks
    if slug == selected[7]:
        battery = next(b for b in blocks if b.get("heading") == "A bateria muda o alcance esperado, mas não garante uma distância por carga")
        battery["heading"] = "15 Ah ou 30 Ah: o que a bateria muda na comparação?"
        battery["text"] = "As duas têm motor nominal declarado de **1.000 W**. A GT20 Pro usa bateria de 48 V e 15 Ah; a GT2000 usa 48 V e 30 Ah. Como a tensão declarada é a mesma, a GT2000 tem o dobro da capacidade em ampère-hora. Isso amplia a reserva de energia disponível, mas **não comprova autonomia dobrada**.\n\nPeso transportado, relevo e intensidade de aceleração mudam o consumo. Por isso, compare a capacidade e a necessidade de recarga junto da diferença de uso: a GT20 Pro oferece garupa, enquanto a GT2000 é individual. A bateria maior pode ser importante para quem anda sozinho por distâncias maiores; ela não substitui o banco para duas pessoas de quem precisa transportar um passageiro.\n\nO pico declarado de aproximadamente 2.000 W da GT2000 também não é potência contínua. Não use esse número como se o motor trabalhasse o tempo todo nessa condição."
    fields["og_title"] = fields.get("title", old["title"])
    fields["og_description"] = fields["meta_description"]
    proposals.append({"id": old["id"], "slug": slug, "expectedRevision": old["revision"], "fields": fields,
        "videoId": old["video_id"], "sourceMd5": hashlib.md5(old["transcript"].encode()).hexdigest(), "changedBlockIndex": index})
    evidence.append({"slug":slug,"videoId":old["video_id"],"sourceQuotes":source_quotes,"changedBlockIndex":index})
    reviews += [f"## {fields.get('title',old['title'])}", "", f"URL: https://vitalemobilidade.com/conteudos/{slug}",
        f"Vídeo: {old['youtube_url']}", "", "### Abertura atual", "", old["summary"], "", "### Nova abertura", "", fields["summary"],
        "", "### Passagem atual", "", old["blocks"][index]["heading"], "", old["blocks"][index]["text"],
        "", "### Nova passagem", "", e["new_heading"], "", e["new_text"], "", "### Metadata", "",
        f"Título SEO: {fields['seo_title']}", f"Descrição: {fields['meta_description']}", ""]
    if slug == selected[7]:
        prior = next(b for b in old["blocks"] if b.get("heading") == "A bateria muda o alcance esperado, mas não garante uma distância por carga")
        reviews += ["### Segunda passagem: capacidade de bateria", "", "Antes:", "", prior["text"], "", "Depois:", "", battery["text"], "",
            "A faixa estimada de alcance foi retirada desta passagem: há estimativas diferentes em vídeos distintos da GT2000, sem teste comparável de descarga completa. A capacidade declarada é mantida; não se fabrica uma autonomia consensual.", ""]

(BASE / "proposal.local").write_text(json.dumps(proposals,ensure_ascii=False,indent=2))
(BASE / "evidence.local").write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
(BASE / "REVIEW.md").write_text("\n".join(reviews))
print(f"Prepared {len(proposals)} proposals. No external writes.")
