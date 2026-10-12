import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(
  "create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);",
);
await db.exec(
  readFileSync(
    "supabase/migrations/20261008130000_newsletter_drafts.sql",
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    "supabase/migrations/20261011120000_newsletter_advance_drafts.sql",
    "utf8",
  ),
);
await db.exec(
  "insert into newsletter_drafts(content,origin,edition_day,fingerprint) values ('{}','agent','2026-10-12','sources')",
);
await assert.rejects(() =>
  db.exec(
    "insert into newsletter_drafts(content,origin,edition_day,fingerprint) values ('{}','agent','2026-10-12','other')",
  ),
);
await assert.rejects(() =>
  db.exec(
    "insert into newsletter_drafts(content,origin,edition_day) values ('{}','agent','2026-10-15')",
  ),
);
await db.exec(
  "insert into newsletter_preparations values ('2026-10-12',1,now(),'mock_error')",
);
await assert.rejects(() =>
  db.exec("update newsletter_preparations set attempts=4"),
);
await db.exec("set role anon");
await assert.rejects(() => db.query("select * from newsletter_preparations"));
await assert.rejects(() => db.query("select * from newsletter_drafts"));
await db.exec("reset role; set role authenticated");
await assert.rejects(() =>
  db.exec(
    "insert into newsletter_drafts(content,origin) values ('{}','agent')",
  ),
);
await db.close();
console.log(
  "Advance draft SQL: unique edition, required fingerprint and private access passed",
);
