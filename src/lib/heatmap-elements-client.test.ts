import { it, expect, vi } from "vitest";
import { startHeatmap } from "./heatmap-elements-client";
import { validateElementBatch } from "../../supabase/functions/_shared/heatmap-elements";
import { clickedTarget, targetIndex } from "./heatmap-targets";
it("anchors repeated public links independently, rejects private fields and collects relative coordinates only", () => {
  const callbacks = new Map<string, (e: unknown) => void>();
  const doc = {
    baseURI: "https://vitalemobilidade.com/",
    visibilityState: "visible",
    documentElement: { scrollHeight: 2000 },
    addEventListener: (n: string, fn: (e: unknown) => void) =>
      callbacks.set(n, fn),
    removeEventListener: (n: string) => callbacks.delete(n),
  } as unknown as Document;
  const make = (href: string, privateField = false) => {
    const el = {
      tagName: "A",
      ownerDocument: doc,
      getAttribute: (name: string) => (name === "href" ? href : null),
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        width: 200,
        height: 100,
      }),
      closest: (selector: string) =>
        selector.startsWith("form") ? (privateField ? {} : null) : el,
    };
    return el as unknown as Element;
  };
  const first = make("/radar/v8");
  const second = make("/radar/v8");
  const secret = make("/radar/v8?email=secret");
  const form = make("/radar/v8", true);
  Object.assign(doc, { querySelectorAll: () => [first, second, secret, form] });
  const indexed = targetIndex(doc);
  expect(indexed.size).toBe(2);
  expect([...indexed.keys()][0]).toMatch(/:0$/);
  expect([...indexed.keys()][1]).toMatch(/:1$/);
  expect(clickedTarget(secret)).toBeNull();
  expect(clickedTarget(form)).toBeNull();
  const win = new EventTarget() as Window;
  Object.assign(win, {
    location: { pathname: "/", hostname: "vitalemobilidade.com" },
    innerWidth: 390,
    innerHeight: 800,
    scrollY: 0,
  });
  const send = vi.fn().mockResolvedValue({});
  const stop = startHeatmap(win, doc, "url", true, send, () => 0);
  callbacks.get("click")!({
    isTrusted: true,
    target: second,
    clientX: 150,
    clientY: 225,
  });
  stop();
  const batch = JSON.parse(send.mock.calls[0][1].body);
  expect(validateElementBatch(batch)).toBeTruthy();
  expect(
    batch.bins.find((b: { kind: string }) => b.kind === "click"),
  ).toMatchObject({ target: [...indexed.keys()][1], x: 25, y: 25, count: 1 });
  expect(JSON.stringify(batch)).not.toMatch(/email|secret|href|textContent/);
  expect(callbacks.size).toBe(0);
});
