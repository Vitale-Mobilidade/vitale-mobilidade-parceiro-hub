import { afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  enabled: false,
  episode: null as null | {
    youtube_id: string; title: string; original_description: string;
    released_at: string; object_path: string; size_bytes: number;
  },
  sign: vi.fn(),
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
    storage: { from: () => ({ createSignedUrl: fixture.sign }) },
  },
}));

import { servePodcastAudio, servePodcastFeed } from "./podcast-delivery.server";
const id = "byk0-p8NedQ";
const request = (init?: RequestInit) => new Request(`https://vitalemobilidade.com/podcast/audio/${id}`, init);

afterEach(() => {
  fixture.enabled = false;
  fixture.episode = null;
  fixture.sign.mockReset();
  vi.unstubAllGlobals();
});

it("does not expose the feed or sign private media while distribution is disabled", async () => {
  expect((await servePodcastFeed(false)).status).toBe(404);
  expect((await servePodcastAudio(request(), id)).status).toBe(404);
  expect(fixture.sign).not.toHaveBeenCalled();
});

it("serves released metadata and supports HEAD and a byte range without exposing the signed URL", async () => {
  fixture.enabled = true;
  fixture.episode = {
    youtube_id: id, title: "V20 Ultra", original_description: "Teste & farol",
    released_at: "2025-11-12T14:45:00Z", object_path: "private/v20.mp3", size_bytes: 15701351,
  };
  const feed = await (await servePodcastFeed(false)).text();
  expect(feed).toContain("Teste &amp; farol");
  expect(feed).toContain(`https://www.youtube.com/watch?v=${id}`);
  expect(feed).not.toContain(fixture.episode.object_path);
  const head = await servePodcastAudio(request({ method: "HEAD" }), id);
  expect(head.headers.get("Content-Length")).toBe("15701351");
  expect(fixture.sign).not.toHaveBeenCalled();
  fixture.sign.mockResolvedValue({ data: { signedUrl: "https://storage.example/audio" } });
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    expect(init.headers).toEqual({ Range: "bytes=0-3" });
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
