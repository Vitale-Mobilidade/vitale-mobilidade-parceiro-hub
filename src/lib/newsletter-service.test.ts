import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
import type {SupabaseClient} from "@supabase/supabase-js";
const {createClient}=vi.hoisted(()=>({createClient:vi.fn()}));
vi.mock("@supabase/supabase-js",()=>({createClient}));
vi.mock("./newsletter-sources.server",()=>({automaticNewsletter:vi.fn()}));
import {newsletterTick,newsletterAdmin,processNewsletterCampaign,type NewsletterSettings} from "./newsletter-service.server";
import {ResendNewsletter} from "./resend-newsletter.server";
const id="00000000-0000-0000-0000-000000000001";
const content={subject:"Vitale",intro:"Destaques",articles:[{title:"Artigo",url:"https://vitalemobilidade.com/conteudos/mock"}],bike:{title:"V9",url:"https://vitalemobilidade.com/radar/v9_max"},videos:[{title:"Vídeo",url:"https://www.youtube.com/watch?v=abc"}]};
const config:NewsletterSettings={enabled:true,from_email:"newsletter@news.vitalemobilidade.com",reply_to:"guilherme@hotpipe.com.br",segments:{general:id},last_error:null};
const campaign={id,edition_day:"2026-10-09",segment:"general" as const,status:"syncing",payload:{content},resend_id:null};
const json=(body:unknown)=>new Response(JSON.stringify(body));
function fakeDb(withRecipient=false) {
 const updates:{table:string;change:Record<string,unknown>}[]=[];let synced=false;
 const recipient={id,person_name:"Mock",email:"mock@example.com",resend_contact_id:id,consent_at:"2026-10-07T12:00:00Z",synced:false};
 const from=vi.fn((table:string)=>({update:(change:Record<string,unknown>)=>{
  updates.push({table,change});if(table==="newsletter_recipients" && change.synced===true)synced=true;
  const chain={eq:()=>chain,then:(resolve:(x:unknown)=>unknown)=>Promise.resolve({data:null,error:null}).then(resolve)};return chain;
 }}));
 const rpc=vi.fn((name:string)=>Promise.resolve({data:name==="newsletter_renew"?true:name==="newsletter_live_recipients"?(withRecipient?[{...recipient,synced}]:[]):null,error:null}));
 return {db:{from,rpc} as unknown as SupabaseClient,updates};
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("SUPABASE_URL","https://example.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","synthetic-only");});
afterEach(()=>{vi.unstubAllEnvs();});
describe("newsletter authorization and dispatch recovery",()=>{
 it("rejects unsigned worker requests before database access",async()=>{
  expect((await newsletterTick(new Request("https://example.invalid",{method:"POST"}))).status).toBe(403);
  expect(createClient).not.toHaveBeenCalled();
 });
 it("rejects an invalid scheduler signature before claiming the queue",async()=>{
  const rpc=vi.fn().mockResolvedValue({data:false,error:null});createClient.mockReturnValue({rpc});
  const request=new Request("https://example.invalid",{method:"POST",headers:{"x-worker-signature":"bad","x-worker-issued-at":"1791403200"}});
  expect((await newsletterTick(request)).status).toBe(403);expect(rpc).toHaveBeenCalledTimes(1);
 });
 it("prevents a content editor from accessing newsletter administration",async()=>{
  const maybeSingle=vi.fn().mockResolvedValue({data:{role:"content",active:true},error:null});
  const chain={select:()=>chain,eq:()=>chain,maybeSingle};
  createClient.mockReturnValue({auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id}},error:null})},from:vi.fn().mockReturnValue(chain)});
  const response = await newsletterAdmin(new Request("https://example.invalid", { headers: { Authorization: "Bearer synthetic" } }));
  expect(response.status).toBe(403);
 });
 it("reconciles an already submitted campaign without another send",async()=>{
  const {db,updates}=fakeDb();const request=vi.fn().mockResolvedValue(json({status:"sent",sent_at:"2026-10-09T13:05:00Z"}));
  await processNewsletterCampaign(db,new ResendNewsletter("test",request,0),config,{...campaign,status:"submitting",resend_id:id},"lease");
  expect(request).toHaveBeenCalledTimes(1);expect(request.mock.calls[0][1].method).toBe("GET");expect(updates.some(x=>x.change.status==="sent")).toBe(true);
 });
 it("blocks unknown creation outcomes instead of creating a second broadcast",async()=>{
  const {db,updates}=fakeDb();const request=vi.fn();
  await processNewsletterCampaign(db,new ResendNewsletter("test",request,0),config,{...campaign,status:"creating"},"lease");
  expect(request).not.toHaveBeenCalled();expect(updates.some(x=>x.change.status==="uncertain")).toBe(true);expect(updates.some(x=>x.table==="newsletter_settings" && x.change.enabled===false)).toBe(true);
 });
 it("pauses after a lost create response and keeps the frozen edition for reconciliation",async()=>{
  const {db,updates}=fakeDb(true);const contact={id,email:"mock@example.com",first_name:"Mock",unsubscribed:false};
  const request=vi.fn(async (url:string,init:RequestInit)=>{
   if(url.endsWith(`/segments/${id}`))return json({id,name:"Vitale newsletter · general"});
   if(url.includes("/contacts/mock%40example.com"))return json(contact);
   if(url.includes(`/segments/${id}/contacts`))return json({data:[contact],has_more:false});
   if(url.endsWith("/broadcasts") && init.method==="POST")throw new Error("lost response");
   return json({id});
  });
  await expect(processNewsletterCampaign(db,new ResendNewsletter("test",request as typeof fetch,0),config,{...campaign},"lease")).rejects.toThrow("resend_network");
  expect(request.mock.calls.filter(([u,i])=>u.endsWith("/broadcasts") && i.method==="POST")).toHaveLength(1);
  expect(updates.some(x=>x.change.status==="creating")).toBe(true);expect(updates.some(x=>x.change.status==="uncertain")).toBe(true);expect(updates.some(x=>x.change.enabled===false)).toBe(true);
 });
});
