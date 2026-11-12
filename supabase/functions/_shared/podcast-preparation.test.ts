import { createClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { preparePodcastDraft } from "../editorial-admin/podcast-preparation";
import { notifyPodcastError } from "../editorial-admin/podcast-alert";

afterEach(() => vi.unstubAllGlobals());

const articleId = "11223344-1234-1234-1234-123456789abc";
const articleVersion = "2026-11-12T02:00:00.000Z";
const video = "abcdefghijk";

function fixture(width: number) {
  const writes: { path: string; body: unknown }[] = [];
  const db = createClient("https://supabase.example", "test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
        const path = new URL(request instanceof Request ? request.url : request.toString()).pathname;
        if (path.includes("/object/info/")) return Response.json({ size: 500 });
        if (path.includes("/object/editorial-covers/")) {
          writes.push({ path, body: init?.body });
          return Response.json({ Key: path });
        }
        if (path.endsWith("/editorial_articles")) return Response.json([{
          id: articleId, slug: "teste-ft07", updated_at: articleVersion,
          summary: "Resumo do artigo. https://example.com",
          og_image_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
        }]);
        if (path.endsWith("/podcast_episode_queue")) {
          if (init?.method === "PATCH") {
            writes.push({ path, body: JSON.parse(String(init.body)) });
            return new Response(null, { status: 204 });
          }
          return Response.json([{ object_path: "private/fixture.mp3" }]);
        }
        throw new Error(`Unexpected path ${path}`);
      }),
    },
  });
  const bytes = Uint8Array.of(255, 216, 255, 192, 0, 7, 8, 5, 120, width >> 8, width & 255, 255, 217);
  const render = vi.fn(async (url: URL) => {
    expect(url.searchParams.get("layout")).toBe("3");
    expect(url.searchParams.get("v")).toBe(String(Date.parse(articleVersion)));
    return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(bytes.length) } });
  });
  vi.stubGlobal("fetch", render);
  return { db: db as never, writes, bytes };
}

it("salva a capa 1:1 no bucket privado antes de confirmar a legenda preparada", async () => {
  const f = fixture(1400);
  await preparePodcastDraft(f.db, video);
  expect(f.writes[1]).toMatchObject({
    path: `/storage/v1/object/editorial-covers/${articleId}/podcast-covers/v3-${Date.parse(articleVersion)}.jpg`,
    body: f.bytes,
  });
  expect(f.writes[2]?.body).toMatchObject({
    prepared_article_version: articleVersion,
    prepared_instagram_post: { caption: "Resumo do artigo.\n\nSaiba mais no link da Bio" },
  });
});

it("mantém o episódio fora da fila preparada se o render devolver proporção errada", async () => {
  const f = fixture(1280);
  await expect(preparePodcastDraft(f.db, video)).rejects.toThrow("podcast_cover_render_failed");
  expect(f.writes).toHaveLength(1);
  expect(f.writes[0].body).toHaveProperty("preparation_attempted_at");
});

it("envia um alerta operacional por falha da janela e registra a entrega", async () => {
  const audit: Record<string, unknown>[] = [];
  const sender = "operacao@example.com";
  const env: Record<string, string> = { RESEND_API_KEY: "fake-connection", LOVABLE_API_KEY: "fake-gateway" };
  vi.stubGlobal("Deno", { env: { get: (key: string) => env[key] } });
  const sent = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "mock-email" }));
  vi.stubGlobal("fetch", sent);
  const db = createClient("https://supabase.example", "test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
        const path = new URL(request instanceof Request ? request.url : request.toString()).pathname;
        if (path.endsWith("/newsletter_settings")) return Response.json({ from_email: sender });
        if (init?.method === "POST") {
          audit.push(JSON.parse(String(init.body)));
          return new Response(null, { status: 201 });
        }
        return Response.json(audit);
      }),
    },
  }) as never;
  const slot = "2026-11-12T09:15:00Z";
  await notifyPodcastError(db, "Instagram", slot, "podcast_instagram_unconfirmed");
  await notifyPodcastError(db, "Instagram", slot, "podcast_instagram_unconfirmed");
  expect(sent).toHaveBeenCalledTimes(1);
  expect(sent.mock.calls[0]?.[0]).toBe("https://connector-gateway.lovable.dev/resend/emails");
  const request = sent.mock.calls[0]?.[1];
  expect(request?.headers).toMatchObject({ "Idempotency-Key": expect.stringMatching(/^podcast-error-[a-f0-9]{64}$/) });
  expect(JSON.parse(String(request?.body))).toMatchObject({
    from: sender, to: ["guilherme@hotpipe.com.br"],
    text: expect.stringContaining("https://vitalemobilidade.com/admin/podcasts"),
  });
  expect(audit[0]).toMatchObject({ action: "podcast_alert_sent", entity_type: "podcast" });
});
