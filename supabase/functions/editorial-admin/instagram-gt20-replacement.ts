import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { COVER_BUCKET, COVER_MAX_BYTES, inspectJpeg } from "../_shared/editorial-cover.ts";
import { composeFullBleedCover } from "../_shared/cover-renderer/index.ts";
import { GT20_REMOVED_POST } from "../_shared/instagram-gt20-replacement.ts";
import { instagramPublisher, readInstagramSettings } from "../_shared/podcast-instagram.ts";
import { readPublishedCoverSource } from "../_shared/published-cover-source.ts";

const articleId = "770ef7af-91df-4ff5-95a0-302dcf641971";
const originalPath = `${articleId}/backgrounds/52d42f59-7fa1-4463-8a70-d9cc2ecffdd2.png`;
const previousLink = "https://www.instagram.com/p/Df2LPJWF5z4/";
const replacementPath = `${articleId}/instagram-replacements/${GT20_REMOVED_POST}.jpg`;

export async function publishGt20Replacement(
  db: SupabaseClient,
  origin: string,
  env: (name: string) => string | undefined,
  actorId: string,
) {
  const [prior, article] = await Promise.all([
    db.from("instagram_single_posts").select("id,title,caption,permalink,media_id,fingerprint")
      .eq("id", GT20_REMOVED_POST).eq("article_id", articleId).eq("state", "published").maybeSingle(),
    db.from("editorial_articles").select("id,title,video_id,og_image_url")
      .eq("id", articleId).eq("video_id", "ixlp1n9doFE").eq("status", "published").maybeSingle(),
  ]);
  if (prior.error || article.error || !prior.data || !article.data ||
    prior.data.permalink !== previousLink || prior.data.title !== article.data.title ||
    !prior.data.caption || prior.data.caption.length > 2200)
    throw Error("instagram_replacement_source_changed");
  const settings = readInstagramSettings(env);
  if (!settings) throw Error("instagram_replacement_unavailable");
  const image = await readPublishedCoverSource(db, origin, article.data);
  if (!image?.original || image.path !== originalPath) throw Error("instagram_replacement_source_changed");
  const { bytes } = await composeFullBleedCover(image, article.data.title, "instagram", {
    focus: { x: 0.51, y: 0.5 },
    subjects: [{ left: 0.295, top: 0.08, right: 0.722, bottom: 0.80 }],
  });
  const dimensions = inspectJpeg(bytes);
  if (dimensions?.width !== 1080 || dimensions.height !== 1350 || bytes.length > COVER_MAX_BYTES)
    throw Error("instagram_replacement_invalid_cover");

  const storage = db.storage.from(COVER_BUCKET);
  const signedPath = `/storage/v1/object/sign/${COVER_BUCKET}/${replacementPath}`;
  const publisher = instagramPublisher(settings, fetch, (value) => {
    const url = new URL(value);
    return url.origin === origin && url.pathname === signedPath && url.searchParams.has("token")
      && !url.username && !url.password && !url.hash ? url.href : null;
  });
  const account = await publisher.account();
  // The immutable object is the single-use claim. Never replay automatically after it is written.
  const claim = await storage.upload(replacementPath, bytes, { contentType: "image/jpeg", upsert: false });
  if (claim.error) throw Error("instagram_replacement_claim_failed");
  const photo = await storage.createSignedUrl(replacementPath, 900);
  if (photo.error || !photo.data?.signedUrl) throw Error("instagram_replacement_unconfirmed");
  const checkpoint = async (action: string, detail: Record<string, unknown>) =>
    db.from("editorial_audit_logs").insert({
      actor: actorId, action, entity_type: "instagram_post", entity_id: GT20_REMOVED_POST, detail,
    });
  const boundary = await checkpoint("instagram_replacement_attempted", {
    previousLink, previousMediaId: prior.data.media_id, previousFingerprint: prior.data.fingerprint, replacementPath,
  });
  if (boundary.error) throw Error("instagram_replacement_unconfirmed");
  let mediaId: string;
  try {
    const container = await publisher.create(account, { image_url: photo.data.signedUrl, caption: prior.data.caption });
    const saved = await checkpoint("instagram_replacement_container", { container });
    if (saved.error) throw Error("instagram_replacement_unconfirmed");
    let ready = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const status = await publisher.status(container);
      if (status === "FINISHED") { ready = true; break; }
      if (status !== "IN_PROGRESS" || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    if (!ready) throw Error("instagram_replacement_unconfirmed");
    mediaId = await publisher.publish(account, container);
  } catch {
    throw Error("instagram_replacement_unconfirmed");
  }
  const permalink = await publisher.permalink(mediaId).catch(() => null);
  const audit = await checkpoint("instagram_replacement_published", { mediaId, permalink, previousLink });
  return { status: "published", mediaId, permalink, auditRecorded: !audit.error };
}
