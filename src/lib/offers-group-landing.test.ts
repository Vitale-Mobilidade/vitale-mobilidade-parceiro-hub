import { afterEach, describe, expect, it, vi } from "vitest";
import {
  offersGroupCampaign,
  trackOffersGroupCta,
} from "./offers-group-landing";

afterEach(() => vi.unstubAllGlobals());

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

  it("envia uma posição por acionamento, sem herdar atribuição nem tocar na URL", () => {
    const location = new URL(
      "https://vitalemobilidade.com/entrenogrupodeofertas?utm_source=meta&fbclid=qa",
    );
    const browser = { location, dataLayer: [] };
    vi.stubGlobal("window", browser);
    trackOffersGroupCta("hero");
    location.search = "";
    trackOffersGroupCta("after_faq");
    expect(browser.dataLayer).toEqual([
      {
        event: "offers_group_cta_click",
        page_path: "/entrenogrupodeofertas",
        cta_position: "hero",
        vitale_offers_google_ads: false,
        utm_source: "meta",
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
      },
      {
        event: "offers_group_cta_click",
        page_path: "/entrenogrupodeofertas",
        cta_position: "after_faq",
        vitale_offers_google_ads: false,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
      },
    ]);
    expect(location.pathname).toBe("/entrenogrupodeofertas");
  });

  it("ignora caminhos diferentes e não propaga falhas do dataLayer", () => {
    const dataLayer = {
      push: vi.fn(() => {
        throw new Error("indisponível");
      }),
    };
    const location = new URL("https://vitalemobilidade.com/grupodeofertas");
    vi.stubGlobal("window", { location, dataLayer });
    trackOffersGroupCta("hero");
    expect(dataLayer.push).not.toHaveBeenCalled();
    location.pathname = "/entrenogrupodeofertas";
    expect(() => trackOffersGroupCta("hero")).not.toThrow();
    expect(dataLayer.push).toHaveBeenCalledTimes(1);
  });
});
