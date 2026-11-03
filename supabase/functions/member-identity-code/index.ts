import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMemberIdentityEmail,sendMemberIdentityWhatsApp } from "../_shared/member-identity-delivery.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({ok:false},405);
  try{
    const raw=await req.text();if(raw.length>1500)return json({ok:false},400);
    const body=JSON.parse(raw||"{}");if(!body||typeof body!=="object"||Array.isArray(body)||!["email","phone"].includes(body.channel))return json({ok:false},400);
    const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");if(!token||token.split(".").length!==3)return json({ok:false},401);
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:authError}=await db.auth.getUser(token);
    if(authError||!userData.user||userData.user.is_anonymous)return json({ok:false},401);
    const resendKey=Deno.env.get("RESEND_API_KEY");const hotpipeKey=Deno.env.get("HOTPIPE_IDENTITY_API_KEY");const templateId=Deno.env.get("HOTPIPE_IDENTITY_TEMPLATE_ID");const variables=(Deno.env.get("HOTPIPE_IDENTITY_CODE_VARIABLES")??"").split(",").map(x=>x.trim()).filter(Boolean);
    if(Deno.env.get("MEMBER_IDENTITY_CODES_ENABLED")==="false" || (body.channel==="email"&&!resendKey) || (body.channel==="phone"&&(!hotpipeKey||!templateId||!variables.length)))return json({ok:false},503);
    let from="";
    if(body.channel==="email"){
      const {data:settings,error}=await db.from("newsletter_settings").select("from_email").eq("singleton",true).maybeSingle();if(error||!settings?.from_email)return json({ok:false},503);from=settings.from_email;
    }
    const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??req.headers.get("cf-connecting-ip")??"unknown";
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip)))).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);
    const {data:challenge,error}=await db.rpc("member_identity_service",{p_action:"start",p_actor:userData.user.id,p_payload:{channel:body.channel,phone:body.phone,consent:body.consent,fingerprint}});
    if(error)return json({ok:false},400);
    if(challenge?.ok!==true)return json({ok:false,error:challenge?.error==="identity_rate_limited"?"identity_rate_limited":"identity_delivery_unavailable"},429);
    if(body.channel==="email")await sendMemberIdentityEmail({to:challenge.destination,from,code:challenge.code,key:resendKey!,gatewayKey:Deno.env.get("LOVABLE_API_KEY")});
    else await sendMemberIdentityWhatsApp({phone:challenge.destination,code:challenge.code,id:challenge.id,key:hotpipeKey!,templateId:templateId!,variables});
    const delivered=await db.rpc("member_identity_service",{p_action:"delivered",p_actor:userData.user.id,p_payload:{channel:body.channel,id:challenge.id}});
    if(delivered.error||delivered.data?.ok!==true)return json({ok:false},503);
    return json({ok:true});
  }catch{
    // Never log OTP, phone, email, token, provider response or credentials.
    return json({ok:false},503);
  }
});
