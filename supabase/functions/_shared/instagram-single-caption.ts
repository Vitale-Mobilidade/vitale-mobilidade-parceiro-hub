export const INSTAGRAM_CAPTION_END =
  "Saiba mais no link da Bio\n\nAssista os vídeos completos do canal Vitale Mobilidade no Youtube";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
function clean(s: string) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\*\*|__|\x60/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const unsafe =
  /link da bio|assist[ae] os v[ií]deos completos|\br\s*\$|m[oó]dulo de ofertas|(?:pix|parcelamento).{0,100}\b(?:hoje|agora|vigente)\b/i;
function sentences(s: string) {
  return clean(s)
    .split(/(?<=[.!?])\s+(?=[\p{Lu}])/u)
    .filter((s) => !unsafe.test(s) && s.length >= 34 && s.length <= 500);
}
// Use constructions seen in the channel without copying speech fillers or changing test facts.
const spokenPhrases: [RegExp, string][] = [
  [
    /^(.+?) entra no contexto da Black Friday como uma opção voltada principalmente a quem pretende rodar bastante e alternar entre passageiro, carga e uso individual\./i,
    "$1 na Black Friday chama atenção pra quem roda bastante e quer alternar entre levar garupa, carregar coisas e pedalar sozinho.",
  ],
  [
    /^Dentro de uma campanha de Black Friday, (.+?) se destaca menos por um componente isolado e mais pela combinação de (.+?)\.$/i,
    "Pra mim, o que faz $1 valer uma olhada é juntar $2.",
  ],
  [
    /^É uma proposta especialmente coerente para (.+?), desde que (.+?) seja compatível com as condições reais de uso\.$/i,
    "Faz sentido pra $1, se $2 der conta do seu trajeto.",
  ],
  [
    /^A traseira adaptável é o segundo grande diferencial da (.+?)\.$/i,
    "Outro ponto que vale olhar na $1 é a traseira.",
  ],
  [/\bna janela comercial observada em\b/gi, "com o preço de"],
  [
    /\b(?:apareceu|entrou) em ([^,.]+?) em um patamar comercial consideravelmente inferior ao praticado pouco tempo antes\b/gi,
    "apareceu mais barata em $1 do que pouco tempo antes",
  ],
  [/\bpatamar comercial\b/gi, "preço"],
  [
    /^O desenho combina melhor com terra, cascalho e superfícies acidentadas do que com uma rotina inteiramente pavimentada\.$/i,
    "Esse pneu faz mais sentido na terra, no cascalho ou no piso ruim do que pra rodar só no asfalto.",
  ],
  [
    /^A oportunidade observada em [^.!?]+? é mais coerente para quem enfrenta/i,
    "Eu olharia pra ela se você encara",
  ],
  [
    /^Em uma subida forte, o painel indicou/i,
    "Na subida forte, o painel marcou",
  ],
  [
    /^No trecho mais exigente, a leitura variou entre/i,
    "No trecho mais puxado, marcou entre",
  ],
  [/\bcom ajuda leve nos pedais\b/gi, "com uma ajudinha no pedal"],
  [
    /^O condutor tinha (.+?), e a bateria não estava completamente carregada/i,
    "Quem pilotou tinha $1 e a bateria não estava cheia",
  ],
  [/^Para uma rotina inteiramente pavimentada/i, "Se você só roda no asfalto"],
  [
    /^Em ambientes muito claros, isso dificulta consultar rapidamente/i,
    "Com muita luz, fica difícil bater o olho e ver",
  ],
  [
    /\bEssa mudança fortaleceu seu custo-benefício\b/gi,
    "Com o preço mais baixo, ela ficou mais interessante",
  ],
  [/\bespecialmente para quem procura\b/gi, "principalmente pra quem quer"],
  [/\bvoltad([ao]s?) a\b/gi, "feit$1 pra"],
  [/\basfalto deteriorado\b/gi, "asfalto ruim"],
  [/\bpavimento irregular\b/gi, "piso ruim"],
  [/\bdeslocamentos urbanos\b/gi, "trajetos na cidade"],
  [/\bconfiguração\b/gi, "conjunto"],
  [
    /\bredução de torque e de velocidade final\b/gi,
    "perda de força e de velocidade",
  ],
  [/\bcom carga incompleta\b/gi, "sem a bateria cheia"],
  [
    /\bHá, contudo, uma divergência na potência nominal:\s*/gi,
    "Na potência nominal, os números foram diferentes: ",
  ],
  [/\ba informação verbal é de\b/gi, "no vídeo, o número foi"],
  [/\bregistra\b(?= \d)/gi, "traz"],
  [/\bsimplifica a recarga\b/gi, "facilita carregar"],
  [
    /\btrajetos curtos em ruas com bom pavimento\b/gi,
    "trajetos curtos em ruas com asfalto bom",
  ],
  [/\bO modelo faz mais sentido para\b/g, "Faz mais sentido pra"],
  [
    /\bconsiderando toda a carga transportada\b/gi,
    "somando o peso de tudo que vai na bike",
  ],
];
function spoken(s: string) {
  return spokenPhrases.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    s,
  );
}

export function singleInstagramCaption(
  summary: string,
  blocks: unknown,
  transcript: string,
) {
  if (!Array.isArray(blocks) || !transcript.trim())
    throw Error("instagram_caption_sources_missing");
  const normalizedTranscript = normalize(transcript);
  const sections = blocks
    .flatMap((b) =>
      b &&
      ["text", "pros_cons"].includes(b.type) &&
      typeof b.text === "string" &&
      typeof b.sourceExcerpt === "string" &&
      normalize(b.sourceExcerpt).length >= 12 &&
      normalizedTranscript.includes(normalize(b.sourceExcerpt))
        ? [
            {
              heading: normalize(
                typeof b.heading === "string" ? b.heading : "",
              ),
              sentences: sentences(b.text).map(spoken),
            },
          ]
        : [],
    )
    .filter((b) => b.sentences.length);
  if (sections.length < 2) throw Error("instagram_caption_evidence_missing");

  const verdict =
    [...sections]
      .reverse()
      .find((section) =>
        /veredito|vale a pena|fazia sentido|conclusao|para quem/.test(
          section.heading,
        ),
      ) ?? sections[sections.length - 1];
  const topics = sections.filter((section) => section !== verdict);
  const detail = topics.find((section) =>
    /subida|ladeira|teste|na pratica|percurso|iluminacao|garupa|alcance|autonomia|bateria/.test(
      section.heading,
    ),
  );
  const caveat = [...topics]
    .reverse()
    .find((section) =>
      /limit|ressalv|atencao|ponto fraco|cuidado/.test(section.heading),
    );
  const seen = new Set<string>();
  const groups: string[] = [];
  let total = INSTAGRAM_CAPTION_END.length;
  const add = (items: string[], max: number, limit = 2200) => {
    const fresh: string[] = [];
    let chars = 0;
    for (const sentence of items) {
      const key = normalize(sentence);
      if (seen.has(key)) continue;
      if (chars + sentence.length + 1 > max) break;
      fresh.push(sentence);
      chars += sentence.length + 1;
    }
    if (!fresh.length) return;
    const paragraph = fresh.join(" ");
    if (total + paragraph.length + 2 > limit) return;
    for (const sentence of fresh) seen.add(normalize(sentence));
    groups.push(paragraph);
    total += paragraph.length + 2;
  };

  const intro = sentences(summary).slice(0, 1).map(spoken);
  add(intro, 340);
  if (detail) add(detail.sentences.slice(0, 3), 500, 1350);
  // Before general specs, leave space for the caveat and the final recommendation.
  const priceIntro = /preco|oferta|mais barata/.test(
    normalize(intro.join(" ")),
  );
  const detailMentionsCharge = /bateria.*(?:cheia|carregada)/.test(
    normalize(detail?.sentences.slice(0, 3).join(" ") ?? ""),
  );
  for (const topic of topics.filter(
    (section) =>
      section !== detail &&
      section !== caveat &&
      !(priceIntro && /oportunidade|oferta|preco/.test(section.heading)) &&
      !(detailMentionsCharge && /^a carga da bateria\b/.test(section.heading)),
  )) {
    if (groups.length >= (caveat ? 4 : 5) || total >= 1350) break;
    add(topic.sentences.slice(0, 2), 420, 1350);
  }
  if (caveat) add(caveat.sentences.slice(0, 2), 400, 1750);
  add(verdict.sentences.slice(0, 2), 500);
  if (groups.length < 3) throw Error("instagram_caption_incomplete");
  return [...groups, INSTAGRAM_CAPTION_END].join("\n\n");
}
