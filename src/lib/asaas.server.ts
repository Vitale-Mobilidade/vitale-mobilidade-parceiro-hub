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
      response = await this.request(this.base + path, {
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
export function validBillingDocument(value: string): boolean {
  const n = value.replace(/\D/g, "");
  if (!/^(\d{11}|\d{14})$/.test(n) || /^(\d)\1+$/.test(n)) return false;
  const digit = (base: string, weights: number[]) => {
    const rem =
      [...base].reduce((sum, v, i) => sum + Number(v) * weights[i], 0) % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  if (n.length === 11)
    return (
      digit(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(n[9]) &&
      digit(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(n[10])
    );
  return (
    digit(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(n[12]) &&
    digit(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(n[13])
  );
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
export function paidAsaasCycle(payment: Record<string, unknown>): boolean {
  return (
    payment.deleted !== true &&
    Number(payment.value) === 150 &&
    ((payment.billingType === "CREDIT_CARD" &&
      ["CONFIRMED", "RECEIVED"].includes(String(payment.status))) ||
      (payment.billingType === "PIX" && payment.status === "RECEIVED"))
  );
}
