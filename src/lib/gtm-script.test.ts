import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { GTM_SNIPPET } from "./gtm-script";

describe("public tag loading", () => {
  it("queues the initial event and loads GTM immediately and asynchronously", () => {
    const appendChild = vi.fn();
    const window = {} as {
      dataLayer: unknown[];
      gtag: (...args: unknown[]) => void;
    };
    runInNewContext(GTM_SNIPPET, {
      location: { pathname: "/radar" },
      window,
      document: {
        createElement: () => ({}),
        head: { appendChild },
      },
    });
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "https://www.googletagmanager.com/gtm.js?id=GTM-NM9MGXNM",
        async: true,
      }),
    );
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toMatchObject({ event: "gtm.js" });
    window.gtag("event", "affiliate_click", { bike_id: "v9_max" });
    expect(window.dataLayer).toHaveLength(2);
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
