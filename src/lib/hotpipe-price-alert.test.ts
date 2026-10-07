import { describe, it, expect } from "vitest";
import { validHotpipeAck, retryableHotpipeStatus, hotpipeRetryDelay } from "../../supabase/functions/_shared/hotpipe-price-alert";
const event = { event_id: "event", request_id: "request", revision: 2 };
describe("Hotpipe outbox protocol", () => {
 it("only acknowledges matching persisted events", () => {
  const ack = { ok: true, ...event, result: "accepted" };
  expect(validHotpipeAck(ack, event)).toBe(true);
  for (const change of [{ok:false},{event_id:"other"},{request_id:"other"},{revision:1},{revision:2.5},{result:"unknown"}]) expect(validHotpipeAck({...ack,...change},event)).toBe(false);
  expect(validHotpipeAck({...ack,revision:3,result:"ignored_stale"},event)).toBe(true);
  expect(validHotpipeAck({...ack,revision:1,result:"already_sent"},event)).toBe(true);
 });
 it("retries transient failures but not permanent contract errors", () => {
  for (const status of [0,429,500,503]) expect(retryableHotpipeStatus(status)).toBe(true);
  expect(retryableHotpipeStatus(409,"request_busy")).toBe(true);
  for (const status of [400,401,403,409,413,422]) expect(retryableHotpipeStatus(status)).toBe(false);
 });
 it("honors retry-after and caps backoff", () => {
  expect(hotpipeRetryDelay(1,"120")).toBe(120000);
  expect(hotpipeRetryDelay(1,"99999999")).toBe(86400000);
  expect(hotpipeRetryDelay(2,null)).toBeGreaterThanOrEqual(60000);
 });
});
