import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RadarBikeCard } from "./RadarBikeCard";
import type { RadarEntry } from "@/lib/radar-rankings";

vi.mock("@/lib/router-compat", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/radar-base", () => ({ useRadarBase: () => "/radar" }));
vi.mock("@/lib/radar-rankings", () => ({
  radarUseLine: () => null,
  shortDiagnosis: () => "Preço registrado no Radar.",
}));

describe("RadarBikeCard", () => {
  it("inclui imagem, conteúdo e CTA em um único link para o histórico da bike", () => {
    const entry = {
      id: "v9_pro",
      name: "V9 Pro",
      image: "/v9-pro.avif",
      currentPrice: 6295,
      savingsAbs: null,
      metrics: { typicalPrice: 6731 },
    } as RadarEntry;

    const html = renderToStaticMarkup(<RadarBikeCard entry={entry} />);
    const link = html.match(
      /<a\b[^>]*href="\/radar\/v9_pro"[^>]*>([\s\S]*?)<\/a>/,
    );

    expect(link).not.toBeNull();
    expect(link![1]).toContain('<img src="/v9-pro.avif"');
    expect(link![1]).toContain("V9 Pro");
    expect(link![1]).toContain("Ver bike e histórico");
    expect(link![1]).not.toContain("<a ");
  });
});
