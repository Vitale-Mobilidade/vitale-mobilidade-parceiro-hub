/** Server-only OAuth refresh. Never log the credentials or provider response. */
export class YoutubeAuthorizationError extends Error {
  readonly retryable: boolean;
  readonly code: string;
  constructor(code: string, retryable = false) {
    super(code);
    this.code = code;
    this.retryable = retryable;
  }
}

export function youtubeTokenProvider(
  credentials: { clientId: string; clientSecret: string; refreshToken: string },
  request: typeof fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let cached: { token: string; expires: number } | null = null;
  let pending: Promise<string> | null = null;
  async function refresh(): Promise<string> {
    if (Object.values(credentials).some((value) => !value.trim()))
      throw new YoutubeAuthorizationError("youtube_oauth_not_configured");
    let response: Response;
    try {
      response = await request("https://oauth2.googleapis.com/token", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: credentials.refreshToken,
        }),
      });
    } catch {
      throw new YoutubeAuthorizationError("youtube_oauth_unavailable", true);
    }
    // Do not propagate provider bodies: they can contain tokens or credential details.
    if (!response.ok) {
      if (response.status === 400 || response.status === 401)
        throw new YoutubeAuthorizationError("youtube_reconnect_required");
      throw new YoutubeAuthorizationError(
        "youtube_oauth_unavailable",
        response.status === 429 || response.status >= 500,
      );
    }
    let body: Record<string, unknown>;
    try {
      body = await response.json();
    } catch {
      throw new YoutubeAuthorizationError("youtube_oauth_invalid_response");
    }
    if (
      typeof body.access_token !== "string" ||
      !body.access_token ||
      typeof body.expires_in !== "number" ||
      !Number.isFinite(body.expires_in) ||
      body.expires_in <= 60 ||
      typeof body.token_type !== "string" ||
      body.token_type.toLowerCase() !== "bearer"
    )
      throw new YoutubeAuthorizationError("youtube_oauth_invalid_response");
    cached = {
      token: body.access_token,
      expires: now() + (body.expires_in - 60) * 1000,
    };
    return cached.token;
  }
  return () => {
    if (cached && cached.expires > now()) return Promise.resolve(cached.token);
    if (!pending)
      pending = refresh().finally(() => {
        pending = null;
      });
    return pending;
  };
}
