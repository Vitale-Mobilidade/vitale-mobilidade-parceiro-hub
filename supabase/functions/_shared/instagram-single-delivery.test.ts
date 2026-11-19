import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { manageInstagramDelivery } from "../editorial-admin/instagram-single-delivery.ts";
import { instagramWorkerActor } from "../editorial-admin/instagram-worker-actor.ts";

const sender = vi.hoisted(() => vi.fn(async () => ({status: "published", permalink: "https://www.instagram.com/p/sent/"})));
vi.mock("../editorial-admin/instagram-single.ts", () => ({sendInstagramSingle: sender}));
afterEach(() => vi.clearAllMocks());

const post = {
  id: "11223344-1234-1234-1234-123456789abc", article_id: "22334455-1234-1234-1234-123456789abc",
  video_id: "abcdefghijk", title: "Uma bike", fingerprint: "a".repeat(64), state: "scheduled",
  due_at: "2030-11-19T20:45:00Z", attempted_at: null, lease: null, lease_until: null,
};
function fixture(options: {attempted?: boolean; hold?: boolean; legacy?: boolean; paused?: boolean; conflict?: boolean; occupied?: boolean} = {}) {
  const filters: string[] = [];
  const writes: Array<Record<string, unknown>> = [];
  const active = {...post, attempted_at: options.attempted ? "2026-11-19T15:00Z" : null};
  const db = createClient("https://db.example", "mock", {global: {fetch: async (input, init) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1);
    if (table === "instagram_single_posts") {
      if (init?.method === "PATCH") {
        filters.push(url.search);
        const patch = JSON.parse(String(init.body));
        writes.push(patch);
        if (options.occupied) return Response.json({code: "23505", message: "occupied"}, {status: 409});
        return Response.json(options.conflict ? [] : [{...active, ...patch}]);
      }
      return Response.json([active]);
    }
    if (table === "instagram_single_settings") return Response.json({automation_enabled: !options.paused});
    if (table === "podcast_distribution_settings") return Response.json({instagram_enabled: false});
    if (table === "instagram_carousel_settings") return Response.json({publishing_enabled: false});
    if (table === "instagram_carousel_sources") return Response.json([{article_title: post.title}]);
    if (table === "podcast_episode_queue") return Response.json(options.hold ? [{prepared_instagram_post: {reviewHold: true}}] : []);
    if (table === "podcast_instagram_deliveries") return Response.json(options.legacy ? [{youtube_id: post.video_id}] : []);
    if (table === "instagram_carousel_jobs") return Response.json([]);
    throw Error("Unexpected table");
  }}});
  return {db: db as never, filters, writes};
}
const generate = vi.fn();
const env = () => undefined;
const body = {id: post.id, fingerprint: post.fingerprint};

it("claims only the selected post and uses the shared sender", async () => {
  const f = fixture();
  await expect(manageInstagramDelivery(f.db, "now", body, "https://db.example", env, generate)).resolves.toMatchObject({status: "published"});
  expect(f.filters[0]).toContain("attempted_at=is.null");
  expect(f.filters[0]).toContain("lease=is.null");
  expect(f.filters[0]).toContain("fingerprint=eq." + post.fingerprint);
  expect(sender).toHaveBeenCalledWith(f.db, "https://db.example", env, expect.objectContaining({id: post.id, state: "publishing"}), generate, undefined);
});

it("saves a São Paulo time without sending", async () => {
  const f = fixture();
  await expect(manageInstagramDelivery(f.db, "schedule", {...body, localTime: "2030-11-20T12:30"}, "https://db.example", env, generate))
    .resolves.toEqual({status: "scheduled", dueAt: "2030-11-20T15:30:00.000Z"});
  expect(f.writes[0]).toMatchObject({state: "scheduled", due_at: "2030-11-20T15:30:00.000Z"});
  expect(sender).not.toHaveBeenCalled();
});

it.each([{attempted: true}, {hold: true}, {legacy: true}, {paused: true}, {conflict: true}])(
  "never sends if the post is unavailable: %j", async options => {
    const f = fixture(options);
    await expect(manageInstagramDelivery(f.db, "now", body, "https://db.example", env, generate)).rejects.toThrow();
    expect(sender).not.toHaveBeenCalled();
  },
);

it("reports an occupied minute and refuses dates normalized from invalid calendar days", async () => {
  const f = fixture({occupied: true});
  await expect(manageInstagramDelivery(f.db, "schedule", {...body, localTime: "2030-11-20T12:30"}, "", env, generate))
    .rejects.toThrow("instagram_schedule_slot_busy");
  const invalid = fixture();
  await expect(manageInstagramDelivery(invalid.db, "schedule", {...body, localTime: "2030-02-30T12:30"}, "", env, generate))
    .rejects.toThrow("instagram_schedule_date_invalid");
  expect(invalid.writes).toHaveLength(0);
});

it("obtains a worker identity using only the membership privilege available in production", async () => {
  const tables: string[] = [];
  const db = createClient("https://db.example", "mock", {global: {fetch: async input => {
    const url = new URL(String(input));
    tables.push(url.pathname);
    expect(url.searchParams.get("role")).toBe("eq.admin");
    expect(url.searchParams.get("active")).toBe("eq.true");
    return Response.json([{user_id: "owner"}]);
  }}});
  await expect(instagramWorkerActor(db as never)).resolves.toEqual({id: "owner", role: "admin", email: null});
  expect(tables).toEqual(["/rest/v1/editorial_admin_memberships"]);
});
