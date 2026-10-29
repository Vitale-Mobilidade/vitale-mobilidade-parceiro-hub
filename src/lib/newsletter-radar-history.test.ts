import { expect, it } from "vitest";
import { selectNewsletterDrops } from "./newsletter-pauta";
import { renderResendNewsletter } from "./newsletter";

const now = new Date("2026-10-29T14:00:00Z");
const point = (date: string, close: number) => ({
  date,
  close,
  verifiedRuns: 1,
  lastVerifiedAt: `${date}T13:00:00Z`,
});
const bike = (id: string, price: number) => ({
  id,
  name: id,
  currentPrice: price,
  daily: [
    point("2026-10-10", 100),
    point("2026-10-28", price),
    point("2026-10-29", price),
  ],
});

it("fills three cards from earlier history even when the last daily price was unchanged", () => {
  const result = selectNewsletterDrops(
    [bike("a", 90), bike("b", 80), bike("c", 70), bike("d", 60)],
    now,
  );
  expect(result.map((x) => x.id)).toEqual(["d", "c", "b"]);
  expect(result.map((x) => x.baselineDate)).toEqual([
    "2026-10-10",
    "2026-10-10",
    "2026-10-10",
  ]);
  expect(result[0].percent).toBe(40);
});
it("chooses the most recent higher price instead of an older maximum", () => {
  const result = selectNewsletterDrops(
    [
      {
        ...bike("a", 80),
        daily: [
          point("2026-10-01", 1000),
          point("2026-10-20", 100),
          point("2026-10-28", 70),
          point("2026-10-29", 80),
        ],
      },
    ],
    now,
  );
  expect(result[0]).toMatchObject({
    previous: 100,
    current: 80,
    percent: 20,
    baselineDate: "2026-10-20",
  });
});
it("never fills missing cards with an equal or higher current price", () => {
  expect(
    selectNewsletterDrops(
      [bike("a", 100), bike("b", 110), bike("c", 90)],
      now,
    ).map((x) => x.id),
  ).toEqual(["c"]);
});
it("rejects future reference dates and unverified reference prices", () => {
  const current = point("2026-10-29", 80);
  const future = {
    ...point("2026-10-30", 100),
    lastVerifiedAt: current.lastVerifiedAt,
  };
  const unverified = { ...point("2026-10-20", 100), verifiedRuns: 0 };
  expect(
    selectNewsletterDrops(
      [{ ...bike("a", 80), daily: [future, unverified, current] }],
      now,
    ),
  ).toEqual([]);
});
it("keeps stale observations, unavailable current snapshots and excluded motorcycles out", () => {
  expect(
    selectNewsletterDrops(
      [
        {
          ...bike("stale", 80),
          daily: [point("2026-10-10", 100), point("2026-10-27", 80)],
        },
        {
          ...bike("mismatch", 85),
          daily: [point("2026-10-10", 100), point("2026-10-29", 80)],
        },
        bike("evs", 80),
      ],
      now,
    ),
  ).toEqual([]);
});
it("renders three historical comparisons without the aggregated date/verification note", () => {
  const drops = ["a", "b", "c"].map((id) => ({
    title: id,
    url: `https://vitalemobilidade.com/radar/${id}`,
    previousPrice: "R$ 100,00",
    currentPrice: "R$ 80,00",
    dropLabel: "−20,0%",
    baselineDate: "2026-10-10",
    checkedAt: "29/10/2026, 10:00:00",
  }));
  const rendered = renderResendNewsletter({
    subject: "Uma edição para acompanhar",
    headline: "Uma edição para acompanhar",
    intro: "Bikes e leituras para acompanhar a mobilidade.",
    articles: [
      { title: "Artigo", url: "https://vitalemobilidade.com/conteudos/artigo" },
    ],
    bike: { title: "Bike", url: "https://vitalemobilidade.com/radar/a" },
    videos: [
      { title: "Vídeo", url: "https://www.youtube.com/watch?v=abcdefghijk" },
    ],
    drops,
  });
  expect(rendered.html.match(/Ver histórico →/g)).toHaveLength(3);
  for (const output of [rendered.html, rendered.text]) {
    expect(output).not.toContain("Fechamentos anteriores:");
    expect(output).not.toContain("Verificação:");
    expect(output).not.toContain("2026-10-10");
    expect(output).not.toContain("29/10/2026, 10:00:00");
  }
  expect(drops[0].baselineDate).toBe("2026-10-10");
});
