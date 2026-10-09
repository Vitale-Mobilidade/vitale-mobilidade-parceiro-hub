// Use an existing local PGlite installation; no production database is accessed.
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = process.cwd();
const db = new PGlite();
await db.exec(readFileSync(root + "/tests/newsletter-people.sql", "utf8"));
await db.exec(
  readFileSync(
    root + "/supabase/migrations/20261009010000_newsletter_people.sql",
    "utf8",
  ),
);
await db.exec(`insert into newsletter_subscriptions(person_name,email) select 'Pessoa '||i,'p'||i||'@example.test' from generate_series(1,30)i;
update newsletter_subscriptions set consent_version='v1' where email='p1@example.test';
update newsletter_subscriptions set status='unsubscribed' where email='p2@example.test';
insert into newsletter_campaigns values ('11111111-1111-4111-8111-111111111111','test');
insert into newsletter_recipients select '11111111-1111-4111-8111-111111111111',id,false from newsletter_subscriptions;
update newsletter_recipients set excluded=true where subscription_id=(select id from newsletter_subscriptions where email='p30@example.test');`);
const report = async (filter = "all", campaign = null, page = 0) =>
  (
    await db.query("select newsletter_people($1,$2,$3) r", [
      filter,
      campaign,
      page,
    ])
  ).rows[0].r;
assert.equal((await report()).total, 30);
assert.equal((await report()).rows.length, 25);
assert.equal((await report("all", null, 1)).rows.length, 5);
assert.equal((await report("eligible")).total, 28);
assert.equal((await report("legacy")).total, 1);
assert.equal((await report("suppressed")).total, 1);
const campaign = "11111111-1111-4111-8111-111111111111";
assert.equal((await report("recipients", campaign)).total, 29);
assert.equal((await report("unknown", campaign)).total, 29);
await db.query(
  "select newsletter_record_event('evt1','email.delivered',array['p3@example.test'],null,now(),'test','email1')",
);
await db.query(
  "select newsletter_record_event('evt1','email.delivered',array['p3@example.test'],null,now(),'test','email1')",
);
assert.equal((await report("delivered", campaign)).total, 1);
await db.query(
  "select newsletter_record_event('evt2','email.failed',array['p4@example.test'],null,now(),'test','email2')",
);
assert.equal((await report("failed", campaign)).total, 1);
assert.equal((await report("unknown", campaign)).total, 27);
assert.equal((await report("eligible")).total, 28);
await assert.rejects(() => report("delivered"));
await assert.rejects(() => report("all", null, -1));
await db.exec("set role anon");
await assert.rejects(() => report());
await assert.rejects(() =>
  db.query("select recipient_emails from newsletter_webhook_events"),
);
await db.exec("reset role;set role authenticated");
await assert.rejects(() => report());
await db.exec("reset role;set role service_role");
assert.equal((await report()).total, 30);
console.log(
  "SQL: counts, pagination, consent, exclusions, delivery mapping, replay, unknown history, invalid filters and private grants passed",
);
await db.close();
