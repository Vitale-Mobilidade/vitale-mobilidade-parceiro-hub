import { describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import {
  offersGroupAdminCall,
  validOffersGroupCatalog,
} from "./offers-group-admin";
const url = "https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t";
const catalog = {
  url,
  revision: 2,
  activeGroupId: 1,
  groups: [{ id: 1, name: "Grupo #1", url }],
};
describe("catalog RPC contract", () => {
  it("sends action and revision and accepts coherent active selection", async () => {
    rpc.mockResolvedValueOnce({ data: catalog, error: null });
    expect(
      await offersGroupAdminCall({
        p_action: "activate",
        p_group_id: 1,
        p_revision: 1,
      }),
    ).toEqual(catalog);
    expect(rpc).toHaveBeenCalledWith("manage_offers_groups", {
      p_action: "activate",
      p_group_id: 1,
      p_revision: 1,
    });
  });
  it("propagates conflict without reporting save success", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Os grupos mudaram. Recarregue antes de salvar." },
    });
    await expect(
      offersGroupAdminCall({ p_action: "save", p_revision: 1 }),
    ).rejects.toThrow("Recarregue");
  });
  it.each([
    null,
    {},
    { ...catalog, activeGroupId: 9 },
    { ...catalog, revision: 0 },
    { ...catalog, url: "https://evil.test" },
    { ...catalog, groups: [] },
    { ...catalog, groups: [catalog.groups[0], catalog.groups[0]] },
  ])("rejects inconsistent response", (value) => {
    expect(validOffersGroupCatalog(value)).toBe(false);
  });
  it("rejects unsafe group URL", () => {
    expect(
      validOffersGroupCatalog({
        ...catalog,
        groups: [{ ...catalog.groups[0], url: "https://evil.test" }],
      }),
    ).toBe(false);
  });
});
