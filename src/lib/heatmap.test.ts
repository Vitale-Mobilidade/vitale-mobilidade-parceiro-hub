import { describe, expect, it, vi } from "vitest";
import {
  HEATMAP_LAYOUT,
  heatmapPath,
  heatmapCell,
  validateHeatmapBatch,
} from "../../supabase/functions/_shared/heatmap";
import { startHeatmap } from "./heatmap";
const batch = {
  event: "heatmap",
  path: "/radar",
  screen: "mobile",
  layout: HEATMAP_LAYOUT,
  bins: [{ kind: "click", x: 1, y: 2, action: "other", count: 1 }],
};
describe("heatmap privacy and bounds", () => {
  it("accepts only public content paths and exact aggregate schema", () => {
    expect(validateHeatmapBatch(batch)).toEqual(batch);
    for (const path of [
      "/quiz",
      "/admin",
      "/ferramentas",
      "/radar?email=x",
      "/conteudos/draft?preview=1",
    ])
      expect(heatmapPath(path)).toBeNull();
    for (const extra of [{ email: "x" }, { sessionId: "x" }, { html: "x" }])
      expect(validateHeatmapBatch({ ...batch, ...extra })).toBeNull();
    expect(
      validateHeatmapBatch({
        ...batch,
        bins: [{ ...batch.bins[0], text: "sensitive" }],
      }),
    ).toBeNull();
    expect(validateHeatmapBatch({ ...batch, layout: "old" })).toBeNull();
    expect(
      validateHeatmapBatch({ ...batch, bins: [{ ...batch.bins[0], x: 12 }] }),
    ).toBeNull();
    expect(
      validateHeatmapBatch({ ...batch, bins: [{ ...batch.bins[0], y: 20 }] }),
    ).toBeNull();
    expect(
      validateHeatmapBatch({
        ...batch,
        bins: [{ ...batch.bins[0], count: 11 }],
      }),
    ).toBeNull();
    expect(
      validateHeatmapBatch({
        ...batch,
        bins: [{ kind: "scroll", x: 0, y: 40, action: "other", count: 1 }],
      }),
    ).toBeNull();
    expect(
      validateHeatmapBatch({ ...batch, bins: [batch.bins[0], batch.bins[0]] }),
    ).toBeNull();
  });
  it("quantizes coordinates and rejects invalid geometry", () => {
    expect(heatmapCell(100, 100, 100, 100)).toEqual({ x: 11, y: 19 });
    expect(heatmapCell(50, 50, 100, 100)).toEqual({ x: 6, y: 10 });
    expect(heatmapCell(0, 0, 0, 100)).toBeNull();
    expect(heatmapCell(NaN, 0, 100, 100)).toBeNull();
  });
});
function browser(path = "/radar") {
  const doc = new EventTarget() as Document;
  Object.assign(doc, {
    visibilityState: "visible",
    documentElement: { scrollHeight: 2000 },
  });
  const win = new EventTarget() as Window;
  Object.assign(win, {
    location: {
      pathname: path,
      hostname: "vitalemobilidade.com",
      href: `https://vitalemobilidade.com${path}`,
      origin: "https://vitalemobilidade.com",
    },
    innerWidth: 390,
    innerHeight: 800,
    scrollY: 0,
  });
  return { doc, win };
}
describe("sampled lifecycle", () => {
  it("sends bounded aggregates without storage, URL parameters or referrer and flushes once", () => {
    const { doc, win } = browser();
    const send = vi.fn().mockResolvedValue({});
    const stop = startHeatmap(
      win,
      doc,
      "https://collector.test",
      true,
      send,
      () => 0,
    );
    win.dispatchEvent(new Event("pagehide"));
    stop();
    expect(send).toHaveBeenCalledTimes(1);
    const options = send.mock.calls[0][1];
    expect(options.credentials).toBe("omit");
    expect(options.referrerPolicy).toBe("no-referrer");
    const payload = JSON.parse(options.body);
    expect(validateHeatmapBatch(payload)).toBeTruthy();
    expect(payload.bins.map((b: { kind: string }) => b.kind)).toEqual([
      "view",
      "scroll",
    ]);
  });
  it("does not send when disabled, excluded or outside sample; ignores form clicks", () => {
    for (const [path, enabled, sample] of [
      ["/quiz", true, 0],
      ["/radar", false, 0],
      ["/radar", true, 0.5],
    ] as const) {
      const { doc, win } = browser(path);
      const send = vi.fn();
      startHeatmap(win, doc, "url", enabled, send, () => sample)();
      expect(send).not.toHaveBeenCalled();
    }
  });
  it("stops attributing data after a screen category change", () => {
    const { doc, win } = browser();
    const send = vi.fn().mockResolvedValue({});
    const stop = startHeatmap(win, doc, "url", true, send, () => 0);
    Object.assign(win, { innerWidth: 1200 });
    win.dispatchEvent(new Event("resize"));
    stop();
    expect(send).not.toHaveBeenCalled();
  });
});

it("ignores fields, counts trusted clicks by safe category and removes listeners", () => {
  const { win } = browser();
  const callbacks = new Map<string, (event: unknown) => void>();
  const doc = {
    visibilityState: "visible",
    documentElement: { scrollHeight: 2000 },
    addEventListener: (name: string, fn: (event: unknown) => void) =>
      callbacks.set(name, fn),
    removeEventListener: (name: string) => callbacks.delete(name),
  } as unknown as Document;
  const send = vi.fn().mockResolvedValue({});
  const stop = startHeatmap(win, doc, "url", true, send, () => 0);
  const click = callbacks.get("click")!;
  click({
    isTrusted: true,
    clientX: 100,
    clientY: 100,
    target: { closest: () => ({ value: "private" }) },
  });
  click({
    isTrusted: true,
    clientX: 100,
    clientY: 100,
    target: {
      closest: (selector: string) =>
        selector === "a[href]"
          ? { href: "https://vitalemobilidade.com/radar/v8?private=secret" }
          : null,
    },
  });
  stop();
  const payload = JSON.parse(send.mock.calls[0][1].body);
  expect(
    payload.bins.filter((b: { kind: string }) => b.kind === "click"),
  ).toEqual([{ kind: "click", x: 3, y: 1, action: "radar", count: 1 }]);
  expect(JSON.stringify(payload)).not.toMatch(/private|secret|value|href/);
  expect(callbacks.size).toBe(0);
});
