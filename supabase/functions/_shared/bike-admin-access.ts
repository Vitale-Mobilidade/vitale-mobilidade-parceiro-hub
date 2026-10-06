/** Individual Admin access to the existing bike writer; no new role or permission is created. */
export async function bikeAdminIdentity(token: string, verify: {
  user: (token: string) => Promise<string | null>;
  membership: (id: string) => Promise<{ role: string; active: boolean } | null>;
}): Promise<string | null> {
  if (token.length > 8192 || token.split(".").length !== 3) return null;
  const id = await verify.user(token);
  if (!id) return null;
  const member = await verify.membership(id);
  return member?.active && ["admin", "operation"].includes(member.role) ? id : null;
}
