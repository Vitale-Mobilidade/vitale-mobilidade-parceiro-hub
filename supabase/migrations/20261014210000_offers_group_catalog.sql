-- Additive catalog; public redirect contract stays url/revision.
alter table public.offers_group_settings
  add column groups jsonb not null default '[]'::jsonb,
  add column active_group_id integer not null default 1;
update public.offers_group_settings set groups = jsonb_build_array(
  jsonb_build_object('id',1,'name','Grupo #1','url','https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t'),
  jsonb_build_object('id',2,'name','Grupo #2','url','https://chat.whatsapp.com/KwPwrNzMcEyB4uOKAVAWTJ?mode=gi_t')
);
-- Preserve any invitation changed between releases, never silently reset production.
update public.offers_group_settings set active_group_id = case
  when url = groups->0->>'url' then 1 when url = groups->1->>'url' then 2 else 3 end;
update public.offers_group_settings set groups = groups || jsonb_build_array(jsonb_build_object('id',3,'name','Grupo atual','url',url)) where active_group_id=3;
revoke select on public.offers_group_settings from anon, authenticated;
grant select (id,url,revision) on public.offers_group_settings to anon, authenticated;

create or replace function public.manage_offers_groups(
  p_action text default 'get', p_revision integer default null,
  p_group_id integer default null, p_name text default null, p_url text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare current public.offers_group_settings; previous jsonb; item jsonb; next_id integer; next_groups jsonb;
begin
  if not exists (select 1 from public.editorial_admin_memberships where user_id=auth.uid() and active and role='admin') then
    raise exception 'Somente administradores podem gerenciar os grupos.' using errcode='42501';
  end if;
  if p_action is null or p_action not in ('get','save','activate') then
    raise exception 'Ação inválida.' using errcode='22023';
  end if;
  select * into current from public.offers_group_settings where id=true for update;
  if not found then raise exception 'Configuração indisponível.'; end if;
  if p_action <> 'get' then
    if current.revision is distinct from p_revision then
      raise exception 'Os grupos mudaram. Recarregue antes de salvar.' using errcode='40001';
    end if;
    previous=jsonb_build_object('groups',current.groups,'active_group_id',current.active_group_id,'url',current.url);
    if p_group_id is not null then
      select g into item from jsonb_array_elements(current.groups) g where (g->>'id')::integer=p_group_id;
      if item is null then raise exception 'Grupo não encontrado.' using errcode='22023'; end if;
    end if;
    if p_action='activate' then
      if p_group_id is null then raise exception 'Selecione um grupo.' using errcode='22023'; end if;
      current.active_group_id=p_group_id; current.url=item->>'url';
    else
      if p_name is null or length(btrim(p_name)) not between 1 and 80 then
        raise exception 'Informe um nome entre 1 e 80 caracteres.' using errcode='22023';
      end if;
      if p_url is null or p_url !~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]{22}([?]mode=gi_t)?$' then
        raise exception 'Informe um convite válido de chat.whatsapp.com.' using errcode='22023';
      end if;
      if exists(select 1 from jsonb_array_elements(current.groups) g where split_part(g->>'url','?',1)=split_part(p_url,'?',1) and (p_group_id is null or (g->>'id')::integer<>p_group_id)) then
        raise exception 'Este convite já está cadastrado em outro grupo.' using errcode='22023';
      end if;
      if p_group_id is null then
        select coalesce(max((g->>'id')::integer),0)+1 into next_id from jsonb_array_elements(current.groups) g;
        current.groups=current.groups || jsonb_build_array(jsonb_build_object('id',next_id,'name',btrim(p_name),'url',p_url));
      else
        select jsonb_agg(case when (g->>'id')::integer=p_group_id then jsonb_build_object('id',p_group_id,'name',btrim(p_name),'url',p_url) else g end order by ord) into next_groups
        from jsonb_array_elements(current.groups) with ordinality as entries(g,ord);
        current.groups=next_groups;
        if current.active_group_id=p_group_id then current.url=p_url; end if;
      end if;
    end if;
    update public.offers_group_settings set groups=current.groups, active_group_id=current.active_group_id,url=current.url,revision=revision+1 where id=true returning * into current;
    insert into public.editorial_audit_logs(actor,action,entity_type,entity_id,detail)
    values(auth.uid(),'offers_group_'||p_action,'offers_group_settings','true',jsonb_build_object('before',previous,'after',jsonb_build_object('groups',current.groups,'active_group_id',current.active_group_id,'url',current.url),'revision',current.revision));
  end if;
  return jsonb_build_object('url',current.url,'revision',current.revision,'groups',current.groups,'activeGroupId',current.active_group_id);
end;
$$;
revoke all on function public.manage_offers_groups(text,integer,integer,text,text) from public,anon;
grant execute on function public.manage_offers_groups(text,integer,integer,text,text) to authenticated;

-- Old frontend remains usable during deployment and rollback; edits the active item.
create or replace function public.update_offers_group_url(p_url text,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb; active_item jsonb;
begin
  state=public.manage_offers_groups('get');
  select g into active_item from jsonb_array_elements(state->'groups') g where (g->>'id')::integer=(state->>'activeGroupId')::integer;
  state=public.manage_offers_groups('save',p_revision,(state->>'activeGroupId')::integer,active_item->>'name',p_url);
  return jsonb_build_object('url',state->>'url','revision',(state->>'revision')::integer);
end;
$$;
