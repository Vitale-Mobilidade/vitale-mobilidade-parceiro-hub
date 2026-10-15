import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AdminOverviewPage } from "../pages/AdminEditorial";
vi.mock("@/components/admin/AdminShell",()=>({AdminShell:({children}:{children:(role:string)=>React.ReactNode})=>children("admin")}));
vi.mock("@tanstack/react-router",()=>({Link:({children,to,params,search}:any)=><a href={params?to.replace("$id",params.id):search?`${to}?video=${search.video}`:to}>{children}</a>,useNavigate:()=>vi.fn()}));
vi.mock("@tanstack/react-query",()=>({useQueryClient:()=>({}),useQuery:({queryKey}:any)=>({data:queryKey[1]==="youtube-status"?{enabled:true,review:2,reviewItems:[{videoId:"abcDEFG1234",articleId:null,retryCapture:true},{videoId:"xyzDEFG1234",articleId:"saved-draft",retryCapture:false}]}:undefined})}));
vi.mock("@/lib/videos.functions",()=>({getSheetVideoCatalog:vi.fn(),safeVideos:vi.fn()}));
vi.mock("@/lib/bikes-discovery.functions",()=>({getBikesDiscovery:vi.fn()}));
vi.mock("@/lib/editorial.functions",()=>({getPublishedArticles:vi.fn()}));
it("oferece ação específica por pendência sem apagar o alerta",()=>{
 const html=renderToStaticMarkup(<AdminOverviewPage/>);
 expect(html).toContain('/admin/conteudos/novo?video=abcDEFG1234');expect(html).toContain('/admin/conteudos/saved-draft');
 expect(html).toContain("A transcrição não foi salva");expect(html).toContain("escolha as bikes");
 expect(html).not.toContain("Consulte Artigos e Logs");
});
