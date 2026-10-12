import { describe, it, expect, vi } from "vitest";
import { EDITORIAL_ALERT_RECIPIENT, sendEditorialAlert } from "./editorial-alert";
const input = { videoId: "yrsgUwKBYk0", recipient: "owner@example.com", from: "Vitale <ops@example.com>", key: "mock-key", reason: "Bikes ambíguas." };
describe("editorial intervention email", () => {
  it("routes operational errors to the requested address", () => {
    expect(EDITORIAL_ALERT_RECIPIENT).toBe("guilherme@hotpipe.com.br");
  });
  it("uses stable idempotency, reason and an actionable Admin URL", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    await sendEditorialAlert({ ...input, request });
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers["Idempotency-Key"]).toBe("editorial-review-yrsgUwKBYk0");
    const body = JSON.parse(options.body);
    expect(body.to).toEqual([input.recipient]);
    expect(body.text).toContain("/admin/conteudos/novo?video=yrsgUwKBYk0");
    expect(body.text).toContain(input.reason);
    expect(body.text).not.toContain(input.key);
  });
  it("supports the configured Lovable connector", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    await sendEditorialAlert({ ...input, request, gatewayKey: "mock-gateway" });
    expect(request.mock.calls[0][0]).toContain("connector-gateway.lovable.dev/resend/emails");
    expect(request.mock.calls[0][1].headers["X-Connection-Api-Key"]).toBe(input.key);
  });
  it("rejects invalid destination before sending", async () => {
    const request = vi.fn();
    await expect(sendEditorialAlert({ ...input, recipient: "", request })).rejects.toThrow("not_configured");
    expect(request).not.toHaveBeenCalled();
  });
  it("reports provider failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response("private error", { status: 403 }));
    await expect(sendEditorialAlert({ ...input, request })).rejects.toThrow("delivery_failed");
  });
});
