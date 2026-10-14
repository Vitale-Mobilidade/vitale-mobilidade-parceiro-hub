import React from "react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ArticleView,
  type PublishedArticle,
} from "@/components/editorial/ArticleView";
import { articleSchemas } from "@/lib/article-seo";
import { serializeJsonLd } from "@/lib/seo";
import {
  validateArticleForPublication,
  type EditorialArticle,
} from "../../../supabase/functions/_shared/editorial-contract";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
const base = resolve("artifacts/seo-editorial-pilot-2026-10-13");
type SourceRow = EditorialArticle & {
  transcript: string;
  video_title: string;
  published_on: string;
  youtube_url: string;
};
type Proposal = {
  id: string;
  slug: string;
  expectedRevision: number;
  changedBlockIndex: number;
  fields: Partial<EditorialArticle> &
    Pick<
      EditorialArticle,
      | "summary"
      | "summary_source_excerpt"
      | "blocks"
      | "seo_title"
      | "meta_description"
      | "og_title"
      | "og_description"
    >;
};
const sources: SourceRow[] = JSON.parse(
  readFileSync(resolve(base, "source-backup.local"), "utf8"),
).rows;
const proposals: Proposal[] = JSON.parse(
  readFileSync(resolve(base, "proposal.local"), "utf8"),
);
const selected = JSON.parse(
  readFileSync(resolve(base, "selected-slugs.json"), "utf8"),
);
const normalize = (s: string) =>
  s.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

describe("reviewed editorial pilot", () => {
  it("has exactly ten distinct published sources, with complete transcripts and revision guards", () => {
    expect(proposals).toHaveLength(10);
    expect(new Set(proposals.map((p: Proposal) => p.id)).size).toBe(10);
    expect(proposals.map((p: Proposal) => p.slug)).toEqual(selected);
    for (const p of proposals) {
      const old = sources.find((r: SourceRow) => r.id === p.id)!;
      expect(old.status).toBe("published");
      expect(old.indexable).toBe(true);
      expect(old.foundation_required).toBe(false);
      expect(old.transcript.length).toBeGreaterThan(1000);
      expect(p.expectedRevision).toBe(old.revision);
      for (const immutable of [
        "slug",
        "status",
        "indexable",
        "published_at",
        "video_id",
        "primary_bike_id",
        "related_bike_ids",
        "faq",
        "foundation_required",
        "revision",
      ])
        expect(p.fields).not.toHaveProperty(immutable);
    }
  });

  for (const p of proposals) {
    it(`validates source, metadata and SSR: ${p.slug}`, () => {
      const old = sources.find((r: SourceRow) => r.id === p.id)!;
      const merged = { ...old, ...p.fields };
      const known = new Set<string>(
        [merged.primary_bike_id, ...merged.related_bike_ids].filter(
          (id): id is string => Boolean(id),
        ),
      );
      expect(
        validateArticleForPublication(merged, old.transcript, known),
      ).toEqual([]);
      const changed = p.fields.blocks[p.changedBlockIndex];
      expect(changed.text).not.toBe(old.blocks[p.changedBlockIndex].text);
      expect(normalize(old.transcript)).toContain(
        normalize(changed.sourceExcerpt),
      );
      expect(normalize(old.transcript)).toContain(
        normalize(p.fields.summary_source_excerpt),
      );
      for (let i = 0; i < p.fields.blocks.length; i++) {
        if (p.fields.blocks[i].text !== old.blocks[i].text)
          expect(normalize(old.transcript)).toContain(
            normalize(p.fields.blocks[i].sourceExcerpt),
          );
      }
      expect(p.fields.seo_title.length).toBeLessThanOrEqual(65);
      expect(p.fields.meta_description.length).toBeLessThanOrEqual(180);
      expect(p.fields.summary).not.toBe(old.summary);
      expect(p.fields.summary).not.toMatch(
        /melhor.*(?:sempre|garantid)|autonomia garantida/i,
      );
      const a: PublishedArticle = {
        id: merged.id,
        slug: merged.slug,
        title: merged.title,
        summary: merged.summary,
        blocks: merged.blocks,
        faq: merged.faq,
        seoTitle: merged.seo_title,
        metaDescription: merged.meta_description,
        ogTitle: merged.og_title,
        ogDescription: merged.og_description,
        ogImageUrl: null,
        indexable: merged.indexable,
        publishedAt: merged.published_at,
        videoId: merged.video_id,
        primaryBikeId: merged.primary_bike_id,
        relatedBikeIds: merged.related_bike_ids,
        relatedArticleIds: merged.related_article_ids,
      };
      const html = renderToStaticMarkup(
        <ArticleView
          article={a}
          bikes={[]}
          sourceVideo={{
            videoId: old.video_id,
            title: old.video_title,
            date: old.published_on,
            url: old.youtube_url,
            thumbnail: `https://i.ytimg.com/vi/${old.video_id}/hqdefault.jpg`,
          }}
        />,
      );
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(changed.heading);
      expect(html).toContain(`https://www.youtube.com/watch?v=${old.video_id}`);
      expect(html).not.toContain("sourceExcerpt");
      expect(html).not.toContain(old.blocks[p.changedBlockIndex].sourceExcerpt);
      const schemas = articleSchemas(a);
      expect(schemas[0].datePublished).toBe(old.published_at);
      expect(schemas[0]).not.toHaveProperty("dateModified");
      expect(schemas[0].mainEntityOfPage).toBe(
        `https://vitalemobilidade.com/conteudos/${old.slug}`,
      );
      mkdirSync(resolve(base, "preview"), { recursive: true });
      const head = `<meta charset="utf-8"><title>${p.fields.seo_title}</title><meta name="robots" content="noindex"><style>body{font:18px/1.65 system-ui;max-width:1050px;margin:40px auto;padding:24px}h1{line-height:1.2}section{margin:32px 0}a{color:#078251}img{max-width:100%}</style>`;
      writeFileSync(
        resolve(base, "preview", `${p.slug}.html`),
        `<!doctype html><html lang="pt-BR"><head>${head}</head><body><p>Preview local — não publicado</p>${html}</body></html>`,
      );
      expect(serializeJsonLd(schemas)).not.toContain("</script>");
    });
  }
});
