import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListingDashboard } from "@/components/classifieds/ListingDashboard";
import { listingSchema } from "./bike-classifieds";
import { ListingShare } from "@/components/classifieds/ListingShare";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LISTING_MESSAGE,
  listingWhatsAppHref,
  listingWhatsAppMessage,
} from "./bike-classifieds";
import { memberReturnPath } from "./member-community";
import { pageHead } from "./seo";
const listing = {
  id: "00000000-0000-4000-8000-000000000781",
  title: "Minha V8 Pro",
};
describe("seller contact and share contract", () => {
  it("Todos shows deactivated real ads without restoring empty test placeholders", () => {
    const empty = listingSchema.parse({
      ...listing,
      title: "Minha bike",
      brand: "",
      model: "",
      priceCents: 0,
      city: "",
      state: "",
      modelYear: null,
      mileageKm: null,
      condition: "good",
      battery: "unknown",
      invoice: false,
      description: "",
      maintenance: "",
      status: "archived",
      feeCents: 15000,
      feeStatus: "required",
      images: [],
      publishedAt: null,
      updatedAt: "2026-11-05T00:00:00Z",
    });
    const real = {
      ...empty,
      id: "00000000-0000-4000-8000-000000000782",
      title: "Bike real desativada",
      brand: "Marca",
      model: "Modelo",
    };
    const html = renderToStaticMarkup(
      createElement(ListingDashboard, {
        listings: [empty, real],
        busy: false,
        onCreate: () => {},
        onEdit: () => {},
        onAction: async () => {},
      }),
    );
    expect(html).toContain("Bike real desativada");
    expect(html).not.toContain(">Minha bike<");
    expect(html).not.toContain("Nenhuma bike neste filtro");
  });
  it("versions the shared link with the cover so a new cover gets a fresh share URL", () => {
    const cover = "00000000-0000-4000-8000-000000000782";
    const html = renderToStaticMarkup(
      createElement(ListingShare, {
        id: listing.id,
        title: listing.title,
        coverId: cover,
      }),
    );
    expect(decodeURIComponent(html)).toContain(`?foto=${cover}`);
    expect(html).toContain("Compartilhar");
  });
  it("preserves the explicit new-ad return after login without preserving arbitrary parameters", () => {
    expect(memberReturnPath("/conta/anuncios?novo=1&token=secret")).toBe(
      "/conta/anuncios?novo=1",
    );
    expect(memberReturnPath("/conta/anuncios?novo=anything")).toBe(
      "/conta/anuncios",
    );
    expect(memberReturnPath("/anuncie-sua-bike")).toBe("/anuncie-sua-bike");
  });
  it("uses a bold bike title and the canonical listing URL", () => {
    expect(listingWhatsAppMessage(listing)).toContain("*Minha V8 Pro*");
    expect(listingWhatsAppMessage(listing)).toContain(
      `/venda-sua-bike/${listing.id}`,
    );
    expect(
      decodeURIComponent(listingWhatsAppHref("5511999999999", listing)),
    ).toContain("text=Olá!");
  });
  it("customizes wording without losing the bold title or link", () => {
    expect(
      listingWhatsAppMessage({
        ...listing,
        whatsappMessage: "Tenho interesse na *{bike}*! {link}",
      }),
    ).toBe(
      `Tenho interesse na *Minha V8 Pro*! https://vitalemobilidade.com/venda-sua-bike/${listing.id}`,
    );
    expect(
      listingWhatsAppMessage({
        ...listing,
        whatsappMessage: "Está disponível?",
      }),
    ).toContain("*Minha V8 Pro*");
    expect(DEFAULT_LISTING_MESSAGE.length).toBeLessThan(600);
  });
  it("rejects invalid phone targets and does not turn titles into links", () => {
    expect(() => listingWhatsAppHref("not-a-phone", listing)).toThrow(
      "invalid_phone",
    );
    expect(
      listingWhatsAppMessage({ ...listing, title: "*V8*\nPro" }),
    ).toContain("*V8Pro*");
  });
  it("emits a public cover URL for both social metadata formats", () => {
    const url =
      "https://vitalemobilidade.com/api/public/bike-image?id=" + listing.id;
    const head = pageHead({
      path: "/venda-sua-bike/" + listing.id,
      title: listing.title,
      description: "Bike",
      image: { url, type: "image/webp", alt: listing.title },
    });
    expect(head.meta.find((m) => m.property === "og:image")?.content).toBe(url);
    expect(head.meta.find((m) => m.name === "twitter:image")?.content).toBe(
      url,
    );
  });
});
