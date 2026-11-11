import { afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  enabled: false,
  article: null as null | { video_id: string; slug: string; title: string; summary: string; og_image_url: string; updated_at: string },
  episode: null as null | {
    youtube_id: string; title: string; original_description: string;
    released_at: string; object_path: string; size_bytes: number;
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      const query = {
        select: () => query,
        eq: () => query,
        not: () => query,
        in: async (_column: string, ids: string[]) => ({
          data: fixture.article && ids.includes(fixture.article.video_id) ? [fixture.article] : [],
        }),
        order: () => query,
        maybeSingle: async () => ({
          data: table === "podcast_distribution_settings"
            ? { feed_enabled: fixture.enabled, verification_email: null }
            : fixture.enabled ? fixture.episode : null,
        }),
        limit: async () => ({ data: fixture.episode ? [fixture.episode] : [] }),
      };
      return query;
    },
  },
}));

import { servePodcastAudio, servePodcastFeed } from "./podcast-delivery.server";
const id = "qzaQ3G7PRl8";
const request = (init?: RequestInit) => new Request(`https://vitalemobilidade.com/podcast/audio/${id}`, init);

afterEach(() => {
  fixture.enabled = false;
  fixture.article = null;
  fixture.episode = null;
});

it("does not expose the feed or sign private media while distribution is disabled", async () => {
  expect((await servePodcastFeed(false)).status).toBe(404);
  expect((await servePodcastAudio(request(), id)).status).toBe(404);

});

it("serves released metadata and sends audio readers to the media function", async () => {
  fixture.enabled = true;
  fixture.episode = {
    youtube_id: id, title: "V20 Ultra", original_description: "Teste & farol",
    released_at: "2025-11-12T14:45:00Z", object_path: "private/v20.mp3", size_bytes: 15701351,
  };
  const feed = await (await servePodcastFeed(false)).text();
  expect(feed).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
  expect(feed).toContain("<itunes:explicit>false</itunes:explicit>");
  expect(feed).toContain("Teste &amp;amp; farol");
  expect(feed).not.toContain("/podcast/capas/");
  expect(feed).toContain(`https://www.youtube.com/watch?v=${id}`);
  expect(feed).not.toContain(fixture.episode.object_path);
  const head = await servePodcastAudio(request({ method: "HEAD" }), id);
  expect(head.headers.get("Content-Length")).toBe("15701351");
  const audio = await servePodcastAudio(request({ headers: { Range: "bytes=0-3" } }), id);
  expect(audio.status).toBe(307);
  expect(audio.headers.get("Location")).toBe(
    "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin/podcast/audio/" + id,
  );
});

it("keeps the static media fallback for the released pilot", async () => {
  const pilot = "byk0-p8NedQ";
  fixture.enabled = true;
  fixture.episode = {
    youtube_id: pilot, title: "V20 Ultra", original_description: "Teste de farol",
    released_at: "2026-11-11T19:35:00Z", object_path: "private/v20.mp3", size_bytes: 15701351,
  };
  const feed = await (await servePodcastFeed(false)).text();
  expect(feed).toContain("https://vitalemobilidade.com/podcast/episodios/v20-ultra-farol.mp3");
  const result = await servePodcastAudio(new Request("https://vitalemobilidade.com/podcast/audio/" + pilot), pilot);
  expect(result.status).toBe(307);
  expect(result.headers.get("Location")).toBe("/podcast/episodios/v20-ultra-farol.mp3");
});


it("gives a released episode its published article, cover and readable show notes", async () => {
  fixture.enabled = true;
  fixture.episode = {
    youtube_id: id, title: "FT07", released_at: "2026-11-11T20:45:02Z",
    original_description: "Opções de compra <script>\nhttps://example.com/?a=1&b=2\n\nBateria: 60 V\nMotor: 2.000 W",
    object_path: "private/ft07.mp3", size_bytes: 23120427,
  };
  fixture.article = {
    video_id: id, slug: "teste-ft07", title: "FT07 em teste", summary: "Resumo do artigo & contexto.",
    og_image_url: "https://i.ytimg.com/vi/qzaQ3G7PRl8/maxresdefault.jpg", updated_at: "2026-11-11T18:00:00Z",
  };
  const feed = await (await servePodcastFeed(false)).text();
  expect(feed).toContain("<link>https://vitalemobilidade.com/conteudos/teste-ft07</link>");
  expect(feed).toContain('itunes:image href="https://vitalemobilidade.com/podcast/capas/teste-ft07.jpg?v=');
  expect(feed).toContain("&lt;p&gt;Resumo do artigo &amp;amp; contexto.&lt;/p&gt;\n&lt;p&gt;&lt;strong&gt;Leia o artigo completo");
  expect(feed).toContain("&lt;ul&gt;&lt;li&gt;Bateria: 60 V&lt;/li&gt;&lt;li&gt;Motor: 2.000 W&lt;/li&gt;&lt;/ul&gt;");
  expect(feed).toContain("https://example.com/?a=1&amp;amp;b=2");
  expect(feed).toContain("&amp;lt;script&amp;gt;");
  expect(feed).toContain('<guid isPermaLink="false">vitale:youtube:qzaQ3G7PRl8</guid>');
  expect(feed).toContain('url="https://vitalemobilidade.com/podcast/audio/qzaQ3G7PRl8" length="23120427"');
});
