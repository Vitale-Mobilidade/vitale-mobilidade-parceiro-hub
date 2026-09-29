import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { GTM_SNIPPET } from "./gtm-script";

describe("tag loading after primary resources", () => {
  it("queues events, allows a paint and loads tags once when idle", () => {
    const appendChild = vi.fn();
    const listeners: Record<string, () => void> = {};
    const frames: Array<() => void> = [];
    const idle: Array<() => void> = [];
    const window = {
      requestAnimationFrame: (callback: () => void) => frames.push(callback),
      requestIdleCallback: (callback: () => void) => idle.push(callback),
      addEventListener: (event: string, callback: () => void) => {
        listeners[event] = callback;
      },
    } as unknown as {
      dataLayer: unknown[];
      gtag: (...args: unknown[]) => void;
    };
    runInNewContext(GTM_SNIPPET, {
      location: { pathname: "/radar" },
      window,
      document: {
        readyState: "loading",
        createElement: () => ({}),
        head: { appendChild },
      },
    });
    window.gtag("event", "affiliate_click", { bike_id: "v9_max" });
    expect(window.dataLayer).toHaveLength(2);
    expect(appendChild).not.toHaveBeenCalled();
    listeners.load();
    listeners.load();
    expect(appendChild).not.toHaveBeenCalled();
    frames.shift()!();
    frames.shift()!();
    expect(appendChild).not.toHaveBeenCalled();
    idle.shift()!();
    listeners.pointerdown();
    listeners.keydown();
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "https://www.googletagmanager.com/gtm.js?id=GTM-NM9MGXNM",
        async: true,
      }),
    );
  });
  it("keeps the admin outside tag loading", () => {
    const window = {};
    runInNewContext(GTM_SNIPPET, {
      location: { pathname: "/admin/conteudos" },
      window,
    });
    expect(window).toEqual({});
  });
});
