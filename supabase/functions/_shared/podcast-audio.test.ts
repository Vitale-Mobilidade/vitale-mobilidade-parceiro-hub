import { afterEach, expect, it, vi } from "vitest";
import { handlePodcastAudio } from "../editorial-admin/podcast-audio";

const actor = { id: "10000000-0000-4000-8000-000000000001", role: "admin" };
const uploadId = "20000000-0000-4000-8000-000000000001";
const youtubeId = "aBcDEfg_123";
const input = { youtubeId, uploadId, fileName: "episodio.mp3", size: 1024 };
const reply = (data: unknown, status = 200) => Response.json(data, { status });
type Db = Parameters<typeof handlePodcastAudio>[0];

afterEach(() => vi.unstubAllGlobals());

it("provisions the private MP3 bucket before issuing the first upload URL", async () => {
  const settings = {
    public: false,
    file_size_limit: 52428800,
    allowed_mime_types: ["audio/mpeg"],
  };
  const getBucket = vi
    .fn()
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: settings });
  const createBucket = vi
    .fn()
    .mockResolvedValue({ data: { name: "podcast-audio" } });
  const createSignedUploadUrl = vi
    .fn()
    .mockResolvedValue({ data: { token: "test-only" } });
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { youtube_id: youtubeId } }),
        }),
      }),
    }),
    storage: {
      from: () => ({ createSignedUploadUrl }),
      getBucket,
      createBucket,
    },
  } as unknown as Db;
  const result = await handlePodcastAudio(
    db,
    actor,
    "podcast-audio-reserve",
    input,
    true,
    reply,
  );
  expect(result.status).toBe(200);
  expect(createBucket).toHaveBeenCalledWith("podcast-audio", {
    public: false,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ["audio/mpeg"],
  });
  expect(createSignedUploadUrl).toHaveBeenCalledOnce();
  getBucket.mockResolvedValue({ data: { ...settings, public: true } });
  await expect(
    handlePodcastAudio(db, actor, "podcast-audio-reserve", input, true, reply),
  ).rejects.toThrow("podcast_audio_bucket_configuration_failed");
  expect(createSignedUploadUrl).toHaveBeenCalledOnce();
});

it("does not issue upload or preview URLs without the admin role or when disabled", async () => {
  const from = vi.fn();
  const db = { storage: { from } } as unknown as Db;
  const denied = await handlePodcastAudio(
    db,
    { ...actor, role: "content" },
    "podcast-audio-reserve",
    input,
    true,
    reply,
  );
  const disabled = await handlePodcastAudio(
    db,
    actor,
    "podcast-audio-preview",
    input,
    false,
    reply,
  );
  expect([denied.status, disabled.status]).toEqual([403, 503]);
  expect(from).not.toHaveBeenCalled();
});

it("checks the audio frame after ID3 metadata and attaches only the actor's object", async () => {
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://test.invalid/signed" } });
  const rpc = vi.fn().mockResolvedValue({
    data: {
      upload_id: uploadId,
      file_name: input.fileName,
      size_bytes: input.size,
    },
  });
  const db = {
    storage: { from: () => ({ createSignedUrl }) },
    rpc,
  } as unknown as Db;
  const read = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(new Uint8Array([73, 68, 51, 3, 0, 0, 0, 0, 0, 2]), {
        status: 206,
        headers: { "Content-Range": "bytes 0-9/1024" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(new Uint8Array([255, 251, 144, 0]), {
        status: 206,
        headers: { "Content-Range": "bytes 12-15/1024" },
      }),
    );
  vi.stubGlobal("fetch", read);
  const response = await handlePodcastAudio(
    db,
    actor,
    "podcast-audio-attach",
    input,
    true,
    reply,
  );
  expect(response.status).toBe(200);
  expect(createSignedUrl).toHaveBeenCalledWith(
    `${youtubeId}/${actor.id}/${uploadId}.mp3`,
    60,
  );
  expect(read.mock.calls.map(([, options]) => options.headers.Range)).toEqual([
    "bytes=0-9",
    "bytes=12-15",
  ]);
  expect(rpc).toHaveBeenCalledWith("attach_podcast_video_audio", {
    p_youtube_id: youtubeId,
    p_actor: actor.id,
    p_upload_id: uploadId,
    p_file_name: input.fileName,
    p_size: input.size,
  });
});

it("keeps the existing attachment when the upload is unavailable or its bytes are invalid", async () => {
  const rpc = vi.fn();
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://test.invalid/signed" } });
  const db = {
    storage: { from: () => ({ createSignedUrl }) },
    rpc,
  } as unknown as Db;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array(10), {
          status: 206,
          headers: { "Content-Range": "bytes 0-9/1024" },
        }),
      ),
  );
  for (const expected of [
    "Envie o MP3 antes de confirmar o anexo.",
    "O arquivo enviado não é um MP3 válido.",
  ]) {
    const response = await handlePodcastAudio(
      db,
      actor,
      "podcast-audio-attach",
      input,
      true,
      reply,
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: expected });
  }
  expect(rpc).not.toHaveBeenCalled();
});
