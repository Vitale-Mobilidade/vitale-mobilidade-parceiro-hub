import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_BOOTSTRAP,
  CONSENT_STORAGE_KEY,
  saveConsentChoice,
} from "./consent";
import { GTM_SNIPPET } from "./gtm-script";

function boot(pathname: string, stored: string | null = null) {
  const window = {
    localStorage: { getItem: vi.fn(() => stored) },
  } as {
    localStorage: { getItem: ReturnType<typeof vi.fn> };
    dataLayer: Array<Record<string, unknown> | IArguments>;
    __vitaleConsent?: Record<string, unknown>;
  };
  const appendChild = vi.fn();
  const context = {
    window,
    location: { pathname },
    document: { createElement: () => ({}), head: { appendChild } },
  };
  runInNewContext(CONSENT_BOOTSTRAP, context);
  runInNewContext(GTM_SNIPPET, context);
  return { window, appendChild };
}

describe("consent before analytics", () => {
  it("sets four denied defaults before GTM on a first visit", () => {
    const { window, appendChild } = boot("/radar");
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem).toHaveBeenCalledWith(
      CONSENT_STORAGE_KEY,
    );
    expect(window.dataLayer[0]).toMatchObject({
      vitale_marketing_consent: "denied",
    });
    expect(Array.from(window.dataLayer[1] as IArguments).slice(0, 2)).toEqual([
      "consent",
      "default",
    ]);
    expect((window.dataLayer[1] as IArguments)[2]).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(window.dataLayer.at(-1)).toMatchObject({ event: "gtm.js" });
  });

  it("restores an analytics-only choice before GTM starts", () => {
    const { window } = boot(
      "/",
      JSON.stringify({ version: 1, analytics: true, marketing: false }),
    );
    expect(window.__vitaleConsent).toMatchObject({
      analytics: true,
      marketing: false,
    });
    expect(Array.from(window.dataLayer[2] as IArguments).slice(0, 2)).toEqual([
      "consent",
      "update",
    ]);
    expect((window.dataLayer[2] as IArguments)[2]).toMatchObject({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(window.dataLayer.at(-1)).toMatchObject({ event: "gtm.js" });
  });

  it("rejects malformed or old preferences", () => {
    const { window } = boot(
      "/",
      JSON.stringify({ version: 0, analytics: true, marketing: true }),
    );
    expect(window.dataLayer).toHaveLength(3);
    expect(window.__vitaleConsent).toMatchObject({
      analytics: false,
      marketing: false,
    });
  });

  it("does not touch storage or load GTM in admin", () => {
    const { window, appendChild } = boot("/admin/bikes");
    expect(window.dataLayer).toBeUndefined();
    expect(window.localStorage.getItem).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
  });
});

describe("consent choice updates", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("notifies GTM only about newly granted categories", () => {
    const storage = new Map<string, string>();
    const dataLayer: unknown[] = [];
    const gtag = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal(
      "CustomEvent",
      class {
        constructor(
          public type: string,
          public options: unknown,
        ) {}
      },
    );
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      dataLayer,
      gtag,
      dispatchEvent: vi.fn(),
      location: { reload },
    });
    saveConsentChoice(true, false);
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(dataLayer).toContainEqual({ event: "vitale_analytics_granted" });
    expect(dataLayer).not.toContainEqual({ event: "vitale_marketing_granted" });
    saveConsentChoice(true, true);
    expect(dataLayer).toContainEqual({ event: "vitale_marketing_granted" });
    expect(
      dataLayer.filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "event" in item &&
          item.event === "vitale_analytics_granted",
      ),
    ).toHaveLength(1);
    expect(reload).not.toHaveBeenCalled();
    saveConsentChoice(false, false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
