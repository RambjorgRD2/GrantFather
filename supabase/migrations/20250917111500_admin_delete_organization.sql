-- Creates a secure RPC to delete an organization with server-side permission checks
-- Requires: RLS enabled; grants EXECUTE to authenticated role

create or replace function public.admin_delete_organization(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Verify user has admin-like role for the organization
  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_user
      and ur.organization_id = org_id
      and ur.role in ('admin','owner','superadmin')
  ) then
    raise exception 'insufficient_privilege';
  end if;

  -- Delete dependent rows first (extend as needed for your schema)
  delete from public.user_roles where organization_id = org_id;
  -- Example: delete from other tables referencing organization_id
  -- delete from public.grant_applications where organization_id = org_id;
  -- delete from public.knowledge_base where organization_id = org_id;

  -- Finally delete the organization
  delete from public.organizations where id = org_id;
end;
$$;

revoke all on function public.admin_delete_organization(uuid) from public;
grant execute on function public.admin_delete_organization(uuid) to authenticated;


