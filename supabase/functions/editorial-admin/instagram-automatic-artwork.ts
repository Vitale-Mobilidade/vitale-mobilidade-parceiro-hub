import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { EditorialArticle } from "../_shared/editorial-contract.ts";
import {
  COVER_BUCKET,
  COVER_MAX_BYTES,
  inspectJpeg,
  isCoverUuid,
} from "../_shared/editorial-cover.ts";

const DAILY_GENERATION_LIMIT = 6;
export const AUTOMATIC_ARTWORK_ERRORS = [
  "instagram_auto_generation_busy",
  "instagram_auto_generation_unconfirmed",
  "instagram_auto_generation_limit",
  "instagram_auto_generation_pending",
  "instagram_cover_generation_failed",
  "instagram_cover_ratio_invalid",
  "instagram_ai_credits",
];

function assertArtwork(bytes: Uint8Array) {
  const dimensions = inspectJpeg(bytes);
  if (
    bytes.length > COVER_MAX_BYTES ||
    dimensions?.width !== 1080 ||
    dimensions.height !== 1350
  )
    throw Error("instagram_auto_generation_invalid");
}

function missing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status =
    "statusCode" in error
      ? error.statusCode
      : "status" in error
        ? error.status
        : null;
  return status === "404" || status === 404;
}

export async function automaticArtworkKey(article: EditorialArticle) {
  if (!isCoverUuid(article.id) || !Number.isInteger(article.revision))
    throw Error("instagram_source_changed");
  const identity = JSON.stringify({
    policy: "instagram-portrait-v1",
    id: article.id,
    revision: article.revision,
    title: article.title,
    summary: article.summary,
    primaryBike: article.primary_bike_id,
    relatedBikes: article.related_bike_ids,
  });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  const key = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${article.id}/instagram-automatic/v1-${key}`;
}

/** A run can create at most one image. A durable claim prevents a second paid call for that revision. */
export function automaticInstagramArtwork(
  db: SupabaseClient,
  generate: (article: EditorialArticle) => Promise<Uint8Array>,
  now = () => new Date(),
) {
  let spent = false;
  const storage = db.storage.from(COVER_BUCKET);
  async function read(path: string) {
    const result = await storage.download(path);
    if (result.error) {
      if (missing(result.error)) return null;
      throw Error("instagram_asset_read_failed");
    }
    if (!result.data || result.data.size > COVER_MAX_BYTES)
      throw Error("instagram_asset_read_failed");
    return new Uint8Array(await result.data.arrayBuffer());
  }
  return async (article: EditorialArticle) => {
    const prefix = await automaticArtworkKey(article);
    const ready = await read(prefix + ".jpg");
    if (ready) {
      assertArtwork(ready);
      return ready;
    }
    const previousAttempt = await read(prefix + ".attempt.json");
    if (previousAttempt) throw Error("instagram_auto_generation_unconfirmed");
    if (spent) throw Error("instagram_auto_generation_pending");

    const attemptedAt = now();
    const day = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(attemptedAt);
    let budgetClaimed = false;
    for (let position = 1; position <= DAILY_GENERATION_LIMIT; position++) {
      const slot = await storage.upload(
        `instagram-automatic-budget/${day}/${position}.json`,
        JSON.stringify({
          source: prefix,
          attemptedAt: attemptedAt.toISOString(),
        }),
        { contentType: "application/json", upsert: false },
      );
      if (!slot.error) {
        budgetClaimed = true;
        break;
      }
      // Do not interpret network or authorization failures as an exhausted budget.
      const occupied = await read(
        `instagram-automatic-budget/${day}/${position}.json`,
      );
      if (!occupied) throw Error("instagram_asset_write_failed");
    }
    if (!budgetClaimed) throw Error("instagram_auto_generation_limit");

    // The per-source claim is written only after budget admission, so a full day can retry tomorrow.
    const attempt = await storage.upload(
      prefix + ".attempt.json",
      JSON.stringify({
        articleId: article.id,
        revision: article.revision,
        attemptedAt: attemptedAt.toISOString(),
      }),
      { contentType: "application/json", upsert: false },
    );
    if (attempt.error) {
      const completed = await read(prefix + ".jpg");
      if (completed) {
        assertArtwork(completed);
        return completed;
      }
      throw Error("instagram_auto_generation_busy");
    }

    spent = true;
    const bytes = await generate(article);
    assertArtwork(bytes);
    const saved = await storage.upload(prefix + ".jpg", bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (saved.error) throw Error("instagram_auto_generation_unconfirmed");
    return bytes;
  };
}
