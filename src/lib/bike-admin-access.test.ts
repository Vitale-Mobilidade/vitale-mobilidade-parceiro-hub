import { describe, expect, it, vi } from "vitest";
import { bikeAdminIdentity } from "../../supabase/functions/_shared/bike-admin-access";
function database(role = "admin", active = true, error: unknown = null) {
  return { user: vi.fn(async () => error ? null : "individual"),
    membership: vi.fn(async () => ({ role, active })) };
}
describe("Acesso individual ao painel de bikes", () => {
  it.each(["admin", "operation"])("aceita %s ativo após verificar JWT no Auth", async role => {
    const db = database(role); expect(await bikeAdminIdentity("signed.jwt.token", db)).toBe("individual");
    expect(db.user).toHaveBeenCalledWith("signed.jwt.token");
  });
  it("não concede operação comercial ao perfil content", async () => {
    expect(await bikeAdminIdentity("signed.jwt.token", database("content"))).toBeNull();
  });
  it("nega associação desativada", async () => {
    expect(await bikeAdminIdentity("signed.jwt.token", database("admin", false))).toBeNull();
  });
  it("JWT inválido não consulta permissões", async () => {
    const db = database("admin", true, new Error("bad jwt"));
    expect(await bikeAdminIdentity("invalid.jwt.token", db)).toBeNull(); expect(db.membership).not.toHaveBeenCalled();
  });
  it("token legado não passa pela autenticação Admin", async () => {
    const db = database(); expect(await bikeAdminIdentity("legacy-panel-token", db)).toBeNull();
    expect(db.user).not.toHaveBeenCalled();
  });
});
