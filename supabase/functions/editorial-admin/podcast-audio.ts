import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  hasMp3Signature,
  PODCAST_AUDIO_BUCKET,
  validPodcastAudioName,
  validPodcastAudioSize,
} from "../_shared/podcast-audio-contract.ts";

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const uploadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const missingAudio = "Envie o MP3 antes de confirmar o anexo.";

type Reply = (data: unknown, status?: number) => Response;

export async function handlePodcastAudio(
  db: SupabaseClient,
  actor: { id: string; role: string },
  action: string,
  input: Record<string, unknown>,
  enabled: boolean,
  reply: Reply,
): Promise<Response> {
  if (actor.role !== "admin")
    return reply({ error: "Acesso restrito a administradores." }, 403);
  if (!enabled)
    return action === "podcast-audio-status"
      ? reply({ enabled: false })
      : reply({ error: "Upload de podcast indisponível." }, 503);

  const videoId = input.youtubeId;
  if (typeof videoId !== "string" || !youtubeIdPattern.test(videoId)) {
    return reply({ error: "Vídeo inválido." }, 400);
  }
  const storage = db.storage.from(PODCAST_AUDIO_BUCKET);
  if (action === "podcast-audio-status" || action === "podcast-audio-preview") {
    const { data: audio, error } = await db
      .from("podcast_video_audio")
      .select("file_name, size_bytes, object_path")
      .eq("youtube_id", videoId)
      .maybeSingle();
    if (error) throw new Error("podcast_audio_read_failed");
    if (action === "podcast-audio-status") {
      return reply({
        enabled: true,
        audio: audio
          ? { fileName: audio.file_name, size: audio.size_bytes }
          : null,
      });
    }
    if (!audio) return reply({ error: "Este vídeo ainda não tem áudio." }, 404);
    const signed = await storage.createSignedUrl(audio.object_path, 1800);
    if (signed.error || !signed.data)
      throw new Error("podcast_audio_preview_failed");
    return reply({ url: signed.data.signedUrl });
  }
  if (!validPodcastAudioSize(input.size)) {
    return reply({ error: "Selecione um MP3 de até 50 MB." }, 400);
  }
  const size = input.size;
  const pathFor = (id: string) => `${videoId}/${actor.id}/${id}.mp3`;
  if (action === "podcast-audio-reserve") {
    const editorial = await db
      .from("editorial_videos")
      .select("youtube_id")
      .eq("youtube_id", videoId)
      .maybeSingle();
    if (editorial.error) throw new Error("podcast_video_read_failed");
    if (!editorial.data) {
      return reply({ error: "Vídeo não encontrado na biblioteca." }, 404);
    }
    const uploadId = crypto.randomUUID();
    const path = pathFor(uploadId);
    const signed = await storage.createSignedUploadUrl(path, { upsert: false });
    if (signed.error || !signed.data)
      throw new Error("podcast_audio_reserve_failed");
    return reply({ uploadId, path, token: signed.data.token });
  }
  if (action !== "podcast-audio-attach")
    return reply({ error: "Ação inválida." }, 400);

  const uploadId = input.uploadId;
  const name = typeof input.fileName === "string" ? input.fileName.trim() : "";
  if (
    typeof uploadId !== "string" ||
    !uploadIdPattern.test(uploadId) ||
    !validPodcastAudioName(name)
  ) {
    return reply({ error: "Arquivo MP3 inválido." }, 400);
  }
  const signed = await storage.createSignedUrl(pathFor(uploadId), 60);
  if (signed.error || !signed.data)
    throw new Error("podcast_audio_validation_url_failed");
  const url = signed.data.signedUrl;
  let valid: boolean;
  try {
    valid = await hasMp3Signature(size, async (start, length) => {
      const end = start + length - 1;
      const response = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (
        response.status !== 206 ||
        response.headers.get("Content-Range") !==
          `bytes ${start}-${end}/${size}`
      ) {
        await response.body?.cancel();
        throw new Error("podcast_audio_range_unavailable");
      }
      return new Uint8Array(await response.arrayBuffer());
    });
  } catch {
    return reply({ error: missingAudio }, 422);
  }
  if (!valid)
    return reply({ error: "O arquivo enviado não é um MP3 válido." }, 422);

  const attached = await db.rpc("attach_podcast_video_audio", {
    p_youtube_id: videoId,
    p_actor: actor.id,
    p_upload_id: uploadId,
    p_file_name: name,
    p_size: size,
  });
  if (attached.error?.message === "podcast_audio_not_uploaded") {
    return reply({ error: missingAudio }, 422);
  }
  if (attached.error?.message === "podcast_audio_forbidden") {
    return reply({ error: "Acesso restrito a administradores." }, 403);
  }
  if (attached.error || !attached.data)
    throw new Error("podcast_audio_attach_failed");
  if (attached.data.upload_id !== uploadId) {
    return reply(
      { error: "Um MP3 mais recente já foi anexado a este vídeo." },
      409,
    );
  }
  return reply({
    fileName: attached.data.file_name,
    size: attached.data.size_bytes,
  });
}
