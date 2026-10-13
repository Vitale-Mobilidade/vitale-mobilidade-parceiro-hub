import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuizPriceAlert } from "@/components/quiz/QuizPriceAlert";

describe("alerta no resultado do Quiz", () => {
  it.each([undefined, 0, -100, NaN, Infinity])(
    "não oferece alerta sem referência válida do Radar: %s",
    (currentPrice) => {
      expect(
        renderToStaticMarkup(
          <QuizPriceAlert
            bikeId="v8_pro"
            bikeName="V8 Pro"
            currentPrice={currentPrice}
          />,
        ),
      ).toBe("");
    },
  );
  it("identifica a bike no nome acessível e mantém o formulário fechado até a interação", () => {
    const html = renderToStaticMarkup(
      <QuizPriceAlert bikeId="v8_pro" bikeName="V8 Pro" currentPrice={7000} />,
    );
    expect(html).toContain("Avise-me quando o preço baixar");
    expect(html).toContain(
      'aria-label="Avise-me quando o preço de V8 Pro baixar"',
    );
    expect(html).toContain('type="button"');
    expect(html).not.toContain("<form");
  });
});
