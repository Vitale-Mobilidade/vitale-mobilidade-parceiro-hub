import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Worker identity comes from the readable membership table; credentials remain private to SQL. */
export async function instagramWorkerActor(db: SupabaseClient) {
  const member = await db.from("editorial_admin_memberships").select("user_id")
    .eq("role", "admin").eq("active", true).order("created_at").limit(1).maybeSingle();
  if (member.error || !member.data?.user_id) throw Error("instagram_worker_actor_unavailable");
  return {id: member.data.user_id, role: "admin" as const, email: null};
}
