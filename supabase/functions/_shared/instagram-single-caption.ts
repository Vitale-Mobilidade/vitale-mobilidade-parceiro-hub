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
              sentences: sentences(b.text),
            },
          ]
        : [],
    )
    .filter((b) => b.sentences.length);
  if (sections.length < 2) throw Error("instagram_caption_evidence_missing");
  const seen = new Set<string>();
  const groups: string[] = [];
  let total = INSTAGRAM_CAPTION_END.length;
  const add = (items: string[], max: number) => {
    const fresh: string[] = [];
    for (const sentence of items) {
      const key = normalize(sentence);
      const chars = [...sentence].length;
      if (
        seen.has(key) ||
        chars + total + 2 > 2200 ||
        chars + fresh.join(" ").length + 1 > max
      )
        continue;
      fresh.push(sentence);
      seen.add(key);
      total += chars + 2;
    }
    if (fresh.length) groups.push(fresh.join(" "));
  };
  add(sentences(summary).slice(0, 1), 385);
  const verdict =
    [...sections]
      .reverse()
      .find((b) =>
        /veredito|vale a pena|fazia sentido|conclusao|para quem/.test(
          b.heading,
        ),
      ) ?? sections[sections.length - 1];
  for (const section of sections.filter((b) => b !== verdict).slice(0, 7)) {
    if (total >= 1640) break;
    add(section.sentences.slice(0, 2), 335);
  }
  add(verdict.sentences.slice(0, 3), 490);
  if (groups.length < 3) throw Error("instagram_caption_incomplete");
  return [...groups, INSTAGRAM_CAPTION_END].join("\n\n");
}
