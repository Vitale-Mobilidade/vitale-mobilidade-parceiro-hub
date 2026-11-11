import type { ArticleBlock } from "../../supabase/functions/_shared/editorial-contract";

export type ArticleFlowItem = { kind: "block"; block: ArticleBlock } | { kind: "radar" | "quiz" | "economy" | "podcast" };

/** Preserve authored text/video/comparison order, but place decision modules during reading. */
export function composeArticleFlow(blocks: ArticleBlock[], hasRadarBikes: boolean): ArticleFlowItem[] {
  const body = blocks.filter(block => !["radar", "cta", "quiz", "faq", "related"].includes(block.type));
  const textCount = body.filter(block => block.type === "text" || block.type === "pros_cons").length;
  const radarAt = Math.max(1, Math.ceil(textCount * 0.45));
  const quizAt = Math.max(radarAt + 1, Math.ceil(textCount * 0.7));
  const economyAt = Math.max(quizAt + 1, Math.ceil(textCount * 0.85));
  let seen = 0;
  const out: ArticleFlowItem[] = [];
  for (const block of body) {
    out.push({ kind: "block", block });
    if (block.type !== "text" && block.type !== "pros_cons") continue;
    seen++;
    if (hasRadarBikes && seen === radarAt) out.push({ kind: "radar" });
    if (seen === quizAt) out.push({ kind: "quiz" });
    if (textCount >= 6 && seen === economyAt) out.push({ kind: "economy" });
  }
  if (hasRadarBikes && !out.some(item => item.kind === "radar")) out.push({ kind: "radar" });
  if (!out.some(item => item.kind === "quiz")) out.push({ kind: "quiz" });
  return out;
}

function includesParagraph(text: string) {
  return text.split(/\n\s*\n/g).some((chunk) => {
    const paragraph = chunk.trim();
    if (!paragraph || /^(### |> )/.test(paragraph)) return false;
    const lines = paragraph.split("\n").map((line) => line.trim());
    return !lines.every((line) => /^\d+[.)]\s+/.test(line))
      && !lines.every((line) => /^[-•*]\s+/.test(line))
      && !(lines.length >= 2 && lines.every((line) => /^\|.*\|$/.test(line)));
  });
}

/** Each supplemental module gets its own reading gap; authored prose keeps its order. */
export function spaceArticleModules(
  items: ArticleFlowItem[],
  { hasPodcast, hasFaqParagraph }: { hasPodcast: boolean; hasFaqParagraph: boolean },
): ArticleFlowItem[] {
  const prose: ArticleFlowItem[] = [];
  const gaps = [0];
  const modules: { item: ArticleFlowItem; desired: number }[] = [];
  for (const item of items) {
    const block = item.kind === "block" ? item.block : null;
    if (block && ["text", "pros_cons", "hero", "summary", "faq"].includes(block.type)) {
      prose.push(item);
      const paragraph = block.type === "faq" ? hasFaqParagraph
        : block.type === "hero" ? !!block.text?.trim()
        : block.type !== "summary" && includesParagraph(block.text ?? "");
      if (paragraph) gaps.push(prose.length);
    } else {
      modules.push({ item, desired: gaps.at(-1)! });
    }
  }

  const placed = new Map<number, ArticleFlowItem>();
  if (hasPodcast) {
    const bodyGaps = gaps.slice(1);
    const middleIndex = Math.floor((bodyGaps.length - 1) / 2);
    const middle = bodyGaps[middleIndex] ?? 0;
    const occupied = new Set(modules.map(({ desired }) => desired));
    const podcastGap = [middle, bodyGaps[middleIndex + 1], bodyGaps[middleIndex - 1]]
      .find((gap) => gap !== undefined && !occupied.has(gap)) ?? middle;
    placed.set(podcastGap, { kind: "podcast" });
  }

  const available = gaps.filter((gap) => !placed.has(gap));
  const visible = modules.slice(0, available.length);
  let start = 0;
  visible.forEach(({ item, desired }, i) => {
    const end = available.length - (visible.length - i);
    while (start < end && Math.abs(available[start + 1] - desired) < Math.abs(available[start] - desired))
      start++;
    placed.set(available[start++], item);
  });
  const output: ArticleFlowItem[] = [];
  if (placed.has(0)) output.push(placed.get(0)!);
  prose.forEach((item, i) => {
    output.push(item);
    const module = placed.get(i + 1);
    if (module) output.push(module);
  });
  return output;
}
