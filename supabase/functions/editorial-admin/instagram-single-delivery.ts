import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { EditorialArticle } from "../_shared/editorial-contract.ts";
import { isCoverUuid } from "../_shared/editorial-cover.ts";
import { saoPauloInstant } from "../_shared/instagram-schedule-clock.ts";
import { sendInstagramSingle } from "./instagram-single.ts";

export async function manageInstagramDelivery(
  db: SupabaseClient,
  mode: "schedule" | "now",
  body: Record<string, unknown>,
  origin: string,
  env: (name: string) => string | undefined,
  generate: (article: EditorialArticle) => Promise<Response>,
  background?: (task: Promise<unknown>) => void,
) {
  if (
    !isCoverUuid(body.id) ||
    typeof body.fingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(body.fingerprint)
  )
    throw Error("instagram_edit_conflict");

  const result = await db
    .from("instagram_single_posts")
    .select("*")
    .eq("id", body.id)
    .eq("fingerprint", body.fingerprint)
    .maybeSingle();
  if (result.error) throw Error("instagram_edit_read_failed");
  const post = result.data;
  if (
    !post ||
    !["review", "scheduled"].includes(post.state) ||
    post.attempted_at ||
    post.lease ||
    post.lease_until
  )
    throw Error("instagram_edit_conflict");
  if (
    !isCoverUuid(post.article_id) ||
    !/^[A-Za-z0-9_-]{11}$/.test(post.video_id)
  )
    throw Error("instagram_source_missing");
  const [settings, podcast, carousel, source, hold, oldPodcast, oldCarousel] =
    await Promise.all([
      db
        .from("instagram_single_settings")
        .select("automation_enabled")
        .eq("singleton", true)
        .single(),
      db
        .from("podcast_distribution_settings")
        .select("instagram_enabled")
        .eq("singleton", true)
        .single(),
      db
        .from("instagram_carousel_settings")
        .select("publishing_enabled")
        .eq("singleton", true)
        .single(),
      db
        .from("instagram_carousel_sources")
        .select("article_title")
        .eq("article_id", post.article_id)
        .eq("video_id", post.video_id)
        .maybeSingle(),
      db
        .from("podcast_episode_queue")
        .select("prepared_instagram_post")
        .eq("youtube_id", post.video_id)
        .maybeSingle(),
      db
        .from("podcast_instagram_deliveries")
        .select("youtube_id")
        .eq("youtube_id", post.video_id)
        .eq("status", "published")
        .limit(1),
      db
        .from("instagram_carousel_jobs")
        .select("id")
        .eq("state", "published")
        .or(`video_id.eq.${post.video_id},article_id.eq.${post.article_id}`)
        .limit(1),
    ]);
  if (
    [settings, podcast, carousel, source, hold, oldPodcast, oldCarousel].some(
      (result) => result.error,
    )
  )
    throw Error("instagram_state_unavailable");
  if (
    !settings.data?.automation_enabled ||
    podcast.data?.instagram_enabled ||
    carousel.data?.publishing_enabled
  )
    throw Error("instagram_delivery_paused");
  const prepared = hold.data?.prepared_instagram_post;
  const reviewHold =
    prepared &&
    typeof prepared === "object" &&
    !Array.isArray(prepared) &&
    prepared.reviewHold === true;
  if (
    !source.data ||
    source.data.article_title !== post.title ||
    reviewHold ||
    oldPodcast.data?.length ||
    oldCarousel.data?.length
  )
    throw Error("instagram_source_changed");

  const dueAt =
    mode === "schedule"
      ? saoPauloInstant(String(body.localTime ?? ""))
      : new Date().toISOString();
  const lease = crypto.randomUUID();
  const patch =
    mode === "schedule"
      ? { due_at: dueAt, state: "scheduled", error_code: null }
      : {
          due_at: dueAt,
          state: "publishing",
          error_code: null,
          lease,
          lease_until: new Date(Date.now() + 120_000).toISOString(),
        };
  let update = db
    .from("instagram_single_posts")
    .update(patch)
    .eq("id", post.id)
    .eq("fingerprint", post.fingerprint)
    .eq("state", post.state)
    .is("attempted_at", null)
    .is("lease", null)
    .is("lease_until", null);
  if (post.state === "scheduled") update = update.eq("due_at", post.due_at);
  const saved = await update.select("*").maybeSingle();
  if (saved.error?.code === "23505")
    throw Error("instagram_schedule_slot_busy");
  if (saved.error) throw Error("instagram_edit_write_failed");
  if (!saved.data) throw Error("instagram_edit_conflict");
  if (mode === "schedule") return { status: "scheduled", dueAt };
  return sendInstagramSingle(db, origin, env, saved.data, generate, background);
}
