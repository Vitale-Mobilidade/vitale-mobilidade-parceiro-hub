import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsletterContent } from "./newsletter";
async function must<T>(p: PromiseLike<{ data: T; error: unknown }>) {
  const r = await p;
  if (r.error) throw new Error("newsletter_database_failed");
  return r.data;
}
export async function newsletterHistory(db: SupabaseClient, before?: string) {
  const history: {
    created_at: string;
    payload: { content: NewsletterContent };
  }[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = db
      .from("newsletter_campaigns")
      .select("created_at,payload")
      .in("status", ["sent", "submitted"])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 499);
    if (before) query = query.lt("edition_day", before);
    const rows = await must(query);
    history.push(...(rows ?? []));
    if ((rows?.length ?? 0) < 500) break;
  }
  return history;
}
