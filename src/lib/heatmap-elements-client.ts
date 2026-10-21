import {
  ELEMENT_LAYOUT,
  type ElementBin,
} from "../../supabase/functions/_shared/heatmap-elements";
import { clickedTarget, PRIVATE_SELECTOR } from "./heatmap-targets";
import {
  HEATMAP_SAMPLE,
  heatmapPath,
  heatmapScreen,
} from "../../supabase/functions/_shared/heatmap";

/** In-memory per-route sample. No visitor IDs, storage, DOM capture or field values. */
export function startHeatmap(
  win: Window,
  doc: Document,
  endpoint: string,
  enabled: boolean,
  send: typeof fetch = fetch,
  random = Math.random,
) {
  const path = heatmapPath(win.location.pathname);
  if (
    !enabled ||
    !endpoint ||
    !path ||
    win.location.hostname !== "vitalemobilidade.com" ||
    random() >= HEATMAP_SAMPLE
  )
    return () => {};
  const viewport = Math.round(win.innerWidth);
  if (viewport < 240 || viewport > 3840) return () => {};
  const screen = heatmapScreen(viewport);
  let stopped = false;
  let clicks = 0;
  let requests = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bins = new Map<string, ElementBin>();
  const depths = new Set<number>();
  const valid = () =>
    !stopped &&
    win.location.pathname.replace(/\/$/, "") === path.replace(/\/$/, "") &&
    Math.round(win.innerWidth) === viewport;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!bins.size || requests >= 8) {
      bins.clear();
      return;
    }
    const batch = [...bins.values()];
    bins.clear();
    requests++;
    try {
      void send(endpoint, {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "heatmap_elements",
          viewport,
          path,
          screen,
          layout: ELEMENT_LAYOUT,
          bins: batch,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Navigation and offers never wait for analytics. */
    }
  };
  const add = (bin: ElementBin) => {
    const key = `${bin.kind}:${bin.target}:${bin.x}:${bin.y}`;
    const old = bins.get(key);
    if (old && old.count < 10) old.count++;
    else if (!old) bins.set(key, bin);
    if (
      bins.size >= 20 ||
      [...bins.values()].reduce((n, b) => n + b.count, 0) >= 60
    )
      flush();
    else if (!timer) timer = setTimeout(flush, 5000);
  };
  let lastScroll = -Infinity;
  const scroll = () => {
    const now = Date.now();
    if (now - lastScroll < 250 || depths.size === 4) return;
    lastScroll = now;
    if (!valid() || doc.visibilityState === "hidden") return;
    const height = Math.max(doc.documentElement.scrollHeight, win.innerHeight);
    const reached = Math.min(
      100,
      ((win.scrollY + win.innerHeight) / height) * 100,
    );
    for (const y of [25, 50, 75, 100])
      if (reached >= y && !depths.has(y)) {
        depths.add(y);
        add({ kind: "scroll", x: 0, y, target: "", count: 1 });
      }
  };
  const click = (event: MouseEvent) => {
    if (
      !valid() ||
      !event.isTrusted ||
      clicks >= 60 ||
      doc.visibilityState === "hidden"
    )
      return;
    const element = event.target as Element | null;
    if (!element?.closest || element.closest(PRIVATE_SELECTOR)) return;
    const target = clickedTarget(element);
    if (!target) return;
    const rect = target.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * 100);
    if (x < 0 || y < 0 || x > 100 || y > 100) return;
    clicks++;
    add({
      kind: "click",
      x: Math.min(99, x),
      y: Math.min(99, y),
      target: target.key,
      count: 1,
    });
  };
  const hidden = () => {
    if (doc.visibilityState === "hidden") flush();
  };
  const resize = () => {
    if (Math.round(win.innerWidth) !== viewport) {
      stopped = true;
      bins.clear();
    }
  };
  add({ kind: "view", x: 0, y: 0, target: "", count: 1 });
  scroll();
  doc.addEventListener("click", click, { capture: true, passive: true });
  win.addEventListener("scroll", scroll, { passive: true });
  win.addEventListener("resize", resize, { passive: true });
  win.addEventListener("pagehide", flush);
  doc.addEventListener("visibilitychange", hidden);
  return () => {
    flush();
    stopped = true;
    if (timer) clearTimeout(timer);
    doc.removeEventListener("click", click, true);
    win.removeEventListener("scroll", scroll);
    win.removeEventListener("resize", resize);
    win.removeEventListener("pagehide", flush);
    doc.removeEventListener("visibilitychange", hidden);
  };
}
