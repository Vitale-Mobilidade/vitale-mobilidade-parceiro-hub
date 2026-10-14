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
          activeGroupId: 1,
          groups: [
            {
              id: 1,
              name: "Grupo #1",
              url: "https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t",
            },
            {
              id: 2,
              name: "Grupo #2",
              url: "https://chat.whatsapp.com/KwPwrNzMcEyB4uOKAVAWTJ?mode=gi_t",
            },
          ],
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
  it("shows both groups, active badge and labelled actions", () => {
    const html = renderToStaticMarkup(<AdminOffersGroup />);
    expect(html).toContain("Adicionar grupo");
    expect(html).toContain("Grupo #2");
    expect(html).toContain("KwPwrNzMcEyB4uOKAVAWTJ");
    expect(html).toContain('aria-label="Editar Grupo #1"');
    expect(html).toContain('aria-label="Usar Grupo #2 no redirecionamento"');
    expect(html).toContain("Ativo no redirecionamento");
    expect(html).toContain("B69yQkILBc63Nq3x62iQjH");
    expect(html).toContain("Usar no redirecionamento");
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
    expect(html).not.toContain("Ativo no redirecionamento");
    expect(html).not.toContain("B69yQkILBc63Nq3x62iQjH");
    expect(html).toContain('disabled=""');
  });
});
