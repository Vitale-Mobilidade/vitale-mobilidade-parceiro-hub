import { ELEMENT_LAYOUT } from "../../supabase/functions/_shared/heatmap-elements";
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


describe("element heatmap Admin gate",()=>{
 const part=source.slice(source.indexOf('    if (action === "heatmap-elements") {'),source.indexOf('    if (action === "heatmap") {'));
 const invoke=async(role:string,viewport:number)=>{const rpc=vi.fn().mockResolvedValue({data:{bins:[],viewport:390,viewports:[]},error:null});const fn=runInNewContext(`(async function(){${part}})`,{actor:{role},body:{path:"/",screen:"mobile",days:30,viewport},action:"heatmap-elements",req:{},db:{rpc},ELEMENT_LAYOUT,heatmapPath,json:(_r:unknown,data:unknown,status=200)=>({data,status})});return{response:await fn(),rpc};};
 it("denies non-Admin and mismatched viewport without querying aggregates",async()=>{for(const [role,width,status] of [["content",390,403],["operation",390,403],["admin",1440,400]] as const){const h=await invoke(role,width);expect(h.response.status).toBe(status);expect(h.rpc).not.toHaveBeenCalled();}});
 it("reads a fixed RPC scoped to exact page, version and viewport",async()=>{const h=await invoke("admin",390);expect(h.response.status).toBe(200);expect(h.rpc).toHaveBeenCalledWith("admin_heatmap_elements",{p_path:"/",p_screen:"mobile",p_layout:ELEMENT_LAYOUT,p_days:30,p_viewport:390});});
});
