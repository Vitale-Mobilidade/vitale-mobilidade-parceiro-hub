import {
  HEATMAP_LAYOUT,
  HEATMAP_SAMPLE,
  heatmapCell,
  heatmapPath,
  heatmapScreen,
  type HeatmapBin,
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
  const screen = heatmapScreen(win.innerWidth);
  let stopped = false;
  let clicks = 0;
  let requests = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bins = new Map<string, HeatmapBin>();
  const depths = new Set<number>();
  const valid = () =>
    !stopped &&
    win.location.pathname.replace(/\/$/, "") === path.replace(/\/$/, "") &&
    heatmapScreen(win.innerWidth) === screen;
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
          event: "heatmap",
          path,
          screen,
          layout: HEATMAP_LAYOUT,
          bins: batch,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Navigation and offers never wait for analytics. */
    }
  };
  const add = (bin: HeatmapBin) => {
    const key = `${bin.kind}:${bin.x}:${bin.y}:${bin.action}`;
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
        add({ kind: "scroll", x: 0, y, action: "other", count: 1 });
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
    if (
      !element?.closest ||
      element.closest(
        'form,input,textarea,select,[contenteditable],[role="dialog"],dialog,[data-heatmap-private],iframe',
      )
    )
      return;
    const cell = heatmapCell(
      event.clientX,
      event.clientY + win.scrollY,
      win.innerWidth,
      Math.max(doc.documentElement.scrollHeight, win.innerHeight),
    );
    if (!cell) return;
    let action: HeatmapBin["action"] = "other";
    const link = element.closest("a[href]") as HTMLAnchorElement | null;
    if (link) {
      try {
        const url = new URL(link.href, win.location.href);
        if (url.origin === win.location.origin) {
          if (/^\/radar(\/|$)/.test(url.pathname)) action = "radar";
          else if (/^\/(quiz|escolherbike)(\/|$)/.test(url.pathname))
            action = "quiz";
          else if (/^\/conteudos(\/|$)/.test(url.pathname)) action = "content";
          else if (/^\/ferramentas(\/|$)/.test(url.pathname)) action = "tools";
        } else if (
          /(^|\.)(mercadolivre\.com(\.br)?|mercadolibre\.com|meli\.la)$/.test(
            url.hostname,
          )
        )
          action = "offer";
      } catch {
        /* Never send the URL itself. */
      }
    }
    clicks++;
    add({ kind: "click", ...cell, action, count: 1 });
  };
  const hidden = () => {
    if (doc.visibilityState === "hidden") flush();
  };
  const resize = () => {
    if (heatmapScreen(win.innerWidth) !== screen) {
      stopped = true;
      bins.clear();
    }
  };
  add({ kind: "view", x: 0, y: 0, action: "other", count: 1 });
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
