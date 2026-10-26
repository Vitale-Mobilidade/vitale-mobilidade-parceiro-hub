import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GTM_SNIPPET,
  GA4_ID,
  googleAnalyticsDisabled,
  setGoogleAnalyticsDisabled,
  trackGooglePageView,
} from "./gtm-script";

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

function browser(href = "https://vitalemobilidade.com/") {
  const storage = new Map<string, string>();
  const appendChild = vi.fn();
  const window = {
    location: Object.assign(new URL(href), { reload: vi.fn() }),
    navigator: { doNotTrack: "0", globalPrivacyControl: false },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    dataLayer: [] as unknown[],
  };
  const document = {
    title: "Radar | Vitale Mobilidade",
    referrer: "https://chatgpt.com/c/private-conversation?token=private",
    createElement: vi.fn(() => ({})),
    head: { appendChild },
    cookie: "_ga=old; required-session=keep",
  };
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  return {
    window,
    document,
    appendChild,
    storage,
    view: (value = href) => trackGooglePageView(value),
  };
}

function commands(layer: unknown[]) {
  return layer
    .filter((item) => item && typeof item === "object" && "0" in item)
    .map((item) => Array.from(item as IArguments));
}
function views(layer: unknown[]) {
  return commands(layer).filter((item) => item[0] === "event");
}
afterEach(() => vi.unstubAllGlobals());

describe("GA4 público sem publicidade", () => {
  it("registra o destino antes do primeiro evento e apenas uma vez por documento", () => {
    const { window, appendChild, view } = browser();
    appendChild.mockImplementation(() => {
      expect(commands(window.dataLayer)).toContainEqual([
        "config",
        GA4_ID,
        expect.objectContaining({ send_page_view: false }),
      ]);
      expect(views(window.dataLayer)).toHaveLength(0);
    });
    view();
    view("https://vitalemobilidade.com/radar");
    expect(commands(window.dataLayer).filter((item) => item[0] === "config")).toHaveLength(1);
    expect(views(window.dataLayer)).toHaveLength(2);
  });
  it("configura privacidade antes do contêiner e envia somente um pageview inicial", () => {
    const { window, appendChild, view } = browser();
    view();
    view();
    expect(commands(window.dataLayer)[0]).toEqual([
      "consent",
      "default",
      expect.objectContaining({
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      }),
    ]);
    expect(commands(window.dataLayer)).toContainEqual([
      "set",
      expect.objectContaining({
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: 7776000,
        cookie_update: false,
      }),
    ]);
    expect(appendChild).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        async: true,
        src: "https://www.googletagmanager.com/gtm.js?id=GTM-NM9MGXNM",
      }),
    );
    expect(views(window.dataLayer)).toEqual([
      [
        "event",
        "page_view",
        {
          send_to: GA4_ID,
          page_location: "https://vitalemobilidade.com/",
          page_title: "Radar | Vitale Mobilidade",
          page_referrer: "https://chatgpt.com/",
        },
      ],
    ]);
  });

  it("mede Home → Radar → Home sem duplicar query/hash ou carregar outro contêiner", () => {
    const { window, appendChild, view } = browser();
    view();
    view("https://vitalemobilidade.com/?email=private#name");
    view("https://vitalemobilidade.com/radar");
    view("https://vitalemobilidade.com/");
    expect(views(window.dataLayer).map((item) => item[2].page_location)).toEqual([
      "https://vitalemobilidade.com/",
      "https://vitalemobilidade.com/radar",
      "https://vitalemobilidade.com/",
    ]);
    expect(views(window.dataLayer)[2][2].page_referrer).toBe("https://vitalemobilidade.com/radar");
    expect(appendChild).toHaveBeenCalledTimes(1);
  });

  it.each(["/admin", "/admin/conteudos", "/painel-bikes", "/api/private", "/unknown", "/conteudos/person@example.com"])(
    "não carrega ou envia dados em %s",
    (path) => {
      const { window, appendChild, view } = browser(`https://vitalemobilidade.com${path}`);
      view();
      expect(window.dataLayer).toEqual([]);
      expect(appendChild).not.toHaveBeenCalled();
    },
  );

  it.each(["https://preview.lovable.app/", "http://localhost:3000/", "https://vitalemobilidade.com.evil.example/"])(
    "exclui preview e outros hosts: %s",
    (href) => {
      const { appendChild, view } = browser(href);
      view();
      expect(appendChild).not.toHaveBeenCalled();
    },
  );

  it("suspende a coleta ao entrar em admin após uma página pública", () => {
    const { window, view } = browser();
    view();
    view("https://vitalemobilidade.com/admin");
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA4_ID}`]).toBe(true);
    view();
    expect(views(window.dataLayer)).toHaveLength(2);
  });

  it("elimina query, fragmentos e referrer privado; aceita somente códigos técnicos UTM", () => {
    const { window, view } = browser(
      "https://vitalemobilidade.com/quiz?utm_source=youtube&utm_medium=video&utm_campaign=giro_1&utm_content=person@example.com&token=secret&email=private#answer",
    );
    view();
    const serialized = JSON.stringify(window.dataLayer);
    expect(serialized).not.toMatch(/secret|private|example.com|#answer|token=|email=/);
    expect(commands(window.dataLayer)).toContainEqual([
      "set",
      expect.objectContaining({
        campaign_source: "youtube",
        campaign_medium: "video",
        campaign_name: "giro_1",
      }),
    ]);
  });

  it("respeita recusa antiga e permite reativação explícita sem restaurar marketing", () => {
    const { storage, view, window } = browser();
    storage.set("vitale_cookie_consent_v1", JSON.stringify({ version: 1, analytics: false, marketing: true }));
    view();
    expect(views(window.dataLayer)).toHaveLength(0);
    storage.set("vitale_ga4_disabled_v1", "false");
    view();
    expect(views(window.dataLayer)).toHaveLength(1);
    expect(commands(window.dataLayer)[0][2].ad_storage).toBe("denied");
  });

  it("não deixa uma preferência malformada substituir a recusa anterior", () => {
    const { storage, view, appendChild } = browser();
    storage.set("vitale_cookie_consent_v1", JSON.stringify({ version: 1, analytics: false, marketing: false }));
    storage.set("vitale_ga4_disabled_v1", "invalid");
    view();
    expect(appendChild).not.toHaveBeenCalled();
  });

  it.each(["doNotTrack", "globalPrivacyControl"])("respeita %s mesmo com opt-in armazenado", (key) => {
    const { window, storage, view, appendChild } = browser();
    storage.set("vitale_ga4_disabled_v1", "false");
    Object.assign(window.navigator, {
      [key]: key === "doNotTrack" ? "1" : true,
    });
    view();
    expect(appendChild).not.toHaveBeenCalled();
  });

  it("mantém opt-out em memória se armazenamento estiver indisponível", () => {
    const { window, view } = browser();
    window.localStorage.setItem = () => {
      throw new Error("blocked");
    };
    setGoogleAnalyticsDisabled(true);
    view();
    expect(googleAnalyticsDisabled()).toBe(true);
    expect(views(window.dataLayer)).toHaveLength(0);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("opt-out é persistido, apaga apenas cookies GA4 e descarrega o código", () => {
    const { window, document, storage } = browser();
    const writes: string[] = [];
    Object.defineProperty(document, "cookie", {
      get: () => "_ga=old; _ga_LXMH4RWQHV=old; session=keep",
      set: (value) => writes.push(value),
    });
    setGoogleAnalyticsDisabled(true);
    expect(storage.get("vitale_ga4_disabled_v1")).toBe("true");
    expect(writes).toHaveLength(4);
    expect(writes.join(" ")).not.toContain("session=");
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("falhas do terceiro não impedem a navegação", () => {
    const { appendChild, view } = browser();
    appendChild.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => view()).not.toThrow();
  });
});
