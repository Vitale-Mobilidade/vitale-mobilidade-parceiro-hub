import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  COVER_BUCKET,
  COVER_MAX_BYTES,
  inspectJpeg,
  isCoverUuid,
  readGeneratedCoverBackground,
} from "../_shared/editorial-cover.ts";
import {
  INSTAGRAM_CAPTION_END,
  singleInstagramCaption,
} from "../_shared/instagram-single-caption.ts";
import type { EditorialArticle } from "../_shared/editorial-contract.ts";
import {
  instagramPublisher,
  readInstagramSettings,
} from "../_shared/podcast-instagram.ts";
import { automaticInstagramArtwork, AUTOMATIC_ARTWORK_ERRORS } from "./instagram-automatic-artwork.ts";
import type { FrameEvidence } from "../_shared/cover-framing.ts";
import { readPublishedCoverSource } from "../_shared/published-cover-source.ts";
import type { InstagramSingleDashboard } from "../_shared/instagram-single-contract.ts";

type Source = NonNullable<InstagramSingleDashboard["source"]>;
const pick =
  "id,title,caption,state,due_at,published_at,created_at,fingerprint,asset_path,permalink,error_code";
const states = ["review", "scheduled", "publishing", "published", "attention"];
type GenerateCover = (article: EditorialArticle) => Promise<Response>;

async function generateInstagramArtwork(
  article: EditorialArticle,
  generate: GenerateCover,
  title: string,
) {
  const { composeNativeInstagramCover } = await import("../_shared/cover-renderer/index.ts");
  const response = await generate(article);
  if (response.status === 402) throw Error("instagram_ai_credits");
  if (!response.ok) throw Error("instagram_cover_generation_failed");
  const { background } = await response.json();
  const { bytes } = await composeNativeInstagramCover(
    readGeneratedCoverBackground(background),
    title,
  );
  assertInstagramJpeg(bytes);
  return bytes;
}

async function composeAutomaticInstagramArtwork(db: SupabaseClient, origin: string, article: EditorialArticle) {
  const source = await readPublishedCoverSource(db, origin, article);
  if (!source?.original) throw Error("instagram_original_missing");
  const { composeNativeInstagramCover, composeFullBleedCover } =
    await import("../_shared/cover-renderer/index.ts");
  try {
    return (await composeNativeInstagramCover(source, article.title)).bytes;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "instagram_cover_ratio_invalid")
      throw Error("instagram_source_cover_invalid");
  }

  const framing = source.frameEvidence;
  if (!framing) throw Error("instagram_framing_review_required");
  try {
    return (await composeFullBleedCover(source, article.title, "instagram", framing as FrameEvidence)).bytes;
  } catch {
    throw Error("instagram_framing_review_required");
  }
}

async function findSources(db: SupabaseClient, limit = 1): Promise<Source[]> {
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
  const candidates: Source[] = [];
  for (let offset = 0; offset < 1000; offset += 50) {
    const result = await db
      .from("instagram_carousel_sources")
      .select("video_id,article_id,article_title")
      .order("video_date", { ascending: false })
      .order("published_at", { ascending: false })
      .order("article_id", { ascending: false })
      .range(offset, offset + 49);
    if (result.error) throw Error("instagram_source_read_failed");
    for (const row of result.data ?? []) {
      if (excluded.has(row.video_id) || articles.has(row.article_id)) continue;
      candidates.push(row as Source);
      excluded.add(row.video_id);
      articles.add(row.article_id);
      if (candidates.length === limit) return candidates;
    }
    if ((result.data?.length ?? 0) < 50) return candidates;
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
    findSources(db).then((rows) => rows[0] ?? null),
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
    firstApprovalPending: !settings.pilot_id,
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

function assertInstagramJpeg(bytes: Uint8Array) {
  const dimensions = inspectJpeg(bytes);
  if (bytes.length > COVER_MAX_BYTES || dimensions?.width !== 1080 || dimensions.height !== 1350)
    throw Error("instagram_dimensions_invalid");
}
async function storeInstagramAsset(db: SupabaseClient, articleId: string, bytes: Uint8Array, caption: string) {
  assertInstagramJpeg(bytes);
  const fingerprint = await digest(bytes, caption);
  const path = `${articleId}/instagram-single/${fingerprint}.jpg`;
  const bucket = db.storage.from(COVER_BUCKET);
  const saved = await bucket.upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (saved.error) {
    const prior = await bucket.download(path);
    if (prior.error || !prior.data || (await digest(new Uint8Array(await prior.data.arrayBuffer()), caption)) !== fingerprint)
      throw Error("instagram_asset_write_failed");
  }
  return { fingerprint, path };
}
const EDIT_MARGIN_MS = 120_000;
const captionLimit = 2200;
export async function changeInstagramSingle(
  db: SupabaseClient,
  action: "caption" | "cover" | "save",
  body: Record<string, unknown>,
  generateCover: GenerateCover,
  generateCaption: (title: string, groundedCaption: string) => Promise<unknown>,
) {
  if (!isCoverUuid(body.id) || typeof body.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(body.fingerprint))
    throw Error("instagram_edit_conflict");
  const { data: post, error } = await db.from("instagram_single_posts")
    .select("id,article_id,video_id,title,caption,fingerprint,asset_path,state,due_at,attempted_at,lease,lease_until")
    .eq("id", body.id).eq("fingerprint", body.fingerprint).maybeSingle();
  if (error) throw Error("instagram_edit_read_failed");
  if (!post || post.attempted_at || post.lease || post.lease_until ||
      (post.state !== "review" && (post.state !== "scheduled" || !post.due_at || Date.parse(post.due_at) <= Date.now() + EDIT_MARGIN_MS)))
    throw Error("instagram_edit_conflict");
  if (!isCoverUuid(post.article_id)) throw Error("instagram_edit_read_failed");
  const bucket = db.storage.from(COVER_BUCKET);
  const previewPrefix = `${post.article_id}/instagram-previews/${post.id}/${post.fingerprint}`;
  if (action === "cover") {
    const { data: article, error: missing } = await db.from("editorial_articles").select("*")
      .eq("id", post.article_id).eq("video_id", post.video_id).eq("status", "published").single();
    if (missing || !article || article.title !== post.title) throw Error("instagram_source_missing");
    const bytes = await generateInstagramArtwork(article as EditorialArticle, generateCover, post.title);
    const previewId = crypto.randomUUID();
    const path = `${previewPrefix}/${previewId}.jpg`;
    const upload = await bucket.upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (upload.error) throw Error("instagram_asset_write_failed");
    const signed = await bucket.createSignedUrl(path, 900);
    if (signed.error || !signed.data?.signedUrl) throw Error("instagram_asset_read_failed");
    return { previewId, imageUrl: signed.data.signedUrl };
  }
  if (action === "caption") {
    const [article, source] = await Promise.all([
      db.from("editorial_articles").select("summary,blocks").eq("id", post.article_id).eq("video_id", post.video_id).eq("status", "published").single(),
      db.from("instagram_carousel_sources").select("transcript").eq("article_id", post.article_id).eq("video_id", post.video_id).single(),
    ]);
    if (article.error || source.error || !article.data || typeof source.data?.transcript !== "string") throw Error("instagram_source_missing");
    const grounded = singleInstagramCaption(article.data.summary ?? "", article.data.blocks, source.data.transcript);
    const result = (await generateCaption(post.title, grounded)) as { caption?: unknown } | null;
    if (typeof result?.caption !== "string" || !result.caption.trim()) throw Error("instagram_caption_invalid");
    const caption = `${result.caption.trim()}

${INSTAGRAM_CAPTION_END}`;
    if (caption.length > captionLimit) throw Error("instagram_caption_invalid");
    return { caption };
  }
  const caption = body.caption === undefined ? post.caption : body.caption;
  if (typeof caption !== "string" || !caption.trim() || caption.length > captionLimit || caption.includes("\0")) throw Error("instagram_caption_invalid");
  if (body.previewId !== undefined && !isCoverUuid(body.previewId)) throw Error("instagram_edit_conflict");
  const imagePath = body.previewId ? `${previewPrefix}/${body.previewId}.jpg` : post.asset_path;
  const file = await bucket.download(imagePath);
  if (file.error || !file.data || file.data.size > COVER_MAX_BYTES) throw Error("instagram_asset_read_failed");
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  if (!body.previewId && (await digest(bytes, post.caption)) !== post.fingerprint) throw Error("instagram_asset_read_failed");
  const { fingerprint, path } = await storeInstagramAsset(db, post.article_id, bytes, caption);
  let update = db.from("instagram_single_posts").update({ caption, asset_path: path, fingerprint })
    .eq("id", post.id).eq("fingerprint", post.fingerprint).eq("state", post.state)
    .is("lease", null).is("lease_until", null).is("attempted_at", null);
  if (post.state === "scheduled") update = update.eq("due_at", post.due_at).gt("due_at", new Date(Date.now() + EDIT_MARGIN_MS).toISOString());
  const saved = await update.select("id,fingerprint").maybeSingle();
  if (saved.error) throw Error("instagram_edit_write_failed");
  if (!saved.data) throw Error("instagram_edit_conflict");
  return saved.data;
}

export async function prepareInstagramSingle(
  db: SupabaseClient,
  expectedVideo: unknown,
  generate: GenerateCover,
) {
  const [sources, active] = await Promise.all([
    findSources(db),
    db
      .from("instagram_single_posts")
      .select("id", { count: "exact", head: true })
      .in("state", ["review", "scheduled", "publishing"]),
  ]);
  if (active.error || active.count === null)
    throw Error("instagram_state_unavailable");
  if (active.count >= 3) throw Error("instagram_queue_full");
  const [source] = sources;
  if (!source || source.video_id !== expectedVideo)
    throw Error("instagram_source_changed");
  return prepareInstagramSource(db, source, (article) => generateInstagramArtwork(article, generate, article.title));
}

async function prepareInstagramSource(
  db: SupabaseClient,
  s: Source,
  render: (article: EditorialArticle) => Promise<Uint8Array>,
) {
  const [article, eligible] = await Promise.all([
    db
      .from("editorial_articles")
      .select("*")
      .eq("id", s.article_id)
      .eq("video_id", s.video_id)
      .eq("status", "published")
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
    eligible.error ||
    !article.data ||
    typeof eligible.data?.transcript !== "string"
  )
    throw Error("instagram_source_missing");
  const caption = singleInstagramCaption(
    article.data.summary ?? "",
    article.data.blocks,
    eligible.data.transcript,
  );
  const bytes = await render(article.data as EditorialArticle);
  const { fingerprint, path } = await storeInstagramAsset(
    db,
    s.article_id,
    bytes,
    caption,
  );
  const current = await db.from("editorial_articles").select("revision,title")
    .eq("id", s.article_id).eq("video_id", s.video_id).eq("status", "published").maybeSingle();
  if (current.error) throw Error("instagram_source_read_failed");
  if (!current.data || current.data.revision !== article.data.revision || current.data.title !== article.data.title)
    throw Error("instagram_source_changed");
  const item = await db.rpc("stage_instagram_single", {
    p_video: s.video_id,
    p_article: s.article_id,
    p_title: article.data.title,
    p_caption: caption,
    p_path: path,
    p_fingerprint: fingerprint,
  });
  if (item.error) throw Error("instagram_draft_write_failed");
  if (!item.data?.[0]) throw Error("instagram_queue_changed");
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

/** Only reserve the draft produced by this call. Existing manual drafts need approval. */
export async function queueNextInstagramSingle(db: SupabaseClient, origin: string, generate?: GenerateCover) {
  const settings = await config(db);
  if (!settings.automation_enabled) return { status: "paused" };
  if (!settings.pilot_id) return { status: "awaiting_review" };
  const existing = await db.from("instagram_single_posts").select("state")
    .in("state", ["review", "scheduled", "publishing"]).limit(3);
  if (existing.error) throw Error("instagram_state_unavailable");
  const vacancies = 3 - (existing.data?.length ?? 0);
  if (vacancies <= 0) return { status: "queue_full" };
  const candidates = await findSources(db, 24);
  const generatedArtwork = generate
    ? automaticInstagramArtwork(db, (article) => generateInstagramArtwork(article, generate, article.title))
    : null;
  if (!candidates.length)
    return { status: existing.data?.some((post) => post.state === "review") ? "awaiting_review" : "no_source" };
  let lastIssue = "";
  const reservations: string[] = [];
  const partial = (remaining: string) => reservations.length
    ? { status: "scheduled", dueAt: reservations[0], reserved: reservations.length, remaining }
    : { status: remaining };
  for (const source of candidates) {
    let prepared;
    try {
      prepared = await prepareInstagramSource(db, source, async (article) => {
        try {
          return await composeAutomaticInstagramArtwork(db, origin, article);
        } catch (error) {
          const code = error instanceof Error ? error.message : "";
          if (!generatedArtwork || !["instagram_original_missing", "instagram_source_cover_invalid",
            "instagram_framing_review_required"].includes(code)) throw error;
          return generatedArtwork(article);
        }
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "instagram_queue_changed" || code === "instagram_source_changed") return partial("queue_changed");
      if (["instagram_ai_credits", "instagram_auto_generation_limit", "instagram_cover_generation_failed",
        "instagram_cover_ratio_invalid", "instagram_auto_generation_invalid"].includes(code)) {
        const issue = await db.from("instagram_single_settings").update({ automation_issue: code }).eq("singleton", true);
        if (issue.error) throw Error("instagram_state_unavailable");
        return partial(code);
      }
      if (!["instagram_original_missing", "instagram_source_cover_invalid", "instagram_framing_review_required",
        "instagram_caption_evidence_missing", "instagram_caption_incomplete", ...AUTOMATIC_ARTWORK_ERRORS].includes(code)) throw error;
      if (!lastIssue || AUTOMATIC_ARTWORK_ERRORS.includes(code)) lastIssue = code;
      console.info("[instagram] source skipped", source.video_id, code);
      continue;
    }
    const reserved = await db.rpc("reserve_instagram_single", {
      p_id: prepared.id, p_fingerprint: prepared.fingerprint, p_auto: true,
    });
    if (reserved.error) throw Error("instagram_reserve_failed");
    if (!reserved.data) return partial("awaiting_review");
    reservations.push(reserved.data);
    if (reservations.length === vacancies)
      return { status: "scheduled", dueAt: reservations[0], reserved: reservations.length };
  }
  if (!lastIssue) return partial("no_source");
  const saved = await db.from("instagram_single_settings")
    .update({ automation_issue: lastIssue }).eq("singleton", true);
  if (saved.error) throw Error("instagram_state_unavailable");
  return partial(AUTOMATIC_ARTWORK_ERRORS.includes(lastIssue) ? lastIssue : "source_requires_review");
}

export async function tickInstagramSingle(
  db: SupabaseClient,
  url: string,
  env: (name: string) => string | undefined,
  generate?: GenerateCover,
) {
  const settings = await config(db);
  if (!settings.automation_enabled) return { status: "paused" };
  const claim = await db.rpc("claim_instagram_single_due");
  if (claim.error) throw Error("instagram_claim_failed");
  const post = claim.data?.[0];
  if (!post) return queueNextInstagramSingle(db, url, generate);
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
    // Refill asynchronously inside the job, without changing the confirmed result on a preparation failure.
    try {
      await queueNextInstagramSingle(db, url, generate);
    } catch {
      /* The next cron window can refill. */
    }
    return { status: "published" };
  } catch {
    await save({ state: "attention", error_code: "shipment_unconfirmed" });
    return { status: "shipment_unconfirmed" };
  }
}
