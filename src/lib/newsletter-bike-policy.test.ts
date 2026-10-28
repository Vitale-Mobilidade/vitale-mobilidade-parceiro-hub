import { expect, it } from "vitest";
import {
  excludedNewsletterMotorcycle,
  newsletterBikeTopic,
  validateNewsletterBikeFocus,
} from "./newsletter-bike-policy";
import {
  curateNewsletter,
  selectFeaturedNewsletterBike,
} from "./newsletter-curation";
import { newsletterWindow } from "./newsletter";
import { newsletterPreparation } from "./newsletter-preparation";
it("opens only Monday Wednesday Friday 06:30 through 08:29 Sao Paulo", () => {
  for (let day = 19; day <= 25; day++) {
    const send = [19, 21, 23].includes(day);
    for (const [time, due] of [
      ["09:29", false],
      ["09:30", send],
      ["11:29", send],
      ["11:30", false],
    ] as const)
      expect(newsletterWindow(new Date(`2026-10-${day}T${time}:00Z`)).due).toBe(
        due,
      );
  }
});
it("prepares Sunday Tuesday Thursday and recovers on delivery days", () => {
  for (let day = 18; day <= 24; day++) {
    expect(
      newsletterPreparation(new Date(`2026-10-${day}T09:30:00Z`)).due,
    ).toBe([18, 19, 20, 21, 22, 23].includes(day));
  }
  for (const [day, target] of [
    [18, 19],
    [20, 21],
    [22, 23],
  ]) {
    expect(
      newsletterPreparation(new Date(`2026-10-${day}T09:29:00Z`)).due,
    ).toBe(false);
    expect(
      newsletterPreparation(new Date(`2026-10-${day}T09:30:00Z`)).day,
    ).toBe(`2026-10-${target}`);
  }
});
it("excludes motorcycles by name and canonical ID without excluding bikes", () => {
  for (const x of ["Voltz EVS", "voltz_ev1", "EV-1", "Voltz EV1 Sport"])
    expect(excludedNewsletterMotorcycle(x)).toBe(true);
  expect(excludedNewsletterMotorcycle("Inow V9 Max")).toBe(false);
  expect(
    selectFeaturedNewsletterBike(
      [{ id: "voltz_evs" }, { id: "voltz_ev1" }, { id: "inow_v9" }],
      [],
      [],
    )?.id,
  ).toBe("inow_v9");
  expect(
    selectFeaturedNewsletterBike([{ id: "voltz_evs" }], [], []),
  ).toBeUndefined();
});
it("does not backfill motorcycle articles or videos when sources are scarce", () => {
  const moto = {
    title: "Review Voltz EVS",
    publishedAt: "2026-10-17",
    videoId: "moto",
  };
  const bike = {
    title: "Guia de bikes",
    publishedAt: "2026-10-16",
    videoId: "bike",
  };
  const selected = curateNewsletter(
    [moto, bike],
    [{ ...moto, title: "EV1 na prática" }],
    new Date("2026-10-01"),
    new Date("2026-10-18"),
  );
  expect(selected.articles).toEqual([bike]);
  expect(selected.videos).toEqual([]);
});
it("blocks an old draft featuring a motorcycle before sending", () => {
  const content = {
    subject: "Bikes na semana",
    intro: "Vamos pedalar",
    bike: {
      title: "Inow V9",
      url: "https://vitalemobilidade.com/radar/inow_v9",
    },
  };
  expect(() => validateNewsletterBikeFocus(content)).not.toThrow();
  expect(() =>
    validateNewsletterBikeFocus({ ...content, subject: "#4 — Voltz EVS" }),
  ).toThrow("newsletter_motorcycle_highlight_excluded");
  expect(() =>
    validateNewsletterBikeFocus({
      ...content,
      bike: {
        ...content.bike,
        url: "https://vitalemobilidade.com/radar/voltz_ev1",
      },
    }),
  ).toThrow();
});

it("rejects generic motorcycle leads but keeps bike comparison themes", () => {
  expect(
    newsletterBikeTopic(
      "Moto elétrica vale a pena? O que avaliar antes de comprar",
    ),
  ).toBe(false);
  expect(
    newsletterBikeTopic("Bicicleta elétrica ou moto: compare seu trajeto"),
  ).toBe(true);
  expect(newsletterBikeTopic("Bike elétrica e ciclovias")).toBe(true);
  const content = {
    subject: "#4 — Bikes na subida",
    intro: "Motor e pedal fazem dupla",
    bike: { title: "V8 Pro", url: "https://vitalemobilidade.com/radar/v8_pro" },
    articles: [{ title: "Moto elétrica vale a pena?" }],
  };
  expect(() => validateNewsletterBikeFocus(content)).toThrow(
    "newsletter_motorcycle_highlight_excluded",
  );
  expect(() =>
    validateNewsletterBikeFocus({
      ...content,
      articles: [{ title: "V8 Pro na subida" }],
    }),
  ).not.toThrow();
});
it("never fills a scarce slot with a generic motorcycle review", () => {
  const article = {
    title: "Moto elétrica vale a pena?",
    publishedAt: "2026-10-17",
  };
  const selected = curateNewsletter(
    [article],
    [],
    new Date("2026-10-01"),
    new Date("2026-10-18"),
  );
  expect(selected.articles).toHaveLength(0);
});

it("excludes filming from both source selection and the delivery boundary", async () => {
  const { newsletterReaderTopic } = await import("./newsletter-bike-policy");
  expect(newsletterReaderTopic("Como gravar vídeos andando de bike")).toBe(
    false,
  );
  expect(newsletterReaderTopic("Celular no peito e câmera no pedal")).toBe(
    false,
  );
  expect(newsletterReaderTopic("Pneus e câmaras de ar da V8 Pro")).toBe(true);
});
