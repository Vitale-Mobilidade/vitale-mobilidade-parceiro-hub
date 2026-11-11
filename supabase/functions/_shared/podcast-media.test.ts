import { afterEach, expect, it, vi } from "vitest";
import { serveReleasedPodcastMedia } from "../editorial-admin/podcast-media";

const id = "qzaQ3G7PRl8";
const request = (init?: RequestInit) => new Request(`https://edge.example/podcast/audio/${id}`, init);

function mockDb(released: boolean) {
  const sign = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example/private-audio" } });
  const db = {
    from(table: string) {
      expect(table).toBe("podcast_released_episodes");
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          expect([column, value]).toEqual(["youtube_id", id]);
          return query;
        },
        maybeSingle: async () => ({ data: released ? { object_path: "private/ft07.mp3", size_bytes: 23_120_427 } : null }),
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: sign }) },
  } as never;
  return { db, sign };
}

afterEach(() => vi.unstubAllGlobals());

it("keeps drafts inaccessible and does not sign their objects", async () => {
  const { db, sign } = mockDb(false);
  expect((await serveReleasedPodcastMedia(request(), id, db)).status).toBe(404);
  expect(sign).not.toHaveBeenCalled();
});

it("streams audio with byte ranges and keeps the Storage link on the server", async () => {
  const { db, sign } = mockDb(true);
  const head = await serveReleasedPodcastMedia(request({ method: "HEAD" }), id, db);
  expect(head.headers.get("Content-Length")).toBe("23120427");
  expect(sign).not.toHaveBeenCalled();
  const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), {
    status: 206,
    headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-3/23120427" },
  }));
  vi.stubGlobal("fetch", fetcher);
  const audio = await serveReleasedPodcastMedia(request({ headers: { Range: "bytes=0-3" } }), id, db);
  expect(audio.status).toBe(206);
  expect(audio.headers.get("Content-Range")).toBe("bytes 0-3/23120427");
  expect(audio.headers.get("Location")).toBeNull();
  expect(new Uint8Array(await audio.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  expect(fetcher.mock.calls[0][1].headers).toEqual({ Range: "bytes=0-3" });
});
