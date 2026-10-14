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

// Rehearse both known active invitations without changing the eventual fixture.
for (const [activeId, seedUrl] of [[1, original], [2, 'https://chat.whatsapp.com/KwPwrNzMcEyB4uOKAVAWTJ?mode=gi_t']]) {
 await db.exec('begin');
 await db.query('update offers_group_settings set url=$1',[seedUrl]);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261014210000_offers_group_catalog.sql', import.meta.url),'utf8'));
 assert.equal((await db.query('select active_group_id from offers_group_settings')).rows[0].active_group_id,activeId);
 await db.exec('rollback');
}
// Apply catalog migration with an unknown current invitation to exercise preservation.
await db.exec(readFileSync(new URL('../supabase/migrations/20261014210000_offers_group_catalog.sql', import.meta.url),'utf8'));
await db.exec('set role anon');
assert.equal((await db.query('select url,revision from offers_group_settings')).rows[0].url, changed);
await assert.rejects(db.query('select groups from offers_group_settings'));
await assert.rejects(db.query("select manage_offers_groups('get')"));
await db.exec('reset role; set role authenticated');
for (const id of [2,3,4,5]) {
 await db.query("select set_config('test.uid',$1,false)", [`00000000-0000-0000-0000-00000000000${id}`]);
 await assert.rejects(db.query("select manage_offers_groups('get')"), /Somente administradores/);
}
await db.query("select set_config('test.uid',$1,false)", ['00000000-0000-0000-0000-000000000001']);
async function call(action,rev=null,id=null,name=null,url=null) {
 return (await db.query('select manage_offers_groups($1,$2,$3,$4,$5) as state',[action,rev,id,name,url])).rows[0].state;
}
let state=await call('get');
assert.equal(state.activeGroupId,3);
assert.equal(state.groups.length,3);
assert.equal(state.groups[0].url,original);
assert.equal(state.groups[1].url,'https://chat.whatsapp.com/KwPwrNzMcEyB4uOKAVAWTJ?mode=gi_t');
state=await call('activate',state.revision,2);
assert.equal(state.url,state.groups[1].url);
const previousRevision=state.revision;
state=await call('save',state.revision,null,'Grupo novo','https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv');
assert.equal(state.groups.length,4);
assert.equal(state.activeGroupId,2);
assert.equal(state.url,state.groups[1].url);
await assert.rejects(call('activate',previousRevision,1),/Recarregue/);
await assert.rejects(call('save',state.revision,null,'Duplicado',original.split('?')[0]),/já está cadastrado/);
await assert.rejects(call('save',state.revision,2,'Nome','https://evil.test'),/convite válido/);
await assert.rejects(call('save',state.revision,2,'   ',original),/nome entre/);
await assert.rejects(call('activate',state.revision,900),/não encontrado/);
await assert.rejects(call('activate',state.revision),/Selecione/);
await assert.rejects(call('invalid',state.revision),/Ação inválida/);
state=await call('save',state.revision,2,'Grupo #2 atualizado','https://chat.whatsapp.com/ZyXwVuTsRqPoNmLkJiHgFe');
assert.equal(state.url,'https://chat.whatsapp.com/ZyXwVuTsRqPoNmLkJiHgFe');
assert.equal(state.groups[1].name,'Grupo #2 atualizado');
state=await call('save',state.revision,1,'Grupo #1 atualizado','https://chat.whatsapp.com/AaBbCcDdEeFfGgHhIiJjKk');
assert.equal(state.url,'https://chat.whatsapp.com/ZyXwVuTsRqPoNmLkJiHgFe');
const old=(await db.query('select update_offers_group_url($1,$2) as state',[original,state.revision])).rows[0].state;
state=await call('get');
assert.equal(old.url,original);
assert.equal(state.groups[1].url,original);
assert.equal(state.url,original);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::integer as n from editorial_audit_logs')).rows[0].n,6);
await db.close();
console.log('Pass: catalog seeds, current preservation, private catalog, role denial, add/edit/activate, URL/name/duplicate validation, conflict, compatibility and audit.');
