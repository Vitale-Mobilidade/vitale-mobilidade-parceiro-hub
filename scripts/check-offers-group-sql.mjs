// Local PostgreSQL rehearsal. Run with a separately installed PGlite module path.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.argv[2]);
const db = new PGlite();
const original = 'https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t';
const changed = 'https://chat.whatsapp.com/DnYGmcdvGiN4GtWLaEreft';
await db.exec(`create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.editorial_admin_memberships(user_id uuid, active boolean, role text);
create table public.editorial_audit_logs(actor uuid, action text, entity_type text, entity_id text, detail jsonb);
insert into public.editorial_admin_memberships values
('00000000-0000-0000-0000-000000000001',true,'admin'),
('00000000-0000-0000-0000-000000000002',true,'content'),
('00000000-0000-0000-0000-000000000003',false,'admin'),
('00000000-0000-0000-0000-000000000004',true,'operation');`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261014190000_offers_group_settings.sql', import.meta.url),'utf8'));
assert.equal((await db.query('select url from offers_group_settings')).rows[0].url, original);
await db.exec('set role anon');
assert.equal((await db.query('select url from offers_group_settings')).rows[0].url, original);
await assert.rejects(db.query('update offers_group_settings set revision=2'));
await assert.rejects(db.query('select update_offers_group_url($1,1)',[changed]));
await db.exec('reset role; set role authenticated');
for (const id of [2,3,4,5]) {
 await db.query("select set_config('test.uid',$1,false)", [`00000000-0000-0000-0000-00000000000${id}`]);
 await assert.rejects(db.query('select update_offers_group_url($1,1)',[changed]), /Somente administradores/);
}
await db.query("select set_config('test.uid',$1,false)", ['00000000-0000-0000-0000-000000000001']);
await assert.rejects(db.query('update offers_group_settings set revision=2'));
await assert.rejects(db.query('select update_offers_group_url($1,1)',['https://evil.test']), /convite válido/);
const result = (await db.query('select update_offers_group_url($1,1) as result',[changed])).rows[0].result;
assert.deepEqual(result, {url: changed, revision: 2});
await assert.rejects(db.query('select update_offers_group_url($1,1)',[original]), /Recarregue/);
await db.exec('reset role');
const audit = (await db.query('select * from editorial_audit_logs')).rows;
assert.equal(audit.length, 1);
assert.deepEqual(audit[0].detail, {before:original,after:changed,revision:2});
assert.equal((await db.query('select url from offers_group_settings')).rows[0].url, changed);
await db.close();
console.log('Pass: migration, public read, write denial, roles, validation, revision conflict and atomic audit.');
