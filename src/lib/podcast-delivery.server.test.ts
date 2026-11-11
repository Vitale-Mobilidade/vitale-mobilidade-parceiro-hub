import { afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  enabled: false,
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
  fixture.episode = null;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("does not expose the feed or sign private media while distribution is disabled", async () => {
  expect((await servePodcastFeed(false)).status).toBe(404);
  expect((await servePodcastAudio(request(), id)).status).toBe(404);

});

it("serves released metadata and supports HEAD and a byte range without exposing the signed URL", async () => {
  fixture.enabled = true;
  fixture.episode = {
    youtube_id: id, title: "V20 Ultra", original_description: "Teste & farol",
    released_at: "2025-11-12T14:45:00Z", object_path: "private/v20.mp3", size_bytes: 15701351,
  };
  const feed = await (await servePodcastFeed(false)).text();
  expect(feed).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
  expect(feed).toContain("<itunes:explicit>false</itunes:explicit>");
  expect(feed).toContain("Teste &amp; farol");
  expect(feed).toContain(`https://www.youtube.com/watch?v=${id}`);
  expect(feed).not.toContain(fixture.episode.object_path);
  const head = await servePodcastAudio(request({ method: "HEAD" }), id);
  expect(head.headers.get("Content-Length")).toBe("15701351");
  vi.stubEnv("SUPABASE_URL", "https://storage.example");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  const fetcher = vi.fn(async (url: URL, init: RequestInit) => {
    expect(url.href).toBe("https://storage.example/storage/v1/object/authenticated/podcast-audio/private/v20.mp3");
    const headers = new Headers(init.headers);
    expect(headers.get("range")).toBe("bytes=0-3");
    expect(headers.get("apikey")).toBe("sb_secret_test");
    expect(headers.get("authorization")).toBeNull();
    return new Response(new Uint8Array([255, 251, 0, 0]), {
      status: 206, headers: { "Content-Range": "bytes 0-3/15701351", "Content-Length": "4" },
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const audio = await servePodcastAudio(request({ headers: { Range: "bytes=0-3" } }), id);
  expect(audio.status).toBe(206);
  expect(audio.headers.get("Content-Range")).toBe("bytes 0-3/15701351");
  expect(audio.headers.get("Location")).toBeNull();
  expect((await audio.arrayBuffer()).byteLength).toBe(4);
});

it("uses the static media for the released pilot only", async () => {
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
