import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "admin", failed: false }));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => ReactNode }) =>
    children(state.role),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
  useQuery: () => ({
    data: state.failed
      ? undefined
      : {
          url: "https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t",
          revision: 1,
        },
    isError: state.failed,
    isPending: false,
  }),
}));
import AdminOffersGroup from "./AdminOffersGroup";
beforeEach(() => {
  state.role = "admin";
  state.failed = false;
});
describe("offers admin", () => {
  it("shows the saved destination and labelled field", () => {
    const html = renderToStaticMarkup(<AdminOffersGroup />);
    expect(html).toContain('for="offers-group-url"');
    expect(html).toContain("Destino salvo:");
    expect(html).toContain("B69yQkILBc63Nq3x62iQjH");
    expect(html).toContain("Salvar convite");
  });
  it.each(["content", "operation"])("does not expose form to %s", (role) => {
    state.role = role;
    const html = renderToStaticMarkup(<AdminOffersGroup />);
    expect(html).not.toContain("<input");
    expect(html).toContain("Somente administradores");
  });
  it("blocks edits on failed load without presenting fallback as saved", () => {
    state.failed = true;
    const html = renderToStaticMarkup(<AdminOffersGroup />);
    expect(html).toContain("Não foi possível carregar");
    expect(html).not.toContain("Destino salvo:");
    expect(html).not.toContain("B69yQkILBc63Nq3x62iQjH");
    expect(html).toContain('disabled=""');
  });
});
