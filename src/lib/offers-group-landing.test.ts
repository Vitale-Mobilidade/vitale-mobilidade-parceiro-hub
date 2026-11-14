import { afterEach, describe, expect, it, vi } from "vitest";
import {
  offersGroupCampaign,
  setOffersGroupAdsEventConsent,
  trackGroupInvite,
} from "./offers-group-landing";

afterEach(() => {
  setOffersGroupAdsEventConsent(false);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("mensuração da landing do grupo de ofertas", () => {
  it("só aceita códigos de campanha únicos; descarta contatos e IDs de clique", () => {
    expect(
      offersGroupCampaign(
        "?utm_source=google&utm_medium=cpc&utm_medium=social&utm_campaign=bikes_nov&" +
          "utm_content=11987654321&utm_term=private&gclid=private&fbclid=private",
      ),
    ).toEqual({
      utm_source: "google",
      utm_medium: null,
      utm_campaign: "bikes_nov",
      utm_content: null,
    });
    expect(
      offersGroupCampaign(
        "?utm_campaign=person%40example.com&utm_content=https%3A%2F%2Fexample.com",
      ),
    ).toMatchObject({ utm_campaign: null, utm_content: null });
  });

  it("aguarda até 500 ms apenas quando há consentimento", () => {
    vi.useFakeTimers();
    const location = new URL(
      "https://vitalemobilidade.com/entrenogrupodeofertas?gclid=private",
    );
    const dataLayer: Array<{ eventCallback: () => void }> = [];
    const open = vi.fn();
    vi.stubGlobal("window", { location, dataLayer, setTimeout, clearTimeout });
    trackGroupInvite("hero", open);
    expect(open).toHaveBeenCalledTimes(1);
    expect(dataLayer).toEqual([]);

    setOffersGroupAdsEventConsent(true);
    trackGroupInvite("carousel", open);
    expect(dataLayer).toEqual([
      {
        event: "offers_group_cta_click",
        page_path: "/entrenogrupodeofertas",
        cta_position: "carousel",
        vitale_offers_google_ads: true,
        eventCallback: expect.any(Function),
        eventTimeout: 500,
      },
    ]);
    vi.advanceTimersByTime(499);
    expect(open).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    dataLayer[0].eventCallback();
    expect(open).toHaveBeenCalledTimes(2);

    trackGroupInvite("grid", open);
    dataLayer[1].eventCallback();
    vi.advanceTimersByTime(500);
    expect(open).toHaveBeenCalledTimes(3);
  });

  it("ignora outras rotas e abre o convite mesmo quando a fila falha", () => {
    const dataLayer = {
      push: vi.fn(() => {
        throw new Error("indisponível");
      }),
    };
    const location = new URL("https://vitalemobilidade.com/grupodeofertas");
    const open = vi.fn();
    vi.stubGlobal("window", { location, dataLayer, setTimeout, clearTimeout });
    setOffersGroupAdsEventConsent(true);
    trackGroupInvite("hero", open);
    expect(dataLayer.push).not.toHaveBeenCalled();
    location.pathname = "/entrenogrupodeofertas";
    trackGroupInvite("hero", open);
    expect(dataLayer.push).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(2);
  });
});
