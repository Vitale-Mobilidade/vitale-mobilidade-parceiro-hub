import { afterEach, expect, it, vi } from "vitest";
import { publishGt20Replacement } from "../editorial-admin/instagram-gt20-replacement.ts";

const original = vi.hoisted(() => ({
  path: "770ef7af-91df-4ff5-95a0-302dcf641971/backgrounds/52d42f59-7fa1-4463-8a70-d9cc2ecffdd2.png",
  original: true,
  mime: "image/png",
  bytes: Uint8Array.of(1),
}));
vi.mock("./published-cover-source.ts", () => ({ readPublishedCoverSource: vi.fn(async () => original) }));
vi.mock("./cover-renderer/index.ts", () => ({
  composeFullBleedCover: () => ({ bytes: Uint8Array.of(255,216,255,192,0,7,8,5,70,4,56,255,217) }),
}));

const origin = "https://db.example.com";
const removed = "https://www.instagram.com/p/Df2LPJWF5z4/";
const replacement = "https://www.instagram.com/p/replacement/";
const title = "GT20 Pro";
const env = (name: string) => name.endsWith("TOKEN") ? "fake-token" : name.endsWith("VERSION") ? "v25.0" : undefined;
afterEach(() => vi.unstubAllGlobals());

function fixture(failPublish = false) {
  let claimed = false;
  const audits: Array<{action: string; detail: object}> = [];
  const post = { title, caption: "Legenda original", permalink: removed, media_id: "111", fingerprint: "original" };
  const bucket = {
    upload: vi.fn(async () => {
      if (claimed) return { error: { message: "already exists" } };
      claimed = true;
      return { error: null };
    }),
    createSignedUrl: async (path: string) => ({
      error: null, data: { signedUrl: `${origin}/storage/v1/object/sign/editorial-covers/${path}?token=mock` },
    }),
  };
  const db = {
    storage: { from: () => bucket },
    from(table: string) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ error: null, data: table === "instagram_single_posts" ? post : { title } }),
        insert: async (audit: {action: string; detail: object}) => { audits.push(audit); return { error: null }; },
      };
      return query;
    },
  } as unknown as Parameters<typeof publishGt20Replacement>[0];
  const fetch = vi.fn(async (url: URL, options: RequestInit) => {
    if (url.pathname.endsWith("/me")) return Response.json({ user_id: "100", username: "vitalemobilidade" });
    if (url.pathname.endsWith("/media")) {
      expect((options.body as URLSearchParams).get("caption")).toBe(post.caption);
      return Response.json({ id: "200" });
    }
    if (url.pathname.endsWith("/200")) return Response.json({ status_code: "FINISHED" });
    if (url.pathname.endsWith("/media_publish"))
      return failPublish ? Response.json({error: {}}, {status: 400}) : Response.json({ id: "300" });
    if (url.pathname.endsWith("/300")) return Response.json({ permalink: replacement });
    throw Error("unexpected request");
  });
  vi.stubGlobal("fetch", fetch);
  return { db, audits, fetch, bucket, post };
}

it("uses the original caption and claims the corrected image only once when two clicks race", async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    publishGt20Replacement(f.db, origin, env, "admin"),
    publishGt20Replacement(f.db, origin, env, "admin"),
  ]);
  expect(results.filter(x => x.status === "fulfilled")).toEqual([
    { status: "fulfilled", value: { status: "published", mediaId: "300", permalink: replacement, auditRecorded: true } },
  ]);
  expect(f.fetch.mock.calls.filter(([url]) => url.pathname.endsWith("/media_publish"))).toHaveLength(1);
  expect(f.post.permalink).toBe(removed);
  expect(f.audits.map(audit => audit.action)).toEqual([
    "instagram_replacement_attempted", "instagram_replacement_container", "instagram_replacement_published",
  ]);
});

it("keeps a durable block after an unconfirmed publish", async () => {
  const f = fixture(true);
  await expect(publishGt20Replacement(f.db, origin, env, "admin"))
    .rejects.toThrow("instagram_replacement_unconfirmed");
  await expect(publishGt20Replacement(f.db, origin, env, "admin"))
    .rejects.toThrow("instagram_replacement_claim_failed");
  expect(f.fetch.mock.calls.filter(([url]) => url.pathname.endsWith("/media_publish"))).toHaveLength(1);
});
