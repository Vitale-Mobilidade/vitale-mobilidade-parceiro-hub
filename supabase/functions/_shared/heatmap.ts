import { publicAnalyticsPath } from "./site-analytics.ts";

// Bump when public page layout changes materially; never combine versions.
export const HEATMAP_LAYOUT = "2026-10-v1";
export const HEATMAP_SAMPLE = 0.25;
export const HEATMAP_ACTIONS = [
  "other",
  "radar",
  "quiz",
  "content",
  "tools",
  "offer",
] as const;
export type HeatmapScreen = "mobile" | "tablet" | "desktop";
export type HeatmapBin = {
  kind: "view" | "click" | "scroll";
  x: number;
  y: number;
  action: (typeof HEATMAP_ACTIONS)[number];
  count: number;
};
export type HeatmapBatch = {
  event: "heatmap";
  path: string;
  screen: HeatmapScreen;
  layout: typeof HEATMAP_LAYOUT;
  bins: HeatmapBin[];
};
export function heatmapPath(value: unknown) {
  const path = publicAnalyticsPath(value);
  return path && (path === "/" || /^\/(radar|conteudos)(\/|$)/.test(path))
    ? path
    : null;
}
export function heatmapScreen(width: number): HeatmapScreen {
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}
export function heatmapCell(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    x < 0 ||
    y < 0 ||
    x > width ||
    y > height
  )
    return null;
  return {
    x: Math.min(11, Math.floor((x / width) * 12)),
    y: Math.min(19, Math.floor((y / height) * 20)),
  };
}
function keys(input: Record<string, unknown>, expected: string[]) {
  return Object.keys(input).sort().join() === [...expected].sort().join();
}
export function validateHeatmapBatch(value: unknown): HeatmapBatch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const path = heatmapPath(v.path);
  if (
    !keys(v, ["event", "path", "screen", "layout", "bins"]) ||
    v.event !== "heatmap" ||
    !path ||
    v.path !== path ||
    v.layout !== HEATMAP_LAYOUT ||
    !["mobile", "tablet", "desktop"].includes(String(v.screen)) ||
    !Array.isArray(v.bins) ||
    v.bins.length < 1 ||
    v.bins.length > 20
  )
    return null;
  let total = 0;
  const seen = new Set<string>();
  for (const raw of v.bins) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const bin = raw as HeatmapBin;
    if (
      !keys(raw, ["kind", "x", "y", "action", "count"]) ||
      !Number.isInteger(bin.x) ||
      !Number.isInteger(bin.y) ||
      !Number.isInteger(bin.count) ||
      bin.count < 1 ||
      bin.count > 10 ||
      !HEATMAP_ACTIONS.includes(bin.action)
    )
      return null;
    if (bin.kind === "click") {
      if (bin.x < 0 || bin.x > 11 || bin.y < 0 || bin.y > 19) return null;
    } else if (bin.kind === "scroll") {
      if (
        bin.x !== 0 ||
        ![25, 50, 75, 100].includes(bin.y) ||
        bin.action !== "other" ||
        bin.count !== 1
      )
        return null;
    } else if (bin.kind === "view") {
      if (
        bin.x !== 0 ||
        bin.y !== 0 ||
        bin.action !== "other" ||
        bin.count !== 1
      )
        return null;
    } else return null;
    const key = `${bin.kind}:${bin.x}:${bin.y}:${bin.action}`;
    if (seen.has(key)) return null;
    seen.add(key);
    total += bin.count;
  }
  return total <= 60 ? (v as unknown as HeatmapBatch) : null;
}
