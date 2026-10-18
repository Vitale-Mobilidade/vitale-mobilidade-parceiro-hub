// Run with PGLITE_MODULE pointing at the installed local runtime; no network or production database.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath)
  throw new Error(
    "Set PGLITE_MODULE to the local @electric-sql/pglite/dist/index.js",
  );
const { PGlite } = await import(pathToFileURL(modulePath).href);
const { pgcrypto } = await import(
  pathToFileURL(modulePath.replace(/index\.js$/, "contrib/pgcrypto.js")).href
);
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec(readFileSync("docs/qa/newsletter/stubs.sql", "utf8"));
  await db.exec(
    "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);",
  );
  for (const f of [
    "20260925200500_newsletter_interest.sql",
    "20261007195000_newsletter_resend.sql",
    "20261007233000_newsletter_monday_thursday.sql",
    "20261008130000_newsletter_drafts.sql",
    "20261008171000_newsletter_0630.sql",
    "20261011120000_newsletter_advance_drafts.sql",
    "20261018170000_newsletter_three_weekly.sql",
    "20261018171000_newsletter_recovery_prompt.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(
    `INSERT INTO editorial_admin_memberships VALUES('00000000-0000-4000-8000-000000000001','admin',true); INSERT INTO newsletter_subscriptions(person_name,email,consent_text,consent_version) VALUES('Synthetic','qa@example.invalid','test','v2'); SELECT newsletter_set_enabled(true,'00000000-0000-4000-8000-000000000001');`,
  );
  const token = (await db.query("SELECT newsletter_acquire() AS token")).rows[0]
    .token;
  for (const [i, day] of [
    "2026-10-19",
    "2026-10-21",
    "2026-10-23",
    "2026-10-26",
  ].entries()) {
    const invoke = (clock) =>
      db.query(
        "SELECT newsletter_form_campaign($1,'general',$2::jsonb,$3,$4,$5::timestamptz) AS id",
        [day, "{}", `edition-${i}`, token, clock],
      );
    for (const time of ["09:29:59", "11:30:00"])
      await assert.rejects(invoke(`${day}T${time}Z`), /outside_window/);
    const id = (await invoke(`${day}T09:30:00Z`)).rows[0].id;
    assert.ok(id, day);
    assert.equal(
      (await invoke(`${day}T09:35:00Z`)).rows[0].id,
      id,
      "idempotent edition",
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM newsletter_recipients WHERE campaign_id=$1",
          [id],
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "UPDATE newsletter_campaigns SET status='sent',submitted_at=$2::timestamptz WHERE id=$1",
      [id, `${day}T11:25:00Z`],
    );
  }
  for (const day of ["2026-10-20", "2026-10-22", "2026-10-24", "2026-10-25"])
    await assert.rejects(
      db.query(
        "SELECT newsletter_form_campaign($1,'general','{}','bad',$2,$3)",
        [day, token, `${day}T09:30:00Z`],
      ),
      /outside_window/,
    );
  const access = (
    await db.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid='newsletter_rewrites'::regclass",
    )
  ).rows[0];
  assert.equal(access.relrowsecurity, true);
  for (const role of ["anon", "authenticated"])
    assert.equal(
      (
        await db.query(
          "SELECT has_table_privilege($1,'newsletter_rewrites','SELECT,INSERT,UPDATE,DELETE') AS allowed",
          [role],
        )
      ).rows[0].allowed,
      false,
    );
  await db.exec(
    "INSERT INTO newsletter_drafts(id,content,origin,edition_day,fingerprint) VALUES('00000000-0000-4000-8000-000000000002','{}','agent','2026-10-28','synthetic'); INSERT INTO newsletter_rewrites(draft_id,base_revision,prompt,actor_id) VALUES('00000000-0000-4000-8000-000000000002',1,'Refaça com foco em bikes','00000000-0000-4000-8000-000000000001');",
  );
  await assert.rejects(
    db.exec(
      "INSERT INTO newsletter_rewrites(draft_id,base_revision,prompt,actor_id) SELECT draft_id,base_revision,prompt,actor_id FROM newsletter_rewrites LIMIT 1",
    ),
    /unique/,
  );
  await assert.rejects(
    db.exec("UPDATE newsletter_rewrites SET status='ready'"),
    /check constraint/,
  );
  await db.exec("UPDATE newsletter_settings SET enabled=false;");
  assert.equal(
    (await db.query("SELECT newsletter_dispatch() AS id")).rows[0].id,
    1,
    "paused delivery still processes an explicit pending prompt",
  );
  await db.exec("UPDATE newsletter_rewrites SET status='failed';");
  assert.equal(
    (await db.query("SELECT newsletter_dispatch() AS id")).rows[0].id,
    null,
  );
  console.log(
    "PASS: full migration chain; Mon/Wed/Fri/Mon with 46h recovery floor; window boundaries; recipients/idempotence; private RLS/grants; single active prompt; approved candidate constraint; dispatcher while paused.",
  );
} finally {
  await db.close();
}
