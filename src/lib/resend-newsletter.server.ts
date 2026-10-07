/** Resend credentials and recipient data are restricted to the server. */
export type ResendContact = {
  id: string;
  email: string;
  first_name: string | null;
  unsubscribed: boolean;
};
export type ResendUsage = {
  contacts: { used: number; limit: number };
  segments: { used: number; limit: number | null };
  broadcasts: { used: number; limit: number | null };
};
export class ResendFault extends Error {
  constructor(
    public status: number,
    public uncertain = false,
    public retryAt?: number,
  ) {
    super(`resend_${status || "network"}`);
  }
}
export class ResendNewsletter {
  private lastCallAt = 0;
  constructor(
    private key: string,
    private request: typeof fetch = fetch,
    private pace = 650,
    private gatewayKey?: string,
  ) {}
  async call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    // Default Resend team limit is 2 requests/sec. Also respect Retry-After on 429 by stopping the tick.
    const delay = Math.max(0, this.lastCallAt + this.pace - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    this.lastCallAt = Date.now();
    let res: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      res = await this.request.call(
        globalThis,
        `https://${this.gatewayKey ? "connector-gateway.lovable.dev/resend" : "api.resend.com"}${path}`,
        {
          method,
          redirect: "manual",
          headers: {
            Authorization: `Bearer ${this.gatewayKey ?? this.key}`,
            ...(this.gatewayKey ? { "X-Connection-Api-Key": this.key } : {}),
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } catch {
      throw new ResendFault(0, method !== "GET");
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      const retryAfter = res.headers.get("retry-after");
      const retryAt = retryAfter
        ? /^\d+(?:\.\d+)?$/.test(retryAfter)
          ? Date.now() + Number(retryAfter) * 1000
          : Date.parse(retryAfter)
        : undefined;
      throw new ResendFault(
        res.status,
        method !== "GET" && res.status >= 500,
        Number.isFinite(retryAt) ? retryAt : undefined,
      );
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new ResendFault(res.status, method !== "GET");
    }
  }
  async list<T extends { id: string }>(path: string): Promise<T[]> {
    const out: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < 30; page++) {
      const data = await this.call<{ data: T[]; has_more: boolean }>(
        `${path}?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`,
      );
      if (!Array.isArray(data.data)) throw new Error("invalid_resend_page");
      out.push(...data.data);
      if (!data.has_more) return out;
      const next = data.data.at(-1)?.id;
      if (!next || next === after) throw new Error("invalid_resend_cursor");
      after = next;
    }
    throw new Error("resend_pagination_limit");
  }
  async contact(email: string): Promise<ResendContact | null> {
    try {
      return await this.call<ResendContact>(
        `/contacts/${encodeURIComponent(email)}`,
      );
    } catch (e) {
      if (e instanceof ResendFault && e.status === 404) return null;
      throw e;
    }
  }
  async ensureContact(
    email: string,
    name: string,
  ): Promise<ResendContact | null> {
    const found = await this.contact(email);
    if (found?.unsubscribed) return null; // Never reset an upstream opt-out, even after local re-registration.
    const first = name
      .trim()
      .split(/\s+/)[0]
      .replace(/[<>&{}$"']/g, "")
      .slice(0, 60);
    if (found) {
      if (found.first_name !== first)
        await this.call(`/contacts/${found.id}`, "PATCH", {
          first_name: first,
        });
      return found;
    }
    const usage = await this.call<ResendUsage>("/usage");
    if (
      !Number.isFinite(usage.contacts?.used) ||
      !Number.isFinite(usage.contacts?.limit) ||
      usage.contacts.used >= Math.min(1000, usage.contacts.limit)
    )
      throw new Error("free_contact_limit");
    // Creating a contact after a network timeout is reconciled by GET on the next tick.
    const created = await this.call<{ id: string }>("/contacts", "POST", {
      email,
      first_name: first,
      unsubscribed: false,
    });
    if (!created.id) throw new Error("invalid_contact_ack");
    return { id: created.id, email, first_name: first, unsubscribed: false };
  }
  async members(segment: string) {
    return this.list<ResendContact>(`/segments/${segment}/contacts`);
  }
  async reconcileSegment(segment: string, expected: ResendContact[]) {
    const wanted = new Set(expected.map((c) => c.id));
    for (const member of await this.members(segment)) {
      if (!wanted.has(member.id))
        await this.call(`/contacts/${member.id}/segments/${segment}`, "DELETE");
    }
    for (const member of expected)
      await this.call(`/contacts/${member.id}/segments/${segment}`, "POST");
    const actual = (await this.members(segment))
      .filter((c) => !c.unsubscribed)
      .map((c) => c.id)
      .sort();
    const ids = [...wanted].sort();
    if (JSON.stringify(actual) !== JSON.stringify(ids))
      throw new Error("audience_mismatch");
  }
  async verifySender(email: string) {
    const domainName = email.split("@")[1];
    const domains = await this.list<{
      id: string;
      name: string;
      status: string;
    }>("/domains");
    const domain = domains.find(
      (d) => d.name === domainName && d.status === "verified",
    );
    if (!domain) throw new Error("sender_not_verified");
    const detail = await this.call<{ capabilities?: { sending?: string } }>(
      `/domains/${domain.id}`,
    );
    if (detail.capabilities?.sending !== "enabled")
      throw new Error("sender_sending_disabled");
  }
}
