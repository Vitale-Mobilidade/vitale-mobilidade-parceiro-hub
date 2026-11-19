import { afterEach, expect, it, vi } from "vitest";
import { sendInstagramSingle } from "../editorial-admin/instagram-single.ts";
const meta = vi.hoisted(() => ({
  account: vi.fn(async () => "1"), create: vi.fn(async () => "2"), status: vi.fn(async () => "FINISHED"),
  publish: vi.fn(async () => "3"), permalink: vi.fn(async () => "https://www.instagram.com/p/sent/"),
}));
vi.mock("./podcast-instagram.ts", () => ({
  instagramPublisher: () => meta,
  readInstagramSettings: () => ({token: "mock", version: "v25.0"}),
}));
afterEach(() => vi.clearAllMocks());

async function fixture(holdRefill = false) {
  const bytes = Uint8Array.of(1,2,3);
  const caption = "Legenda";
  const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
  const fingerprint = await hash(new TextEncoder().encode(`${await hash(bytes)}\n${caption}`));
  const states: string[] = [];
  const refill = vi.fn();
  const db = {
    from(table: string) {
      const q = {
        select: () => q, eq: () => q, in: () => q, limit: () => q,
        update(patch: {state?: string}) { if(patch.state) states.push(patch.state); return q; },
        single: async () => {
          if (table === "instagram_single_settings") {
            refill();
            if (holdRefill) return await new Promise(() => {});
            return {data: {automation_enabled: true, pilot_id: "pilot"}};
          }
          return {data: {id: "post"}};
        },
        then(resolve: (value: object) => void) { resolve({data: [{state:"scheduled"},{state:"scheduled"},{state:"scheduled"}]}); },
      };
      return q;
    },
    storage: {from: () => ({
      download: async () => ({data: new Blob([bytes])}),
      createSignedUrl: async () => ({data: {signedUrl: "https://db.example/storage/v1/object/sign/editorial-covers/photo.jpg?token=mock"}}),
    })},
  } as unknown as Parameters<typeof sendInstagramSingle>[0];
  return {db, states, refill, post: {id: "post", lease: "lease", asset_path: "photo.jpg", caption, fingerprint}};
}

it("starts queue replenishment after confirmed publication", async () => {
  const f = await fixture();
  await expect(sendInstagramSingle(f.db, "https://db.example", () => undefined, f.post)).resolves.toMatchObject({status:"published"});
  expect(f.states).toEqual(["publishing", "published"]);
  expect(f.refill).toHaveBeenCalledTimes(1);
});

it("returns the confirmed permalink while preparation continues in the background", async () => {
  const f = await fixture(true), background = vi.fn();
  await expect(sendInstagramSingle(f.db, "https://db.example", () => undefined, f.post, undefined, background))
    .resolves.toEqual({status:"published", permalink:"https://www.instagram.com/p/sent/"});
  expect(background).toHaveBeenCalledTimes(1);
  expect(f.refill).toHaveBeenCalledTimes(1);
});

it("keeps uncertain publication in attention and does not prepare another source", async () => {
  const f = await fixture();
  meta.publish.mockRejectedValueOnce(Error("timeout"));
  await expect(sendInstagramSingle(f.db, "https://db.example", () => undefined, f.post))
    .resolves.toEqual({status:"shipment_unconfirmed"});
  expect(f.states).toEqual(["publishing", "attention"]);
  expect(f.refill).not.toHaveBeenCalled();
});
