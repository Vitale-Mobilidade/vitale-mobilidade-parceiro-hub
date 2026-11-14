import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  COVER_BUCKET,
  inspectJpeg,
  isCoverUuid,
} from "../_shared/editorial-cover.ts";
import { MOBYLETTE_PILOT } from "../_shared/mobylette-pilot.ts";
import { singleInstagramCaption } from "../_shared/instagram-single-caption.ts";
import {
  instagramPublisher,
  readInstagramSettings,
} from "../_shared/podcast-instagram.ts";
import type { FrameEvidence } from "../_shared/cover-framing.ts";
import type { InstagramSingleDashboard } from "../_shared/instagram-single-contract.ts";

type Source = NonNullable<InstagramSingleDashboard["source"]>;
const pick =
  "id,title,caption,state,due_at,published_at,created_at,fingerprint,asset_path,permalink,error_code";
const states = ["review", "scheduled", "publishing", "published", "attention"];
const framePath =
  /^[0-9a-f-]{36}\/backgrounds\/[0-9a-f-]{36}\.(?:png|jpg|jpeg)$/;

async function findSource(db: SupabaseClient) {
  const [legacy, carousel, holds, existing] = await Promise.all([
    db
      .from("podcast_instagram_deliveries")
      .select("youtube_id")
      .eq("status", "published"),
    db
      .from("instagram_carousel_jobs")
      .select("video_id,article_id")
      .eq("state", "published"),
    db
      .from("podcast_episode_queue")
      .select("youtube_id")
      .filter("prepared_instagram_post->>reviewHold", "eq", "true"),
    db.from("instagram_single_posts").select("video_id,article_id").limit(1000),
  ]);
  if (
    [legacy, carousel, holds, existing].some(
      (r) => r.error || (r.data?.length ?? 0) >= 1000,
    )
  )
    throw Error("instagram_history_read_failed");
  const excluded = new Set([
    ...(legacy.data ?? []).map((x) => x.youtube_id),
    ...(holds.data ?? []).map((x) => x.youtube_id),
    ...[...(carousel.data ?? []), ...(existing.data ?? [])].map(
      (x) => x.video_id,
    ),
  ]);
  const articles = new Set(
    [...(carousel.data ?? []), ...(existing.data ?? [])].map(
      (x) => x.article_id,
    ),
  );
  for (let offset = 0; offset < 1000; offset += 50) {
    const result = await db
      .from("instagram_carousel_sources")
      .select("video_id,article_id,article_title")
      .order("video_date", { ascending: false })
      .order("published_at", { ascending: false })
      .order("article_id", { ascending: false })
      .range(offset, offset + 49);
    if (result.error) throw Error("instagram_source_read_failed");
    const row = result.data?.find(
      (x) => !excluded.has(x.video_id) && !articles.has(x.article_id),
    );
    if (row) return row as Source;
    if ((result.data?.length ?? 0) < 50) return null;
  }
  throw Error("instagram_source_limit");
}

async function config(db: SupabaseClient) {
  const row = await db
    .from("instagram_single_settings")
    .select("automation_enabled,pilot_id,automation_issue")
    .eq("singleton", true)
    .single();
  if (row.error) throw Error("instagram_settings_unavailable");
  return row.data;
}

export async function readInstagramSingle(
  db: SupabaseClient,
  body: Record<string, unknown>,
): Promise<InstagramSingleDashboard> {
  const settings = await config(db);
  const page =
    typeof body.page === "number" && Number.isInteger(body.page)
      ? Math.min(999, Math.max(0, body.page))
      : 0;
  let q = db
    .from("instagram_single_posts")
    .select(pick, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 20, page * 20 + 19);
  if (typeof body.state === "string" && states.includes(body.state))
    q = q.eq("state", body.state);
  if (typeof body.search === "string" && body.search.trim()) {
    const term = body.search
      .slice(0, 100)
      .replace(/[^\p{L}\p{N} ._-]/gu, " ")
      .trim();
    if (term) q = q.ilike("title", `%${term.replace(/_/g, "\\_")}%`);
  }
  const [rows, source, pilot, ...totals] = await Promise.all([
    q,
    findSource(db),
    settings.pilot_id
      ? db
          .from("instagram_single_posts")
          .select("state")
          .eq("id", settings.pilot_id)
          .single()
      : Promise.resolve(null),
    ...states.map((state) =>
      db
        .from("instagram_single_posts")
        .select("id", { count: "exact", head: true })
        .eq("state", state),
    ),
  ]);
  if (rows.error || pilot?.error || totals.some((t) => t.error))
    throw Error("instagram_history_read_failed");
  const items = await Promise.all(
    (rows.data ?? []).map(async ({ asset_path, ...row }) => {
      const object = await db.storage
        .from(COVER_BUCKET)
        .createSignedUrl(asset_path, 600);
      return { ...row, imageUrl: object.data?.signedUrl ?? null };
    }),
  );
  return {
    automationEnabled: settings.automation_enabled,
    pilotPending: pilot?.data?.state !== "published",
    counts: Object.fromEntries(
      states.map((state, i) => [state, totals[i].count ?? 0]),
    ),
    issue: settings.automation_issue,
    items: items as InstagramSingleDashboard["items"],
    total: rows.count ?? 0,
    source,
  };
}

async function digest(bytes: Uint8Array, caption: string) {
  const copy = Uint8Array.from(bytes);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", copy)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${hash}\n${caption}`),
      ),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}

export async function prepareInstagramSingle(
  db: SupabaseClient,
  expectedVideo?: unknown,
) {
  const source = await findSource(db);
  if (
    !source ||
    (expectedVideo !== undefined && source.video_id !== expectedVideo)
  )
    throw Error("instagram_source_changed");
  const s = source;
  const [article, metadata, eligible] = await Promise.all([
    db
      .from("editorial_articles")
      .select("title,summary,blocks")
      .eq("id", s.article_id)
      .eq("video_id", s.video_id)
      .eq("status", "published")
      .single(),
    db
      .from("youtube_editorial_sources")
      .select("background:capture->coverBackground")
      .eq("article_id", s.article_id)
      .eq("video_id", s.video_id)
      .single(),
    db
      .from("instagram_carousel_sources")
      .select("transcript")
      .eq("video_id", s.video_id)
      .eq("article_id", s.article_id)
      .single(),
  ]);
  if (
    article.error ||
    metadata.error ||
    eligible.error ||
    !article.data ||
    typeof eligible.data?.transcript !== "string"
  )
    throw Error("instagram_source_missing");
  const original = metadata.data?.background;
  if (
    !original ||
    !isCoverUuid(s.article_id) ||
    typeof original.path !== "string" ||
    !original.path.startsWith(s.article_id + "/") ||
    !framePath.test(original.path) ||
    !["image/png", "image/jpeg"].includes(original.mime) ||
    original.title !== article.data.title
  )
    throw Error("instagram_original_missing");
  const pilot =
    s.article_id === MOBYLETTE_PILOT.articleId &&
    original.path === MOBYLETTE_PILOT.path;
  const evidence: FrameEvidence | undefined = pilot
    ? {
        focus: MOBYLETTE_PILOT.evidence.focus,
        subjects: [...MOBYLETTE_PILOT.evidence.subjects],
      }
    : original.frameEvidence;
  if (!evidence || !Array.isArray(evidence.subjects))
    throw Error("instagram_framing_review_required");
  const caption = singleInstagramCaption(
    article.data.summary ?? "",
    article.data.blocks,
    eligible.data.transcript,
  );
  const file = await db.storage.from(COVER_BUCKET).download(original.path);
  if (file.error || !file.data || file.data.size > 12 * 1024 * 1024)
    throw Error("instagram_original_missing");
  const { composeFullBleedCover } =
    await import("../_shared/cover-renderer/index.ts");
  const result = await composeFullBleedCover(
    {
      bytes: new Uint8Array(await file.data.arrayBuffer()),
      mime: original.mime,
    },
    article.data.title,
    "instagram",
    evidence,
  );
  const dimensions = inspectJpeg(result.bytes);
  if (dimensions?.width !== 1080 || dimensions.height !== 1350)
    throw Error("instagram_dimensions_invalid");
  const fingerprint = await digest(result.bytes, caption),
    path = `${s.article_id}/instagram-single/${fingerprint}.jpg`;
  const saved = await db.storage
    .from(COVER_BUCKET)
    .upload(path, result.bytes, { contentType: "image/jpeg", upsert: false });
  if (saved.error) {
    const prior = await db.storage.from(COVER_BUCKET).download(path);
    if (
      prior.error ||
      !prior.data ||
      (await digest(
        new Uint8Array(await prior.data.arrayBuffer()),
        caption,
      )) !== fingerprint
    )
      throw Error("instagram_asset_write_failed");
  }
  const item = await db.rpc("stage_instagram_single", {
    p_video: s.video_id,
    p_article: s.article_id,
    p_title: article.data.title,
    p_caption: caption,
    p_path: path,
    p_fingerprint: fingerprint,
  });
  if (item.error || !item.data?.[0])
    throw Error("instagram_draft_write_failed");
  return item.data[0];
}

export async function approveInstagramSingle(
  db: SupabaseClient,
  id: unknown,
  fingerprint: unknown,
) {
  if (
    !isCoverUuid(id) ||
    typeof fingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(fingerprint)
  )
    throw Error("instagram_review_invalid");
  const scheduled = await db.rpc("reserve_instagram_single", {
    p_id: id,
    p_fingerprint: fingerprint,
  });
  if (scheduled.error || !scheduled.data)
    throw Error("instagram_review_changed_or_slot_busy");
  return { dueAt: scheduled.data };
}

export async function tickInstagramSingle(
  db: SupabaseClient,
  url: string,
  env: (name: string) => string | undefined,
) {
  const settings = await config(db);
  if (!settings.automation_enabled) return { status: "paused" };
  const claim = await db.rpc("claim_instagram_single_due");
  if (claim.error) throw Error("instagram_claim_failed");
  const post = claim.data?.[0];
  if (!post) {
    if (!settings.pilot_id) return { status: "awaiting_review" };
    const [pilot, pending] = await Promise.all([
      db
        .from("instagram_single_posts")
        .select("state")
        .eq("id", settings.pilot_id)
        .single(),
      db
        .from("instagram_single_posts")
        .select("id")
        .in("state", ["review", "scheduled", "publishing", "attention"])
        .limit(1),
    ]);
    if (pilot.error || pending.error)
      throw Error("instagram_state_unavailable");
    if (pilot.data?.state !== "published" || pending.data?.length)
      return { status: "idle" };
    if (!(await findSource(db))) return { status: "no_source" };
    let next;
    try {
      next = await prepareInstagramSingle(db);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (
        ![
          "instagram_framing_review_required",
          "single_image_scene_expansion_required",
          "instagram_caption_evidence_missing",
          "instagram_original_missing",
        ].includes(code)
      )
        throw error;
      const saved = await db
        .from("instagram_single_settings")
        .update({ automation_issue: code })
        .eq("singleton", true);
      if (saved.error) throw Error("instagram_state_unavailable");
      return { status: "source_requires_review" };
    }
    const reserved = await db.rpc("reserve_instagram_single", {
      p_id: next.id,
      p_fingerprint: next.fingerprint,
      p_auto: true,
    });
    if (reserved.error) throw Error("instagram_reserve_failed");
    return { status: reserved.data ? "scheduled" : "awaiting_review" };
  }
  const save = async (patch: Record<string, unknown>) => {
    const update = await db
      .from("instagram_single_posts")
      .update(patch)
      .eq("id", post.id)
      .eq("lease", post.lease)
      .select("id")
      .single();
    if (update.error || !update.data)
      throw Error("instagram_checkpoint_failed");
  };
  let assetUrl: string,
    account: string,
    meta: ReturnType<typeof instagramPublisher>;
  try {
    const settings = readInstagramSettings(env);
    if (!settings) throw Error("instagram_meta_missing");
    const file = await db.storage.from(COVER_BUCKET).download(post.asset_path);
    if (
      file.error ||
      !file.data ||
      (await digest(
        new Uint8Array(await file.data.arrayBuffer()),
        post.caption,
      )) !== post.fingerprint
    )
      throw Error("instagram_asset_invalid");
    const signed = await db.storage
      .from(COVER_BUCKET)
      .createSignedUrl(post.asset_path, 900);
    assetUrl = signed.data?.signedUrl ?? "";
    const prefix = `/storage/v1/object/sign/${COVER_BUCKET}/${post.asset_path}`;
    meta = instagramPublisher(settings, fetch, (value) => {
      const candidate = new URL(value);
      return candidate.origin === new URL(url).origin &&
        candidate.protocol === "https:" &&
        candidate.pathname === prefix &&
        candidate.searchParams.has("token") &&
        !candidate.hash &&
        !candidate.username &&
        !candidate.password
        ? candidate.href
        : null;
    });
    if (signed.error || !assetUrl) throw Error("instagram_asset_missing");
    account = await meta.account();
  } catch {
    await save({ state: "attention", error_code: "connection_unavailable" });
    return { status: "connection_unavailable" };
  }
  // Durable boundary: a timeout from this point needs reconciliation instead of another create/publish.
  await save({
    state: "publishing",
    attempted_at: new Date().toISOString(),
    error_code: null,
  });
  try {
    const container = await meta.create(account, {
      image_url: assetUrl,
      caption: post.caption,
    });
    await save({ container_id: container });
    let ready = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const status = await meta.status(container);
      if (status === "FINISHED") {
        ready = true;
        break;
      }
      if (status !== "IN_PROGRESS" || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    if (!ready) throw Error("instagram_container_unconfirmed");
    const media = await meta.publish(account, container);
    await save({
      state: "published",
      media_id: media,
      published_at: new Date().toISOString(),
    });
    try {
      await save({ permalink: await meta.permalink(media) });
    } catch {
      /* The send was already confirmed. */
    }
    return { status: "published" };
  } catch {
    await save({ state: "attention", error_code: "shipment_unconfirmed" });
    return { status: "shipment_unconfirmed" };
  }
}
