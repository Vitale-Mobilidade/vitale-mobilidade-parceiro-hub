import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hasMp3Signature, PODCAST_AUDIO_BUCKET, validPodcastAudioName, validPodcastAudioSize } from "../_shared/podcast-audio-contract.ts";

const resourceId = /^[a-zA-Z0-9_-]{1,100}$/;
const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
const capcutFolder = /^\d+(?:\s*\(\d+\))?$/;

export function workDriveTitle(title: string): string {
  return title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

type Resource = {
  id: string;
  attributes: { name: string; is_folder: boolean; created_time_in_millisecond?: number; storage_info?: { size_in_bytes?: number } };
};

type Reply = (data: unknown, status?: number) => Response;

async function fetchZoho(url: string | URL, init: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init, redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("workdrive_request_failed");
  }
  return response;
}

export async function openPodcastWorkDrive() {
  const root = Deno.env.get("PODCAST_WORKDRIVE_FOLDER_ID");
  const clientId = Deno.env.get("PODCAST_WORKDRIVE_CLIENT_ID");
  const secret = Deno.env.get("PODCAST_WORKDRIVE_CLIENT_SECRET");
  const refresh = Deno.env.get("PODCAST_WORKDRIVE_REFRESH_TOKEN");
  if (!root || !resourceId.test(root) || !clientId || !secret || !refresh)
    return null;

  const tokenResponse = await fetchZoho("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: secret, refresh_token: refresh }),
  });
  const token = (await tokenResponse.json()).access_token;
  if (typeof token !== "string" || !token) throw new Error("workdrive_oauth_failed");
  const headers = { Authorization: `Zoho-oauthtoken ${token}`, Accept: "application/vnd.api+json" };
  async function loadFolder(folder: string): Promise<Resource[]> {
    if (!resourceId.test(folder)) throw new Error("workdrive_invalid_resource");
    const entries: Resource[] = [];
    for (let offset = 0; offset < 1000; offset += 50) {
      const url = new URL(`https://www.zohoapis.com/workdrive/api/v1/files/${folder}/files`);
      url.searchParams.set("page[limit]", "50");
      url.searchParams.set("page[offset]", String(offset));
      const page = (await (await fetchZoho(url, { headers })).json()).data;
      if (!Array.isArray(page)) throw new Error("workdrive_invalid_listing");
      entries.push(...page);
      if (page.length < 50) return entries;
    }
    throw new Error("workdrive_listing_limit");
  }

  const cache = new Map<string, Promise<Resource[]>>();
  function list(folder: string): Promise<Resource[]> {
    const cached = cache.get(folder);
    if (cached) return cached;
    const result = loadFolder(folder);
    cache.set(folder, result);
    return result;
  }
  return { root, headers, list };
}
type WorkDriveConnection = NonNullable<Awaited<ReturnType<typeof openPodcastWorkDrive>>>;

export async function handlePodcastWorkDrive(
  db: SupabaseClient, actor: { id: string; role: string }, action: string,
  input: Record<string, unknown>, enabled: boolean, reply: Reply,
  connection?: WorkDriveConnection,
): Promise<Response> {
  if (actor.role !== "admin") return reply({ error: "Acesso restrito a administradores." }, 403);
  if (!enabled) return reply({ error: "Áudio de podcast indisponível." }, 503);
  const videoId = input.youtubeId;
  if (typeof videoId !== "string" || !videoIdPattern.test(videoId))
    return reply({ error: "Vídeo inválido." }, 400);

  const [catalog, existing] = await Promise.all([
    db.from("editorial_videos").select("youtube_id,title").limit(1000),
    db.from("podcast_video_audio").select("youtube_id").eq("youtube_id", videoId).maybeSingle(),
  ]);
  if (catalog.error || existing.error) throw new Error("podcast_catalog_read_failed");
  if (existing.data) return reply({ status: "already_attached" });
  const video = catalog.data?.find((row) => row.youtube_id === videoId);
  if (!video) return reply({ error: "Vídeo não encontrado." }, 404);
  const title = workDriveTitle(video.title);
  const uniqueTitle = catalog.data!.filter((row) => workDriveTitle(row.title) === title).length === 1;
  const session = connection ?? await openPodcastWorkDrive();
  if (!session) return reply({ error: "Configure a conexão de leitura do WorkDrive." }, 503);
  const { root, headers, list } = session;
  const folders = (await list(root)).filter(({ attributes }) => {
    if (!attributes.is_folder) return false;
    const explicit = /\[([a-zA-Z0-9_-]{11})\]\s*$/.exec(attributes.name);
    return explicit ? explicit[1] === videoId : uniqueTitle && workDriveTitle(attributes.name) === title;
  });
  if (folders.length !== 1) return reply({ status: folders.length ? "review" : "folder_missing" });
  const children = await list(folders[0].id);
  const exports = children.filter(({ attributes }) => attributes.is_folder && capcutFolder.test(attributes.name));
  if (exports.length > 12) return reply({ status: "review" });
  const files = [...children];
  for (const folder of exports) files.push(...await list(folder.id));
  const mp3s = files.filter(({ attributes }) => !attributes.is_folder && /\.mp3$/i.test(attributes.name));
  if (mp3s.length !== 1) return reply({ status: mp3s.length ? "review" : "audio_missing" });

  const source = mp3s[0];
  const name = source.attributes.name.trim();
  const size = source.attributes.storage_info?.size_in_bytes;
  if (!resourceId.test(source.id) || !validPodcastAudioName(name) || !validPodcastAudioSize(size))
    return reply({ status: "review" });
  if (action === "podcast-audio-workdrive-check") return reply({ status: "ready", fileName: name, size, sourceId: source.id });
  if (input.sourceId !== source.id || input.size !== size)
    return reply({ error: "O arquivo mudou. Consulte o WorkDrive novamente." }, 409);

  const response = await fetchZoho(`https://download.zoho.com/v1/workdrive/download/${source.id}`, { headers });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("workdrive_empty_download");
  const bytes = new Uint8Array(size);
  let offset = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.length > size) throw new Error("workdrive_download_size_changed");
      bytes.set(value, offset);
      offset += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (offset !== size || !(await hasMp3Signature(size, async (start, length) => bytes.subarray(start, start + length))))
    return reply({ error: "O arquivo recebido do WorkDrive não é um MP3 válido." }, 422);

  const uploadId = crypto.randomUUID();
  const path = `${videoId}/${actor.id}/${uploadId}.mp3`;
  const storage = db.storage.from(PODCAST_AUDIO_BUCKET);
  const uploaded = await storage.upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
  if (uploaded.error) throw new Error("workdrive_storage_upload_failed");
  const attached = await db.rpc("import_podcast_video_audio", {
    p_youtube_id: videoId, p_actor: actor.id, p_upload_id: uploadId, p_file_name: name, p_size: size,
  });
  // On an uncertain database response, retain the private object for reconciliation.
  if (attached.error) throw new Error("workdrive_attach_failed");
  if (attached.data?.upload_id !== uploadId) {
    await storage.remove([path]);
    return reply({ status: "already_attached" });
  }
  return reply({ status: "imported", fileName: name, size });
}
