import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LinksInstagramFunnel } from "./LinksInstagramFunnel";
import type { JourneyReport } from "../../../supabase/functions/_shared/links-journey";
const sample: JourneyReport = {
  collectionEnabled: true,
  coverageSince: "2026-11-22T12:00:00Z",
  sessions: 40,
  clicked: 32,
  continued: 20,
  converted: 8,
  offset: 0,
  choices: [
    { choice: "quiz", sessions: 16, clicks: 18, continued: 15, converted: 5 },
    { choice: "radar", sessions: 12, clicks: 14, continued: 11, converted: 3 },
    { choice: "whatsapp", sessions: 8, clicks: 8, continued: 0, converted: 0 },
    {
      choice: "youtube_video",
      sessions: 5,
      clicks: 6,
      continued: 0,
      converted: 0,
    },
  ],
  conversions: [
    { stage: "quiz_started", sessions: 14 },
    { stage: "quiz_completed", sessions: 6 },
    { stage: "newsletter_subscribed", sessions: 2 },
    { stage: "offer_click", sessions: 3 },
  ],
  journeys: [
    {
      session: "12345678-1234-4123-8123-123456789abc",
      startedAt: "2026-11-22T20:00:00Z",
      steps: [
        {
          sequence: 0,
          stage: "landing",
          path: "/links",
          choice: "",
          bikeId: "",
          at: "2026-11-22T20:00:00Z",
        },
        {
          sequence: 1,
          stage: "button_click",
          path: "/links",
          choice: "radar",
          bikeId: "",
          at: "2026-11-22T20:00:02Z",
        },
        {
          sequence: 2,
          stage: "page_view",
          path: "/radar/v8_ultra",
          choice: "",
          bikeId: "",
          at: "2026-11-22T20:00:05Z",
        },
        {
          sequence: 3,
          stage: "offer_click",
          path: "/radar/v8_ultra",
          choice: "",
          bikeId: "v8_ultra",
          at: "2026-11-22T20:00:08Z",
        },
      ],
    },
  ],
};
const render = (data?: JourneyReport) =>
  renderToStaticMarkup(
    <LinksInstagramFunnel
      data={data}
      views={53}
      offset={0}
      onPage={() => {}}
    />,
  );
describe("Instagram funnel presentation", () => {
  it("shows stages, independent button choices, downstream events and anonymous sequences", () => {
    const html = render(sample);
    expect(html).toContain("80%");
    expect(html).toContain("50%");
    expect(html).toContain("20%");
    expect(html).toContain("Sessão 1");
    expect(html).toContain("Escolheu Radar de preços");
    expect(html).toContain("Clique em oferta não comprova compra");
    expect(html).not.toContain(sample.journeys[0].session);
    expect(html).not.toContain("Google Ads");
    expect(html).not.toContain("Meta Ads");
  });
  it("keeps missing measurements distinct from measured zeros", () => {
    const html = render();
    expect(html).toContain("não permitem reconstruir cliques");
    expect(html).not.toContain("80%");
    expect(render({ ...sample, collectionEnabled: false })).toContain(
      "Ativação pendente",
    );
  });
  it("stops pagination at the bounded admin history limit", () => {
    const html = renderToStaticMarkup(
      <LinksInstagramFunnel
        data={{ ...sample, sessions: 20000 }}
        views={53}
        offset={10000}
        onPage={() => {}}
      />,
    );
    expect(html).toMatch(/disabled=""[^>]*>Próximas</);
  });
  it("renders a labelled review artifact when explicitly requested", () => {
    if (!process.env.VITALE_FUNNEL_PREVIEW_PATH) return;
    const out = process.env.VITALE_FUNNEL_PREVIEW_PATH;
    mkdirSync(out, { recursive: true });
    const assets = join(process.cwd(), ".output/public/assets");
    const css = readdirSync(assets)
      .filter((x) => x.endsWith(".css"))
      .map((x) => readFileSync(join(assets, x), "utf8"))
      .join("\n");
    writeFileSync(
      join(out, "preview.html"),
      `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prévia do funil Instagram</title><style>${css}</style><body class="bg-surface text-ink"><div class="bg-mint p-3 text-center text-sm font-bold">PRÉVIA LOCAL · DADOS SIMULADOS · NÃO PUBLICADO</div><main class="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><header><p class="text-sm font-bold text-action">INSTAGRAM · LINK DA BIO</p><h1 class="mt-2 text-3xl font-bold">Da bio ao próximo passo.</h1><p class="mt-2 text-muted-foreground">22 de novembro de 2026 · jornadas anônimas e conversões</p></header>${render(sample)}</main></body></html>`,
    );
  });
});
