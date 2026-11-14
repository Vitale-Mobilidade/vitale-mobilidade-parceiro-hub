/** Runtime-neutral carousel constants shared by the Hub (validation) and Edge (rendering). */
export const WIDTH = 1080, HEIGHT = 1350;
export const FINAL_ACTIONS = ["Curta", "Compartilhe", "Comente", "Salve"] as const;
export type Layout = "opening" | "review" | "comparison" | "numbers" | "diagram" | "conclusion";
export type Theme = "petroleum" | "deep" | "light" | "warm";
export type GraphicModule = "cover" | "beam" | "load" | "route" | "battery" | "comparison" | "decision";
export type Concept = { module: GraphicModule; intent: string; metric?: { value: string; label: string }; annotations?: { label: string; text: string }[] };
export type RenderSlide = { title: string; body: string; layout: Layout; theme: Theme; bikeIds: string[]; scene: string | null; alt: string; concept?: Concept };
export const FINAL_ALT = "Curta, Compartilhe, Comente e Salve. @vitalemobilidade.";
export function assetPath(jobId: string, revision: number, position: number) {
  return `${jobId}/r${revision}/${String(position).padStart(2, "0")}.jpg`;
}
export function scenePathPattern(jobId: string, revision: number) {
  return new RegExp(`^${jobId}/r${revision}/scene\\.(?:jpg|png)$`);
}
