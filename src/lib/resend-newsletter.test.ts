import { describe, it, expect, vi } from "vitest";
import { ResendNewsletter, ResendFault } from "./resend-newsletter.server";
const contact = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "mock@example.com",
  first_name: "Mock",
  unsubscribed: false,
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
describe("Resend newsletter transport", () => {
  it("preserves the platform fetch receiver required by Workers", async () => {
    const request = function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(json({ ok: true }));
    } as typeof fetch;
    expect(await new ResendNewsletter("test", request, 0).call("/domains"))
      .toEqual({ ok: true });
  });
  it("never reactivates an upstream unsubscribe", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(json({ ...contact, unsubscribed: true }));
    const resend = new ResendNewsletter("test", request, 0);
    expect(await resend.ensureContact(contact.email, "Mock")).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].method).toBe("GET");
  });
  it("checks the account-wide free cap before creating a new contact", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ contacts: { used: 1000, limit: 1000 } }));
    await expect(
      new ResendNewsletter("test", request, 0).ensureContact(
        contact.email,
        "Mock",
      ),
    ).rejects.toThrow("free_contact_limit");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("distinguishes mutation uncertainty from rate limiting", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({}, 429));
    const resend = new ResendNewsletter("test", request, 0);
    await expect(resend.call("/broadcasts", "POST", {})).rejects.toMatchObject({
      status: 500,
      uncertain: true,
    });
    await expect(resend.call("/broadcasts", "POST", {})).rejects.toMatchObject({
      status: 429,
      uncertain: false,
    });
  });
  it("uses the Lovable gateway with server-only credentials when configured", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(json({ contacts: { used: 1, limit: 1000 } }));
    await new ResendNewsletter(
      "connection-secret",
      request,
      0,
      "gateway-secret",
    ).call("/usage");
    expect(request).toHaveBeenCalledWith(
      "https://connector-gateway.lovable.dev/resend/usage",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer gateway-secret",
          "X-Connection-Api-Key": "connection-secret",
        }),
      }),
    );
  });
  it("paginates all members and refuses a silently partial audience", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({ data: [contact], has_more: true }))
      .mockResolvedValueOnce(
        json({ data: [{ ...contact, id: "next" }], has_more: false }),
      );
    expect(
      await new ResendNewsletter("test", request, 0).members("segment"),
    ).toHaveLength(2);
    expect(request.mock.calls[1][0]).toContain("after=");
  });
  it("removes only obsolete segment membership, never a contact", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({ data: [contact], has_more: false }))
      .mockResolvedValueOnce(json({ deleted: true }))
      .mockResolvedValueOnce(json({ data: [], has_more: false }));
    await new ResendNewsletter("test", request, 0).reconcileSegment(
      "segment",
      [],
    );
    expect(request.mock.calls[1][0]).toBe(
      `https://api.resend.com/contacts/${contact.id}/segments/segment`,
    );
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });
  it("marks lost mutation responses as uncertain", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      new ResendNewsletter("test", request, 0).call("/broadcasts", "POST", {}),
    ).rejects.toBeInstanceOf(ResendFault);
  });
  it("rejects redirects without forwarding provider credentials", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://other.invalid" },
      }),
    );
    await expect(
      new ResendNewsletter("test", request, 0).call("/broadcasts", "POST", {}),
    ).rejects.toMatchObject({ status: 302, uncertain: false });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].redirect).toBe("manual");
  });
  it("retains Retry-After rather than immediately repeating a rejected operation", async () => {
    const now = Date.now();
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "Retry-After": "600" } }),
      );
    await expect(
      new ResendNewsletter("test", request, 0).call("/usage"),
    ).rejects.toMatchObject({ status: 429, retryAt: expect.any(Number) });
    expect(request).toHaveBeenCalledTimes(1);
    try {
      await new ResendNewsletter("test", request, 0).call("/usage");
    } catch (e) {
      expect((e as ResendFault).retryAt).toBeGreaterThanOrEqual(now + 600000);
    }
  });
});
