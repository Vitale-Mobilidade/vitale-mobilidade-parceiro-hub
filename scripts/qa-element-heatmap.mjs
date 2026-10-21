// Run with HEATMAP_PGLITE_MODULE pointing to a temporary @electric-sql/pglite install.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.HEATMAP_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;');
await db.exec(await readFile(new URL('../supabase/migrations/20261020230000_element_heatmap.sql', import.meta.url),'utf8'));
const bins=JSON.stringify([{kind:'view',x:0,y:0,target:'',count:1},{kind:'click',x:2,y:3,target:'h:1234abcd:0',count:2}]);
const write=()=>db.query('select public.record_heatmap_elements($1,$2,$3,$4,$5::jsonb)', ['/radar','mobile',390,'2026-10-elements-v2',bins]);
for(const role of ['anon','authenticated']) {
 await db.exec(`set role ${role}`);
 await assert.rejects(()=>db.query('select * from public.heatmap_elements_daily'));
 await assert.rejects(write);
 await assert.rejects(()=>db.query("select public.admin_heatmap_elements('/radar','mobile','2026-10-elements-v2',30,390)"));
 await db.exec('reset role');
}
await db.exec('set role service_role');
await write(); await write();
const {rows}=await db.query("select public.admin_heatmap_elements('/radar','mobile','2026-10-elements-v2',30,390) as bins");
assert.equal(rows[0].bins.bins.find(b=>b.kind==='view').count,2);
assert.equal(rows[0].bins.bins.find(b=>b.kind==='click').count,4);
assert.deepEqual((await db.query("select public.admin_heatmap_elements('/radar','desktop','2026-10-elements-v2',30,1440) as bins")).rows[0].bins.bins,[]);
await assert.rejects(()=>db.query("select public.record_heatmap_elements('/admin','mobile',390,'2026-10-elements-v2',$1::jsonb)",[bins]));
await assert.rejects(()=>db.query("select public.record_heatmap_elements('/radar','mobile',390,'2026-10-elements-v2',$1::jsonb)",[JSON.stringify([{kind:'click',x:100,y:0,target:'',count:1}])]));
// A bad later bin rolls back all earlier cells in the same batch.
await assert.rejects(()=>db.query("select public.record_heatmap_elements('/radar','mobile',390,'2026-10-elements-v2',$1::jsonb)",[JSON.stringify([{kind:'click',x:2,y:3,target:'h:1234abcd:0',count:1},{kind:'click',x:100,y:0,target:'',count:1}])]));
assert.equal((await db.query("select count from public.heatmap_elements_daily where kind='click'")).rows[0].count,4);
await db.exec("insert into public.heatmap_elements_daily values (current_date-100,'/','mobile',390,'2026-10-elements-v2','view','',0,0,1)");
await write();
assert.equal((await db.query("select count(*)::integer as n from public.heatmap_elements_daily where day < current_date-90")).rows[0].n,0);
await db.close();
console.log('PostgreSQL QA passed: migration, grants, anonymous/authenticated denials, service-only RPC, atomic upsert/rollback, screen isolation, bounds and retention.');
