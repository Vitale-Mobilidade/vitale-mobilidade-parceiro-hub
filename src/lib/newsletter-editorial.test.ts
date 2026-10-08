import { describe, it, expect, vi, afterEach } from "vitest";
import { renderResendNewsletter, newsletterImageSchema } from "./newsletter";
import { selectNewsletterDrops } from "./newsletter-pauta";
import {
  validateNewsletterEvidence,
  validateNewsletterOpening,
  newsletterDraftSchema,
  writeNewsletter,
  type NewsletterDraft,
} from "./newsletter-writer.server";
const source = {
  id: "article",
  title: "Uma escolha para a cidade",
  text: "A escolha começa pelas necessidades do trajeto e pelos dados da ficha publicada.",
};
const sentence =
  "A escolha começa pelas necessidades do trajeto e pelos dados da ficha publicada. ";
const draft: NewsletterDraft = {
  subject: "O que observar antes da próxima escolha",
  preheader: "Leituras e modelos para entender melhor a sua escolha.",
  headline: "Escolher uma bike começa pelo trajeto",
  opening: [sentence.repeat(2)],
  sections: [
    {
      id: source.id,
      paragraphs: [sentence.repeat(11), sentence.repeat(11)],
      bullets: [sentence.repeat(2)],
      evidence: [source.text],
    },
  ],
};
afterEach(() => vi.unstubAllEnvs());
describe("newsletter editorial", () => {
  it("rejects a literal quote that is not in the given source", () => {
    expect(() =>
      validateNewsletterEvidence(
        {
          ...draft,
          sections: [
            {
              ...draft.sections[0],
              evidence: ["Uma autonomia garantida de 200 quilômetros."],
            },
          ],
        },
        [source],
      ),
    ).toThrow("evidence_invalid");
    expect(() =>
      validateNewsletterEvidence(
        { ...draft, sections: [{ ...draft.sections[0], id: "invented" }] },
        [source],
      ),
    ).toThrow("source_mismatch");
  });
  it("rejects a surprise hook disguised as an intro", () => {
    expect(() => validateNewsletterOpening(["Você sabia que " + sentence.repeat(2)])).toThrow("opening_invalid");
  });
  it("requires a single short independent opening", () => {
    expect(() => validateNewsletterOpening([sentence.repeat(2)])).not.toThrow();
    expect(() => validateNewsletterOpening([sentence.repeat(5)])).toThrow("opening_invalid");
    expect(() => validateNewsletterOpening([sentence, sentence])).toThrow("opening_invalid");
  });
  it("accepts no extra opening feature in the strict draft contract", () => {
    expect(newsletterDraftSchema.safeParse({...draft, surprise: { text: sentence }}).success).toBe(false);
  });
  it("never accepts a draft rejected by the independent reviewer", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "mock-key");
    const response = (value: unknown) =>
      new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: JSON.stringify(value) }] },
          ],
        }),
      );
    const sources = [0, 1, 2, 3].map((i) => ({ ...source, id: `source-${i}` }));
    const reviewedDraft = {
      ...draft,
      sections: sources.map((s) => ({
        ...draft.sections[0],
        id: s.id,
        paragraphs: [sentence.repeat(6)],
        bullets: [sentence],
      })),
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(reviewedDraft))
      .mockResolvedValueOnce(
        response({ approved: false, issues: ["unsupported claim"] }),
      )
      .mockResolvedValueOnce(response(reviewedDraft))
      .mockResolvedValueOnce(
        response({ approved: false, issues: ["unsupported claim"] }),
      );
    await expect(writeNewsletter(sources, 5, request)).rejects.toThrow(
      "review_failed",
    );
    expect(request).toHaveBeenCalledTimes(4);
    expect(
      JSON.parse(JSON.parse(request.mock.calls[2][1].body).input).correction
        .issues,
    ).toContain("unsupported claim");
    expect(JSON.parse(request.mock.calls[0][1].body).store).toBe(false);
    expect(request.mock.calls[0][1].headers["Lovable-API-Key"]).toBe(
      "mock-key",
    );
    expect(request.mock.calls[0][1].headers["X-Lovable-AIG-SDK"]).toBe("fetch");
  });
  it("fails closed when the AI service is unavailable", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "mock-key");
    const request = vi
      .fn()
      .mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(writeNewsletter([source], 5, request)).rejects.toThrow(
      "writer_gateway_failed",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("renders real image sections, context and unsubscribe without accepting active markup", () => {
    const item = {
      title: "Teste <script>alert(1)</script>",
      url: "https://vitalemobilidade.com/radar/v9_max",
      image: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
      paragraphs: [
        "Texto de contexto com <img src=x onerror=alert(1)> que precisa ser escapado.",
      ],
      bullets: ["Um ponto editorial para aprofundar."],
    };
    const result = renderResendNewsletter({
      subject: "Newsletter com contexto",
      headline: "Uma edição editorial completa",
      preheader: "Destaques para conhecer com mais contexto.",
      intro: "Uma introdução editorial sobre as escolhas.",
      articles: [item],
      bike: item,
      videos: [item],
    });
    expect(result.html).toContain("Leia mais no artigo");
    expect(result.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(result.html).toContain('alt="Teste &lt;script&gt;');
    expect(result.html).not.toContain("<script>");
    expect(result.text).toContain("Um ponto editorial");
    expect(
      newsletterImageSchema.safeParse("https://evil.example/track").success,
    ).toBe(false);
  });
});
describe("newsletter price pauta", () => {
  const now = new Date("2026-10-09T13:00:00Z"),
    since = new Date("2026-10-05T13:00:00Z");
  const bike = {
    id: "v9_max",
    name: "V9 Max",
    currentPrice: 4000,
    daily: [
      {
        date: "2026-10-04",
        close: 5000,
        verifiedRuns: 1,
        lastVerifiedAt: "2026-10-04T13:00:00Z",
      },
      {
        date: "2026-10-09",
        close: 4000,
        verifiedRuns: 1,
        lastVerifiedAt: "2026-10-09T12:00:00Z",
      },
    ],
  };
  it("ranks fresh verified period drops without labeling old drops as new", () => {
    expect(selectNewsletterDrops([bike], since, now)[0].percent).toBe(20);
    expect(
      selectNewsletterDrops(
        [
          {
            ...bike,
            daily: bike.daily.map((p) => ({
              ...p,
              lastVerifiedAt: "2026-10-06T12:00:00Z",
            })),
          },
        ],
        since,
        now,
      ),
    ).toEqual([]);
    expect(
      selectNewsletterDrops([{ ...bike, currentPrice: 4200 }], since, now),
    ).toEqual([]);
    expect(
      selectNewsletterDrops(
        [
          {
            ...bike,
            daily: bike.daily.map((p) => ({ ...p, verifiedRuns: 0 })),
          },
        ],
        since,
        now,
      ),
    ).toEqual([]);
    expect(
      selectNewsletterDrops([bike], new Date("2026-10-10T13:00:00Z"), now),
    ).toEqual([]);
  });
});

it("accepts only typographic whitespace/case differences in a contiguous source quote", () => {
  expect(() =>
    validateNewsletterEvidence(
      {
        ...draft,
        sections: [
          {
            ...draft.sections[0],
            evidence: [source.text.toUpperCase().replace(/ /g, "\n")],
          },
        ],
      },
      [source],
    ),
  ).not.toThrow();
  expect(() =>
    validateNewsletterEvidence(
      {
        ...draft,
        sections: [{ ...draft.sections[0], evidence: ["A escolha começa com autonomia garantida em qualquer trajeto."] }],
      },
      [source],
    ),
  ).toThrow("evidence_invalid");
});

it("repairs invalid literal evidence once and requires final independent approval", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "mock-key");
  const sources = [0, 1, 2, 3].map((i) => ({ ...source, id: `source-${i}` }));
  const valid = {
    ...draft,
    sections: sources.map((s) => ({
      ...draft.sections[0],
      id: s.id,
      paragraphs: [sentence.repeat(6)],
      bullets: [sentence],
    })),
  };
  const invalid = {
    ...valid,
    sections: valid.sections.map((s) => ({
      ...s,
      evidence: ["Uma alegação que não consta na fonte publicada."],
    })),
  };
  const response = (value: unknown) =>
    new Response(
      JSON.stringify({
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(value) }] },
        ],
      }),
    );
  const request = vi
    .fn()
    .mockResolvedValueOnce(response(invalid))
    .mockResolvedValueOnce(response(valid))
    .mockResolvedValueOnce(response({ approved: true, issues: [] }));
  await expect(writeNewsletter(sources, 1, request)).resolves.toMatchObject({
    subject: valid.subject,
  });
  expect(request).toHaveBeenCalledTimes(3);
  expect(
    JSON.parse(JSON.parse(request.mock.calls[1][1].body).input).correction
      .issues,
  ).toContain("newsletter_writer_evidence_invalid");
});
it("normalizes wrapping typographic quotes without accepting changed facts", () => {
  const valid = {
    ...draft,
    sections: [{ ...draft.sections[0], evidence: [`“${source.text}”`] }],
  };
  expect(() => validateNewsletterEvidence(valid, [source])).not.toThrow();
  expect(() =>
    validateNewsletterEvidence(
      {
        ...valid,
        sections: [{ ...valid.sections[0], evidence: [`“${source.text.replace("necessidades", "garantias")}”`] }],
      },
      [source],
    ),
  ).toThrow("evidence_invalid");
});
