export function validHotpipeAck(body: unknown, event: Record<string, unknown>): boolean {
  if (!body || typeof body !== "object") return false;
  const ack = body as Record<string, unknown>;
  return ack.ok === true && ack.event_id === event.event_id && ack.request_id === event.request_id &&
    Number.isSafeInteger(ack.revision) && Number(ack.revision) > 0 &&
    (ack.result === "already_sent" || Number(ack.revision) >= Number(event.revision)) &&
    ["accepted", "cancelled", "unchanged", "ignored_stale", "already_sent"].includes(String(ack.result));
}
export function retryableHotpipeStatus(status: number, code?: string): boolean {
  return status === 0 || status === 429 || status >= 500 || (status === 409 && code === "request_busy");
}
export function hotpipeRetryDelay(attempt: number, retryAfter: string | null, now = Date.now()): number {
  const numeric = retryAfter === null ? NaN : Number(retryAfter);
  const requested = Number.isFinite(numeric) ? numeric * 1000 : Date.parse(retryAfter ?? "") - now;
  return Math.min(86400000, Math.max(0, Number.isFinite(requested) ? requested : 0, Math.min(3600000, 30000 * 2 ** Math.max(0, attempt - 1)) + Math.floor(Math.random() * 5000)));
}
