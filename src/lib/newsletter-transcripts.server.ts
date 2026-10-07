import { createClient } from "@supabase/supabase-js";
/** Private, server-only access to the selected videos' editorial source, never subscriber data. */
export async function newsletterTranscripts(
  ids: string[],
): Promise<Map<string, string>> {
  const selected = [...new Set(ids)]
    .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id))
    .slice(0, 4);
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !selected.length) return new Map();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("editorial_videos")
    .select("youtube_id,transcript")
    .in("youtube_id", selected)
    .eq("status", "active")
    .abortSignal(AbortSignal.timeout(6000));
  if (error) throw new Error("newsletter_transcripts_unavailable");
  return new Map(
    (data ?? [])
      .filter(
        (r) =>
          typeof r.transcript === "string" && r.transcript.trim().length > 50,
      )
      .map((r) => [r.youtube_id, r.transcript.slice(0, 6000)]),
  );
}
