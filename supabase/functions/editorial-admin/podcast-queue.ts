import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function previewPodcastQueue(db: SupabaseClient) {
  const [available, drafts] = await Promise.all([
    db.from("podcast_queue_candidates").select("youtube_id,title,published_on")
      .order("published_on", { ascending: false, nullsFirst: false })
      .order("uploaded_at", { ascending: false })
      .order("youtube_id").limit(20),
    db.from("podcast_episode_queue").select("youtube_id", { count: "exact", head: true })
      .is("released_at", null),
  ]);
  if (available.error || drafts.error) throw new Error("podcast_queue_read_failed");
  return { candidates: available.data ?? [], drafts: drafts.count ?? 0 };
}

export async function stageNextPodcastEpisode(
  db: SupabaseClient, expectedId: unknown, readDescription: (id: string) => Promise<string>,
) {
  const { candidates } = await previewPodcastQueue(db);
  const next = candidates[0];
  if (!next || next.youtube_id !== expectedId) return { status: "queue_changed" };
  return stagePodcastEpisode(db, next, readDescription);
}

async function stagePodcastEpisode(
  db: SupabaseClient, video: { youtube_id: string; title: string },
  readDescription: (id: string) => Promise<string>, folderCreatedAt?: number,
) {
  const [description, audio] = await Promise.all([
    readDescription(video.youtube_id),
    db.from("podcast_video_audio").select("object_path,size_bytes").eq("youtube_id", video.youtube_id).single(),
  ]);
  if (audio.error || !audio.data) throw new Error("podcast_queue_audio_missing");
  const { error } = await db.from("podcast_episode_queue").upsert(
    { youtube_id: video.youtube_id, title: video.title, original_description: description,
      object_path: audio.data.object_path, size_bytes: audio.data.size_bytes,
      source_folder_created_at: folderCreatedAt ? new Date(folderCreatedAt).toISOString() : null },
    { onConflict: "youtube_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("podcast_queue_write_failed");
  return { status: "draft" };
}

export async function prepareNextPodcastEpisode(
  db: SupabaseClient, actor: { id: string; role: string }, readDescription: (id: string) => Promise<string>,
) {
  const { openPodcastWorkDrive, handlePodcastWorkDrive, workDriveTitle } = await import("./podcast-workdrive.ts");
  const [catalog, audios, drafts] = await Promise.all([
    db.from("editorial_videos").select("youtube_id,title,published_on").eq("status", "active")
      .order("published_on", { ascending: false, nullsFirst: false }).order("youtube_id").limit(1000),
    db.from("podcast_video_audio").select("youtube_id").limit(1000),
    db.from("podcast_episode_queue").select("youtube_id,released_at").limit(1000),
  ]);
  if (catalog.error || audios.error || drafts.error) throw new Error("podcast_queue_read_failed");
  const attached = new Set(audios.data?.map((row) => row.youtube_id));
  const staged = new Set(drafts.data?.map((row) => row.youtube_id));
  const remaining = (catalog.data ?? []).filter((row) => !staged.has(row.youtube_id));
  if (!remaining.length) return { status: "empty" };
  const connection = await openPodcastWorkDrive();
  if (!connection) return { status: "workdrive_unconfigured" };
  const folders = (await connection.list(connection.root)).filter((row) => row.attributes.is_folder);
  const lastRelease = Math.max(0, ...(drafts.data ?? []).map((row) => Date.parse(row.released_at ?? "") || 0));
  const reply = (body: unknown, status?: number) => Response.json(body, { status });

  const choices = remaining.map((video) => {
    const matches = folders.filter((folder) => {
      const explicit = /\[([A-Za-z0-9_-]{11})\]\s*$/.exec(folder.attributes.name);
      return explicit ? explicit[1] === video.youtube_id
        : workDriveTitle(folder.attributes.name) === workDriveTitle(video.title);
    });
    const raw = matches.length === 1 ? Number(matches[0].attributes.created_time_in_millisecond) : 0;
    const created = Number.isSafeInteger(raw) && raw > 0 && raw <= Date.now() ? raw : 0;
    return { video, hasFolder: matches.length > 0, created, fresh: lastRelease > 0 && created > lastRelease };
  }).sort((a, b) => Number(b.fresh) - Number(a.fresh)
    || (a.fresh && b.fresh ? b.created - a.created : 0)
    || (b.video.published_on ?? "").localeCompare(a.video.published_on ?? "")
    || b.created - a.created || a.video.youtube_id.localeCompare(b.video.youtube_id));

  for (const { video, hasFolder, created } of choices) {
    const id = video.youtube_id;
    if (!attached.has(id)) {
      if (!hasFolder) continue;
      const checked = await handlePodcastWorkDrive(db, actor, "podcast-audio-workdrive-check",
        { youtubeId: id }, true, reply, connection);
      if (!checked.ok) throw new Error("podcast_workdrive_check_failed");
      const candidate = await checked.json();
      if (candidate.status !== "ready" && candidate.status !== "already_attached") continue;
      if (candidate.status === "ready") {
        const imported = await handlePodcastWorkDrive(db, actor, "podcast-audio-workdrive-import",
          { youtubeId: id, sourceId: candidate.sourceId, size: candidate.size }, true, reply, connection);
        if (!imported.ok) throw new Error("podcast_workdrive_import_failed");
      }
    }
    return stagePodcastEpisode(db, video, readDescription, created);
  }
  return { status: "empty" };
}
