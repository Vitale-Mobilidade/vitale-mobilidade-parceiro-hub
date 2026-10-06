import { describe, expect, it, vi } from "vitest";
import { youtubeTokenProvider } from "./youtube-oauth.ts";
const credentials = {
  clientId: "test-client",
  clientSecret: "test-secret",
  refreshToken: "test-refresh",
};
const success = () =>
  Response.json({
    access_token: "test-access",
    expires_in: 3600,
    token_type: "Bearer",
  });
describe("YouTube unattended authorization", () => {
  it("refreshes once for concurrent calls and renews before expiry", async () => {
    let time = 0;
    const request = vi.fn(async () => success());
    const token = youtubeTokenProvider(
      credentials,
      request as typeof fetch,
      () => time,
    );
    expect(await Promise.all([token(), token()])).toEqual([
      "test-access",
      "test-access",
    ]);
    expect(request).toHaveBeenCalledTimes(1);
    time = 3_541_000;
    await token();
    expect(request).toHaveBeenCalledTimes(2);
    const [url, options] = request.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(options.redirect).toBe("error");
    expect((options.body as URLSearchParams).get("grant_type")).toBe(
      "refresh_token",
    );
  });
  it("requires reconnection for rejected grant without leaking provider body", async () => {
    const request = vi.fn(async () =>
      Response.json(
        { error: "invalid_grant", detail: "test-secret" },
        { status: 400 },
      ),
    );
    await expect(
      youtubeTokenProvider(credentials, request as typeof fetch)(),
    ).rejects.toMatchObject({
      code: "youtube_reconnect_required",
      retryable: false,
    });
  });
  it("permits retry after transient failure and clears pending request", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response("private detail", { status: 503 }))
      .mockResolvedValueOnce(success());
    const token = youtubeTokenProvider(credentials, request as typeof fetch);
    await expect(token()).rejects.toMatchObject({
      code: "youtube_oauth_unavailable",
      retryable: true,
    });
    expect(await token()).toBe("test-access");
  });
  it("rejects incomplete configuration without transmitting anything", async () => {
    const request = vi.fn();
    await expect(
      youtubeTokenProvider(
        { ...credentials, refreshToken: "" },
        request as typeof fetch,
      )(),
    ).rejects.toMatchObject({ code: "youtube_oauth_not_configured" });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects malformed successful responses without caching them", async () => {
    const request = vi.fn(async () =>
      Response.json({ access_token: "test-access", expires_in: "3600" }),
    );
    await expect(
      youtubeTokenProvider(credentials, request as typeof fetch)(),
    ).rejects.toMatchObject({ code: "youtube_oauth_invalid_response" });
  });
});
