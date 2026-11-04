/** Browser-safe allowlist. No key/provider client is imported by checkout UI. */
export function safePaymentLink(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "www.asaas.com",
        "asaas.com",
        "sandbox.asaas.com",
        "www.sandbox.asaas.com",
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
