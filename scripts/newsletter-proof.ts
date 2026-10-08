// Manual proof run (no send): bun scripts/newsletter-proof.ts from repo root.
// Always writes drafts + reviewer issues to artifacts/newsletter-diagnostics/.
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { automaticNewsletter } from "../src/lib/newsletter-sources.server";
import { renderResendNewsletter } from "../src/lib/newsletter";
import { writeFileSync } from "node:fs";
mkdirSync("artifacts/newsletter-diagnostics", { recursive: true });
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: next, error: e1 } = await db.rpc("newsletter_next_edition_number");
if (e1) throw new Error("next_number_failed");
const { data: rows, error: e2 } = await db.from("newsletter_campaigns").select("created_at,payload").in("status", ["sent","submitted"]).order("created_at",{ascending:false}).limit(500);
if (e2) throw new Error("history_failed");
let calls = 0; const meta: any[] = [];
const orig = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (i: any, init?: any) => { const u = String(i instanceof Request ? i.url : i); const t = Date.now(); const r = await orig(i, init); if (u.includes("ai.gateway")) { calls++; meta.push({ status: r.status, ms: Date.now()-t }); } return r; }) as any;
console.log("edition", next, "history", rows!.length, "weekday", new Date().getUTCDay());
try {
  const diagnostics: unknown[] = [];
  const dump = () => writeFileSync(`artifacts/newsletter-diagnostics/${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify({ editionNumber: next, calls: meta, diagnostics }, null, 2));
  process.on("exit", dump);
  const ed = await automaticNewsletter(new Date().getUTCDay(), undefined, rows!.map((r: any) => r.payload.content), next as number, (e) => diagnostics.push(e));
  const r = renderResendNewsletter(ed.content);
  writeFileSync("artifacts/newsletter-agent-refined-proof.html", r.html);
  writeFileSync("artifacts/newsletter-agent-refined-proof.json", JSON.stringify({ generatedAt: new Date().toISOString(), editionNumber: next, reviewerApproved: true, aiCalls: calls, calls: meta, fingerprint: ed.fingerprint, subject: r.subject ?? ed.content.subject, content: ed.content, text: r.text }, null, 2));
  console.log("OK subject:", r.subject ?? ed.content.subject, "calls", JSON.stringify(meta), "utm", (r.html.match(/utm_source=/g)||[]).length);
} catch (e) { console.log("FAIL", e instanceof Error ? e.message : "unknown", "calls", JSON.stringify(meta)); }
