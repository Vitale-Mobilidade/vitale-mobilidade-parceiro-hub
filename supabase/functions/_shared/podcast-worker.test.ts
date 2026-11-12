import { beforeEach, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  fill: vi.fn(),
  publish: vi.fn(),
  verify: vi.fn(),
  alert: vi.fn(),
  spotify: vi.fn(),
}));

vi.mock("../editorial-admin/podcast-preparation.ts", () => ({ fillPreparedPodcastQueue: fake.fill }));
vi.mock("../editorial-admin/podcast-instagram.ts", () => ({
  publishPodcastOnInstagram: fake.publish,
  verifyPodcastInstagramConnection: fake.verify,
}));
vi.mock("../editorial-admin/podcast-alert.ts", () => ({ notifyPodcastError: fake.alert }));
vi.mock("../editorial-admin/podcast-spotify.ts", () => ({ syncReleasedSpotifyEpisodes: fake.spotify }));

import { runPodcastTick } from "../editorial-admin/podcast-worker";

const slot = "2026-11-12T09:15:00Z";
const actor = { id: "admin", role: "admin" };
const description = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  fake.fill.mockResolvedValue(6);
  fake.publish.mockResolvedValue(true);
  fake.spotify.mockResolvedValue(undefined);
});

it("publica a fila pronta na janela sem tentar preparar o conteúdo no mesmo horário", async () => {
  const rpc = vi.fn(async (name: string) => ({
    data: name === "podcast_worker_windows" ? { current: slot } : "abcdefghijk",
  }));
  const db = { rpc } as never;
  await expect(runPodcastTick(db, actor, description)).resolves.toEqual({ status: "released" });
  expect(rpc).toHaveBeenCalledWith("release_next_podcast_episode");
  expect(fake.publish).toHaveBeenCalledWith(db);
  expect(fake.fill).not.toHaveBeenCalled();
  expect(fake.alert).not.toHaveBeenCalled();
});

it("avisa se a Meta não confirmou a postagem após a janela e repõe a fila automaticamente", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { closed: slot } });
  const db = {
    rpc,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: table === "podcast_episode_queue"
            ? { released_at: slot } : { status: "pending" } }),
        }),
      }),
    }),
  } as never;
  await expect(runPodcastTick(db, actor, description)).resolves.toEqual({ status: "prepared", ready: 6 });
  expect(fake.alert).toHaveBeenCalledExactlyOnceWith(db, "Instagram", slot, "podcast_instagram_unconfirmed");
  expect(fake.fill).toHaveBeenCalledExactlyOnceWith(db, actor, description, false);
  expect(fake.publish).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith("release_next_podcast_episode");
});
