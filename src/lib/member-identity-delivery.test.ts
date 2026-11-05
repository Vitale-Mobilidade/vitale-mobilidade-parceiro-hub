import { afterEach, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() =>
  vi.fn(async () => ({ data: { ok: true }, error: null })),
);
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));
import { requestSignupIdentityCodes } from "./member-identity-delivery";
afterEach(() => invoke.mockClear());
it("password signup requests the two independent codes", async () => {
  await requestSignupIdentityCodes("11999999999");
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(
    invoke.mock.calls.map(
      (c) =>
        (c as unknown as [string, { body: { channel: string } }])[1].body
          .channel,
    ),
  ).toEqual(["email", "phone"]);
});
it("trusted Google email skips redundant email transport and still requests WhatsApp", async () => {
  const result = await requestSignupIdentityCodes("11999999999", true);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith("member-identity-code", {
    body: { channel: "phone", phone: "+5511999999999", consent: true },
  });
  expect(result).toEqual({ email: { ok: true }, phone: { ok: true } });
});
