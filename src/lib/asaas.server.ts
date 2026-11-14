/** Asaas credentials and personal billing documents stay server-side. */
export class AsaasFault extends Error {
  constructor(
    public status: number,
    public uncertain = false,
  ) {
    super("asaas_unavailable");
  }
}
export class AsaasClient {
  readonly base: string;
  constructor(
    private key: string,
    environment: string,
    private request: typeof fetch = fetch,
  ) {
    if (!["production", "sandbox"].includes(environment) || !key)
      throw new AsaasFault(503);
    this.base =
      environment === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";
  }
  async call<T = Record<string, unknown>>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    if (!/^\/[a-zA-Z0-9/_?=&.%+-]+$/.test(path)) throw new AsaasFault(400);
    let response: Response;
    try {
      response = await this.request.call(globalThis, this.base + path, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          access_token: this.key,
          "Content-Type": "application/json",
          "User-Agent": "VitaleMobilidade/1.0",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AsaasFault(0, method !== "GET");
    }
    if (method === "DELETE" && response.status === 404)
      return { deleted: true } as T;
    if (!response.ok)
      throw new AsaasFault(
        response.status,
        method !== "GET" && response.status >= 500,
      );
    try {
      return (await response.json()) as T;
    } catch {
      throw new AsaasFault(response.status, method !== "GET");
    }
  }
}
export function safeAsaasPaymentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      [
        "www.asaas.com",
        "asaas.com",
        "sandbox.asaas.com",
        "www.sandbox.asaas.com",
      ].includes(u.hostname) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function paidAsaasCycle(
  payment: Record<string, unknown>,
  amountCents: number,
): boolean {
  return (
    payment.deleted !== true &&
    Number(payment.value) === amountCents / 100 &&
    ((payment.billingType === "CREDIT_CARD" &&
      ["CONFIRMED", "RECEIVED"].includes(String(payment.status))) ||
      (payment.billingType === "PIX" && payment.status === "RECEIVED"))
  );
}
