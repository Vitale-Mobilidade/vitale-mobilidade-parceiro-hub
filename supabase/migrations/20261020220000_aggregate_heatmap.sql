-- Daily aggregate cells only. No raw events, identity, DOM or form data.
create table public.heatmap_daily (
 day date not null,
 path text not null check (length(path) <= 220 and (path = '/' or path ~ '^/(radar|conteudos)(/[a-z0-9_-]+)?$')),
 screen text not null check (screen in ('mobile','tablet','desktop')),
 layout text not null check (layout = '2026-10-v1'),
 kind text not null check (kind in ('view','click','scroll')),
 x smallint not null,
 y smallint not null,
 action text not null check (action in ('other','radar','quiz','content','tools','offer')),
 count bigint not null check (count > 0),
 primary key(day,path,screen,layout,kind,x,y,action),
 check ((kind='click' and x between 0 and 11 and y between 0 and 19)
 or (kind='view' and x=0 and y=0 and action='other')
 or (kind='scroll' and x=0 and y in (25,50,75,100) and action='other'))
);
alter table public.heatmap_daily enable row level security;
revoke all on public.heatmap_daily from public,anon,authenticated;
grant select,insert,update,delete on public.heatmap_daily to service_role;

create function public.record_heatmap_batch(p_path text,p_screen text,p_layout text,p_bins jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare b jsonb; n integer; total integer := 0;
begin
 if jsonb_typeof(p_bins) <> 'array' or jsonb_array_length(p_bins) not between 1 and 20 then
  raise exception 'invalid_batch';
 end if;
 for b in select value from jsonb_array_elements(p_bins) loop
  if jsonb_typeof(b) <> 'object' or (select count(*) from jsonb_object_keys(b)) <> 5
    or not b ?& array['kind','x','y','action','count'] then raise exception 'invalid_bin'; end if;
  n := (b->>'count')::integer;
  if n is null or n not between 1 and 10 or (b->>'kind'<>'click' and n<>1) then raise exception 'invalid_count'; end if;
  total := total+n;
  if total > 60 then raise exception 'batch_too_large'; end if;
  insert into public.heatmap_daily(day,path,screen,layout,kind,x,y,action,count)
  values((now() at time zone 'America/Sao_Paulo')::date,p_path,p_screen,p_layout,b->>'kind',(b->>'x')::smallint,(b->>'y')::smallint,b->>'action',n)
  on conflict(day,path,screen,layout,kind,x,y,action)
  do update set count=public.heatmap_daily.count+excluded.count;
 end loop;
 delete from public.heatmap_daily where day < (now() at time zone 'America/Sao_Paulo')::date-89;
end;
$$;
revoke all on function public.record_heatmap_batch(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_heatmap_batch(text,text,text,jsonb) to service_role;

create function public.admin_heatmap(p_path text,p_screen text,p_layout text,p_days integer)
returns jsonb language sql stable security invoker set search_path='' as $$
 with scoped as (
 select kind,x,y,action,sum(count)::bigint as count from public.heatmap_daily
 where path=p_path and screen=p_screen and layout=p_layout
 and day between (now() at time zone 'America/Sao_Paulo')::date-least(90,greatest(1,p_days))+1 and (now() at time zone 'America/Sao_Paulo')::date
 group by kind,x,y,action
 ) select coalesce(jsonb_agg(to_jsonb(scoped) order by kind,y,x,action),'[]'::jsonb) from scoped;
$$;
revoke all on function public.admin_heatmap(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_heatmap(text,text,text,integer) to service_role;
