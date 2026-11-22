import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect, vi } from "vitest";
import { growthRange } from "../../supabase/functions/_shared/growth-range";
const source = readFileSync(
  new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url),
  "utf8",
);
const branch = source.slice(
  source.indexOf('    if (action === "links-journeys") {'),
  source.indexOf('    if (action === "links-campaign") {'),
);
async function run(
  role: string,
  body: Record<string, unknown> = {},
  failed = false,
) {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: { sessions: 2 }, error: failed ? {} : null });
  const call = runInNewContext(`(async function(){${branch}})`, {
    action: "links-journeys",
    actor: { role },
    body,
    req: {},
    db: { rpc },
    growthRange,
    Deno: { env: { get: () => undefined } },
    json: (_req: unknown, data: unknown, status = 200) => ({ data, status }),
  });
  return { response: await call(), rpc };
}
describe("bio journey admin", () => {
  it.each(["content", "operation"])(
    "blocks %s before querying",
    async (role) => {
      const h = await run(role);
      expect(h.response.status).toBe(403);
      expect(h.rpc).not.toHaveBeenCalled();
    },
  );
  it("validates dates/pagination and uses a fixed RPC with collection paused by default", async () => {
    const h = await run("admin", {
      startDate: "2026-11-20",
      endDate: "2026-11-22",
      offset: 20,
    });
    expect(h.response.data).toEqual({ sessions: 2, collectionEnabled: false });
    expect(h.rpc).toHaveBeenCalledWith("admin_links_journeys", {
      p_start: "2026-11-20",
      p_end: "2026-11-22",
      p_offset: 20,
    });
    for (const offset of [-1, 1, 10001, "20"]) {
      const x = await run("admin", { offset });
      expect(x.response.status).toBe(400);
      expect(x.rpc).not.toHaveBeenCalled();
    }
  });
  it("does not return zero when reading fails", async () => {
    expect((await run("admin", {}, true)).response.status).toBe(503);
  });
});
