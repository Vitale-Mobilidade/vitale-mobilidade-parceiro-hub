import type { ElementBin } from "../../supabase/functions/_shared/heatmap-elements";
export function scrollMilestones(bins: ElementBin[]) {
  const views = bins
    .filter((b) => b.kind === "view")
    .reduce((n, b) => n + Number(b.count), 0);
  return [25, 50, 75, 100].map((depth) => {
    const count = bins
      .filter((b) => b.kind === "scroll" && b.y === depth)
      .reduce((n, b) => n + Number(b.count), 0);
    const share = views > 0 && count <= views ? count / views : null;
    return { depth, count, share };
  });
}
