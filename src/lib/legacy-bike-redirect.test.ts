import { describe, expect, it } from "vitest";
import {
  legacyBikeRedirectResponse,
  legacyBikeSlug,
} from "./legacy-bike-redirect";

describe("redirect legado de detalhe de Bike", () => {
  it("captura somente um slug válido, com slash final opcional", () => {
    expect(legacyBikeSlug("/bikes/v8-ultra")).toBe("v8-ultra");
    expect(legacyBikeSlug("/bikes/v8-ultra/")).toBe("v8-ultra");
    for (const path of ["/bikes", "/bikes/a/b", "/admin/bikes", "/bikes/A"])
      expect(legacyBikeSlug(path)).toBeNull();
  });

  it("resolve o slug pelo catálogo e preserva a query literal", () => {
    const response = legacyBikeRedirectResponse(
      "modelo-legado",
      "?utm_source=yt&x=1&x=2",
      [{ slug: "modelo-legado", bikeId: "id_real_42" }],
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "/radar/id_real_42?utm_source=yt&x=1&x=2",
    );
  });

  it("recusa slug desconhecido e bikeId inválido sem soft 404", () => {
    for (const catalog of [
      [{ slug: "outra", bikeId: "v8_ultra" }],
      [{ slug: "v8-ultra", bikeId: "../admin" }],
    ]) {
      const response = legacyBikeRedirectResponse("v8-ultra", "", catalog);
      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
    }
  });

  it("retorna 503 sem cache quando o catálogo está indisponível", () => {
    const response = legacyBikeRedirectResponse("v8-ultra", "", null);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("300");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
  });
});
