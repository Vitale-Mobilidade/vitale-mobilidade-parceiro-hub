import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), updates: [] as Record<string,unknown>[], filters: [] as unknown[][] }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({rpc: mock.rpc, from: mock.from}) }));
import { deliverPriceAlertOutbox } from "./hotpipe-outbox.server";
const event = {sequence:1,lease_token:"lease",attempts:1,payload:{event_id:"event",request_id:"request",revision:1}};
const signed = () => new Request("https://vitale.example/api/public/price-alert-outbox", {method:"POST",headers:{"x-worker-signature":"signature","x-worker-issued-at":"1234567890"}});
describe("Hotpipe server delivery with mocked services", () => {
 beforeEach(() => {
  vi.stubEnv("SUPABASE_URL","https://database.example"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","mock-service"); vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY","hp_"+"a".repeat(48));
  mock.updates.length=0;mock.filters.length=0;
  mock.rpc.mockReset().mockResolvedValueOnce({data:true}).mockResolvedValueOnce({data:[event]});
  mock.from.mockImplementation(() => ({update:(data:Record<string,unknown>) => {mock.updates.push(data); const chain={eq:(...args:unknown[])=>{mock.filters.push(args);return chain;},then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)};return chain;}}));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ok:true,...event.payload,result:"accepted"})));
 });
 afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
 it("rejects unsigned request without DB access",async()=>{
  expect((await deliverPriceAlertOutbox(new Request("https://vitale.example",{method:"POST"}))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();
 });
 it("does not claim events without API credential",async()=>{
  vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY","");expect((await deliverPriceAlertOutbox(signed())).status).toBe(503);expect(mock.rpc).toHaveBeenCalledTimes(1);
 });
  it("rejects malformed credential before claiming",async()=>{
   vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY","invalid-key");expect((await deliverPriceAlertOutbox(signed())).status).toBe(503);expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
  it("works without native AbortSignal.timeout",async()=>{
   const timeout=vi.spyOn(AbortSignal,"timeout").mockImplementation(()=>{throw new TypeError("Unavailable");});
   await deliverPriceAlertOutbox(signed());expect(mock.updates[0].status).toBe("delivered");expect(timeout).not.toHaveBeenCalled();
  });
  it("rejects invalid signature before claiming",async()=>{
  mock.rpc.mockReset().mockResolvedValue({data:false});expect((await deliverPriceAlertOutbox(signed())).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
 });
 it("acknowledges matching event and checks lease ownership",async()=>{
  expect((await deliverPriceAlertOutbox(signed())).status).toBe(200);expect(mock.updates[0].status).toBe("delivered");expect(mock.filters).toContainEqual(["lease_token","lease"]);
  const init=vi.mocked(fetch).mock.calls[0][1];expect(init?.redirect).toBe("manual");expect(init?.body).toBe(JSON.stringify(event.payload));
 });
 it("does not accept or follow a 302 redirect to another host",async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response(null,{status:302,headers:{Location:"https://other-host.example/steal"}}));
  await deliverPriceAlertOutbox(signed());expect(mock.updates[0].status).not.toBe("delivered");expect(mock.updates[0].last_http_status).toBe(302);
  expect(fetch).toHaveBeenCalledTimes(1);expect(vi.mocked(fetch).mock.calls[0][1]?.redirect).toBe("manual");
 });
 it("retries network failures with immutable event",async()=>{
  vi.mocked(fetch).mockRejectedValue(new Error("network"));await deliverPriceAlertOutbox(signed());expect(mock.updates[0].status).toBe("pending");
 });
 it("keeps permanent authentication failures for review",async()=>{
  vi.mocked(fetch).mockResolvedValue(Response.json({error:"invalid_api_key"},{status:401}));await deliverPriceAlertOutbox(signed());expect(mock.updates[0].status).toBe("failed");
 });
 it("retries request_busy but stops after ten attempts",async()=>{
  mock.rpc.mockReset().mockResolvedValueOnce({data:true}).mockResolvedValueOnce({data:[{...event,attempts:10}]});vi.mocked(fetch).mockResolvedValue(Response.json({error:"request_busy"},{status:409}));await deliverPriceAlertOutbox(signed());expect(mock.updates[0].status).toBe("failed");
 });
});
