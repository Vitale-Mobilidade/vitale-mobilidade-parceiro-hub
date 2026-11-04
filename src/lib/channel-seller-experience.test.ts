import { describe, expect, it, vi, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  requestMemberIdentityCode,
  requestSignupIdentityCodes,
} from "./member-identity-delivery";
import {
  isEmptyBikeDraft,
  listingDraftInputSchema,
  listingInputSchema,
  listingSchema,
  listingWhatsAppHref,
} from "./bike-classifieds";
const id = "00000000-0000-4000-8000-000000000090";
const draft = {
  id,
  title: "Minha bike",
  brand: "",
  model: "",
  priceCents: 0,
  city: "",
  state: "",
  modelYear: null,
  mileageKm: null,
  condition: "good",
  battery: "unknown",
  invoice: false,
  description: "",
  maintenance: "",
  status: "draft",
  feeCents: 15000,
  feeStatus: "pilot_exempt",
  images: [],
  publishedAt: null,
  updatedAt: "2026-11-04T14:00:00Z",
};
afterEach(() => vi.clearAllMocks());
describe("signup delivery", () => {
  it("attempts each channel exactly once and reports independent failures", async () => {
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({ data: { ok: true }, error: null } as never)
      .mockRejectedValueOnce(new Error("provider unavailable"));
    expect(await requestSignupIdentityCodes("11999999999")).toEqual({
      email: { ok: true },
      phone: { ok: false },
    });
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    expect(vi.mocked(supabase.functions.invoke).mock.calls[1][1]?.body).toEqual(
      { channel: "phone", phone: "+5511999999999", consent: true },
    );
  });
  it("never sends a phone code without a valid number and consent", async () => {
    await expect(
      requestMemberIdentityCode("phone", "11999999999", false),
    ).rejects.toThrow("invalid_phone");
    await expect(
      requestMemberIdentityCode("phone", "invalid", true),
    ).rejects.toThrow("invalid_phone");
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
it("allows incomplete drafts while keeping publication strict and meaningful drafts visible", () => {
  expect(
    listingDraftInputSchema.safeParse({ ...draft, title: "" }).success,
  ).toBe(true);
  expect(listingInputSchema.safeParse(draft).success).toBe(false);
  const parsed = listingSchema.parse(draft);
  expect(isEmptyBikeDraft(parsed)).toBe(true);
  expect(isEmptyBikeDraft({ ...parsed, brand: "Marca" })).toBe(false);
  expect(isEmptyBikeDraft({ ...parsed, mileageKm: 0 })).toBe(false);
});
it("builds a direct encoded WhatsApp link with a real canonical listing reference", () => {
  const url = new URL(
    listingWhatsAppHref("+5511999999999", { id, title: "V9 & Max?" }),
  );
  expect(url.origin + url.pathname).toBe("https://wa.me/5511999999999");
  expect(url.searchParams.get("text")).toBe(
    `Olá! Vi a bike V9 & Max? na Vitale Mobilidade e gostaria de saber se ainda está disponível. https://vitalemobilidade.com/venda-sua-bike/${id}`,
  );
  expect(() =>
    listingWhatsAppHref("https://evil.invalid", { id, title: "bike" }),
  ).toThrow("invalid_phone");
});
