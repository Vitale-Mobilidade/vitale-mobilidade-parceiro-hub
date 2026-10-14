-- Apply only after authorized production release. Singleton public invitation only.
create table public.offers_group_settings (
  id boolean primary key default true check (id),
  url text not null check (url ~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]{22}([?]mode=gi_t)?$'),
  revision integer not null default 1 check (revision > 0)
);
insert into public.offers_group_settings (url)
values ('https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t');
alter table public.offers_group_settings enable row level security;
revoke all on public.offers_group_settings from anon, authenticated;
grant select on public.offers_group_settings to anon, authenticated;
create policy offers_group_public_read on public.offers_group_settings for select to anon, authenticated using (true);

create or replace function public.update_offers_group_url(p_url text, p_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous public.offers_group_settings; result public.offers_group_settings;
begin
  if not exists (select 1 from public.editorial_admin_memberships where user_id = auth.uid() and active and role = 'admin') then
    raise exception 'Somente administradores podem alterar o convite.' using errcode = '42501';
  end if;
  if p_url is null or p_url !~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]{22}([?]mode=gi_t)?$' then
    raise exception 'Informe um convite válido de chat.whatsapp.com.' using errcode = '22023';
  end if;
  select * into previous from public.offers_group_settings where id = true for update;
  if not found or previous.revision is distinct from p_revision then
    raise exception 'O convite mudou. Recarregue antes de salvar.' using errcode = '40001';
  end if;
  update public.offers_group_settings set url = p_url, revision = revision + 1 where id = true returning * into result;
  insert into public.editorial_audit_logs (actor, action, entity_type, entity_id, detail)
  values (auth.uid(), 'offers_group_url_updated', 'offers_group_settings', 'true',
    jsonb_build_object('before', previous.url, 'after', result.url, 'revision', result.revision));
  return jsonb_build_object('url', result.url, 'revision', result.revision);
end;
$$;
revoke all on function public.update_offers_group_url(text, integer) from public, anon;
grant execute on function public.update_offers_group_url(text, integer) to authenticated;
