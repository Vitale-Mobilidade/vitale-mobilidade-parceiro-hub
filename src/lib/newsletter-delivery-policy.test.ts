import { expect, it } from "vitest";
import fixture from "../../artifacts/newsletter-agent-refined-proof.json";
import { newsletterDraftContentSchema } from "./newsletter-drafts";
const proof = { content: newsletterDraftContentSchema.parse(fixture.content) };
import {
  assertNewsletterEditorial,
  assertNewsletterArticleImages,
  selectNewsletterArticleImage,
  newsletterCandidateHasOffers,
} from "./newsletter-delivery-policy";

it("blocks contingency mode independently of copy, and detects legacy contingency copy", () => {
  expect(() => assertNewsletterEditorial(proof.content, "fallback")).toThrow(
    "newsletter_editorial_approval_required",
  );
  expect(() =>
    assertNewsletterEditorial({
      ...proof.content,
      articles: [
        {
          ...proof.content.articles[0],
          paragraphs: [
            "Resumo publicado: Texto do acervo publicado anteriormente.",
          ],
        },
      ],
    }),
  ).toThrow("newsletter_editorial_approval_required");
  expect(() => assertNewsletterEditorial(proof.content, "agent")).not.toThrow();
});
it("requires exact active offers for every linked model and title mention across media", () => {
  const catalog = [
    { bikeId: "v35", name: "V35" },
    { bikeId: "v9_max", name: "V9 Max" },
    { bikeId: "v9_max_s", name: "V9 Max S" },
  ];
  const active = new Set(["v9_max"]);
  expect(
    newsletterCandidateHasOffers(
      { title: "Inow V35 é a melhor bike hoje?" },
      catalog,
      active,
    ),
  ).toBe(false);
  expect(
    newsletterCandidateHasOffers(
      {
        title: "Comparativo",
        primaryBikeId: "v9_max",
        relatedBikeIds: ["v35"],
      },
      catalog,
      active,
    ),
  ).toBe(false);
  expect(
    newsletterCandidateHasOffers(
      { title: "Outro título", primaryBikeId: "v9_max_s" },
      catalog,
      active,
    ),
  ).toBe(false);
  expect(
    newsletterCandidateHasOffers({ title: "Review XYZ99" }, catalog, active),
  ).toBe(false);
  expect(
    newsletterCandidateHasOffers(
      { title: "Como cuidar da corrente" },
      catalog,
      active,
    ),
  ).toBe(true);
  expect(
    newsletterCandidateHasOffers({ title: "Conheça V9 Max" }, catalog, active),
  ).toBe(true);
});

it("uses the published article cover when its optional derivative is missing, then the source thumbnail", () => {
  const derivative =
    "https://vitalemobilidade.com/api/public/newsletter-image?id=mock";
  const published =
    "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&id=mock";
  const thumbnail = "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg";
  expect(selectNewsletterArticleImage(derivative, published, thumbnail)).toBe(
    derivative,
  );
  expect(selectNewsletterArticleImage(undefined, published, thumbnail)).toBe(
    published,
  );
  expect(selectNewsletterArticleImage(undefined, null, thumbnail)).toBe(
    thumbnail,
  );
  expect(
    selectNewsletterArticleImage("https://private.invalid/photo.jpg", null),
  ).toBeUndefined();
  expect(() => assertNewsletterArticleImages(proof.content)).not.toThrow();
  expect(() =>
    assertNewsletterArticleImages({
      ...proof.content,
      articles: [{ ...proof.content.articles[0], image: undefined }],
    }),
  ).toThrow("newsletter_article_image_required");
});
