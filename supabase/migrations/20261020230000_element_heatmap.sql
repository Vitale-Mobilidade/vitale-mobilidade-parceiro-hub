create table public.heatmap_elements_daily (
 day date not null,
 path text not null check(length(path)<=220 and (path='/' or path ~ '^/(radar|conteudos)(/[a-z0-9_-]+)?$')),
 screen text not null check(screen in ('mobile','tablet','desktop')),
 viewport integer not null check(viewport between 240 and 3840),
 layout text not null check(layout='2026-10-elements-v2'),
 kind text not null check(kind in ('view','click','scroll')),
 target text not null,
 x smallint not null, y smallint not null,
 count bigint not null check(count>0),
 primary key(day,path,screen,viewport,layout,kind,target,x,y),
 check(screen=case when viewport<768 then 'mobile' when viewport<1024 then 'tablet' else 'desktop' end),
 check((kind='click' and target ~ '^([hb]:[a-f0-9]{8}|e:[a-z][a-z0-9_-]{0,63}):[0-9]{1,3}$' and x between 0 and 99 and y between 0 and 99) or (kind='view' and target='' and x=0 and y=0) or (kind='scroll' and target='' and x=0 and y in (25,50,75,100)))
);
alter table public.heatmap_elements_daily enable row level security;
revoke all on public.heatmap_elements_daily from public,anon,authenticated;
grant select,insert,update,delete on public.heatmap_elements_daily to service_role;
create function public.record_heatmap_elements(p_path text,p_screen text,p_viewport integer,p_layout text,p_bins jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare b jsonb; n integer; total integer:=0;
begin
 if jsonb_typeof(p_bins)<>'array' or jsonb_array_length(p_bins) not between 1 and 20 then raise exception 'invalid_batch';end if;
 for b in select value from jsonb_array_elements(p_bins) loop
  if jsonb_typeof(b)<>'object' or (select count(*) from jsonb_object_keys(b))<>5 or not b ?& array['kind','target','x','y','count'] then raise exception 'invalid_bin';end if;
  n:=(b->>'count')::integer;
  if n is null or n not between 1 and 10 or (b->>'kind'<>'click' and n<>1) then raise exception 'invalid_count';end if;
  total:=total+n;if total>60 then raise exception 'batch_too_large';end if;
  insert into public.heatmap_elements_daily values((now() at time zone 'America/Sao_Paulo')::date,p_path,p_screen,p_viewport,p_layout,b->>'kind',b->>'target',(b->>'x')::smallint,(b->>'y')::smallint,n)
  on conflict(day,path,screen,viewport,layout,kind,target,x,y) do update set count=public.heatmap_elements_daily.count+excluded.count;
 end loop;
 delete from public.heatmap_elements_daily where day<(now() at time zone 'America/Sao_Paulo')::date-89;
end;
$$;
revoke all on function public.record_heatmap_elements(text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_heatmap_elements(text,text,integer,text,jsonb) to service_role;
create function public.admin_heatmap_elements(p_path text,p_screen text,p_layout text,p_days integer,p_viewport integer)
returns jsonb language sql stable security invoker set search_path='' as $$
 with scoped as (
 select * from public.heatmap_elements_daily where path=p_path and screen=p_screen and layout=p_layout
 and day between (now() at time zone 'America/Sao_Paulo')::date-least(90,greatest(1,p_days))+1 and (now() at time zone 'America/Sao_Paulo')::date
 ), widths as (select viewport,sum(count) filter(where kind='view') as views from scoped group by viewport),
 chosen as (select case when p_viewport>0 then p_viewport else coalesce((select viewport from widths order by views desc nulls last,viewport limit 1),case p_screen when 'mobile' then 390 when 'tablet' then 820 else 1440 end) end as viewport),
 bins as (select kind,target,x,y,sum(count)::bigint as count from scoped where viewport=(select viewport from chosen) group by kind,target,x,y)
 select jsonb_build_object('viewport',(select viewport from chosen),'viewports',coalesce((select jsonb_agg(viewport order by viewport) from widths),'[]'::jsonb),'bins',coalesce((select jsonb_agg(to_jsonb(bins) order by kind,target,y,x) from bins),'[]'::jsonb));
$$;
revoke all on function public.admin_heatmap_elements(text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_heatmap_elements(text,text,text,integer,integer) to service_role;
