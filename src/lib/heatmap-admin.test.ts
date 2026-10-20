import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect, vi } from "vitest";
import {
  HEATMAP_LAYOUT,
  heatmapPath,
} from "../../supabase/functions/_shared/heatmap";

// Execute the actual action branch behind the existing actorFor JWT/membership gate.
const source = readFileSync(
  new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url),
  "utf8",
);
const branch = source.slice(
  source.indexOf('    if (action === "heatmap") {'),
  source.indexOf('    if (action === "growth") {'),
);
async function run(
  role: string,
  body: Record<string, unknown>,
  failed = false,
) {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: [], error: failed ? {} : null });
  const invoke = runInNewContext(`(async function(){${branch}})`, {
    actor: { role },
    body,
    action: "heatmap",
    req: {},
    db: { rpc },
    HEATMAP_LAYOUT,
    heatmapPath,
    json: (_req: unknown, data: unknown, status = 200) => ({ data, status }),
  });
  return { response: await invoke(), rpc };
}
describe("heatmap Admin action", () => {
  it("forbids content and operation roles before any data read", async () => {
    for (const role of ["content", "operation"]) {
      const h = await run(role, { path: "/", screen: "mobile", days: 30 });
      expect(h.response.status).toBe(403);
      expect(h.rpc).not.toHaveBeenCalled();
    }
  });
  it("rejects private paths and invalid filters, reads only fixed aggregates", async () => {
    const invalid = await run("admin", {
      path: "/admin",
      screen: "mobile",
      days: 30,
    });
    expect(invalid.response.status).toBe(400);
    expect(invalid.rpc).not.toHaveBeenCalled();
    const valid = await run("admin", { path: "/", screen: "mobile", days: 30 });
    expect(valid.response.status).toBe(200);
    expect(valid.rpc).toHaveBeenCalledWith("admin_heatmap", {
      p_path: "/",
      p_screen: "mobile",
      p_layout: HEATMAP_LAYOUT,
      p_days: 30,
    });
    expect(
      (await run("admin", { path: "/", screen: "mobile", days: 30 }, true))
        .response.status,
    ).toBe(503);
  });
});
