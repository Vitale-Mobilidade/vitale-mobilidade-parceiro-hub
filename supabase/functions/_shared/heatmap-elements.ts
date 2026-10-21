import { heatmapPath, type HeatmapScreen } from "./heatmap.ts";
export const ELEMENT_LAYOUT = "2026-10-elements-v2";
export type ElementBin = {
  kind: "view" | "click" | "scroll";
  target: string;
  x: number;
  y: number;
  count: number;
};
export type ElementBatch = {
  event: "heatmap_elements";
  path: string;
  screen: HeatmapScreen;
  viewport: number;
  layout: typeof ELEMENT_LAYOUT;
  bins: ElementBin[];
};
function exact(v: object, keys: string[]) {
  return Object.keys(v).sort().join() === keys.sort().join();
}
export function validateElementBatch(input: unknown): ElementBatch | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const v = input as ElementBatch;
  if (
    !exact(v, ["event", "path", "screen", "viewport", "layout", "bins"]) ||
    v.event !== "heatmap_elements" ||
    !heatmapPath(v.path) || heatmapPath(v.path) !== v.path ||
    v.layout !== ELEMENT_LAYOUT ||
    !Number.isInteger(v.viewport) ||
    v.viewport < 240 ||
    v.viewport > 3840 ||
    !["mobile", "tablet", "desktop"].includes(v.screen) ||
    (v.viewport < 768 ? "mobile" : v.viewport < 1024 ? "tablet" : "desktop") !==
      v.screen ||
    !Array.isArray(v.bins) ||
    !v.bins.length ||
    v.bins.length > 20
  )
    return null;
  const keys = new Set<string>();
  let total = 0;
  for (const b of v.bins) {
    if (
      !b ||
      typeof b !== "object" ||
      !exact(b, ["kind", "target", "x", "y", "count"]) ||
      !Number.isInteger(b.x) ||
      !Number.isInteger(b.y) ||
      !Number.isInteger(b.count) ||
      b.count < 1 ||
      b.count > 10
    )
      return null;
    if (b.kind === "click") {
      if (
        typeof b.target !== "string" ||
        !/^(?:[hb]:[a-f0-9]{8}|e:[a-z][a-z0-9_-]{0,63}):[0-9]{1,3}$/.test(
          b.target,
        ) ||
        b.x < 0 ||
        b.x > 99 ||
        b.y < 0 ||
        b.y > 99
      )
        return null;
    } else if (b.kind === "view") {
      if (b.target !== "" || b.x !== 0 || b.y !== 0 || b.count !== 1)
        return null;
    } else if (b.kind === "scroll") {
      if (
        b.target !== "" ||
        b.x !== 0 ||
        ![25, 50, 75, 100].includes(b.y) ||
        b.count !== 1
      )
        return null;
    } else return null;
    const key = `${b.kind}:${b.target}:${b.x}:${b.y}`;
    if (keys.has(key)) return null;
    keys.add(key);
    total += b.count;
  }
  return total <= 60 ? v : null;
}
