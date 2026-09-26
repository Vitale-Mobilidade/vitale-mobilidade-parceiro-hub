import type { ArticleBlock } from "../../supabase/functions/_shared/editorial-contract";

export type ArticleFlowItem = { kind: "block"; block: ArticleBlock } | { kind: "radar" | "quiz" | "economy" };

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
