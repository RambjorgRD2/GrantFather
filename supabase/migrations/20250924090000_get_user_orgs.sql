-- Create performant indexes (idempotent)
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_org_id on public.user_roles(organization_id);

-- Stable RPC to fetch a user's organizations with role
create or replace function public.get_user_orgs(p_user_id uuid)
returns table (
  organization_id uuid,
  name text,
  logo_url text,
  onboarding_completed boolean,
  role text
)
language sql
security definer
set search_path = public
as $$
  select
    o.id as organization_id,
    o.name,
    o.logo_url,
    coalesce(o.onboarding_completed, false) as onboarding_completed,
    ur.role
  from public.user_roles ur
  join public.organizations o on o.id = ur.organization_id
  where ur.user_id = p_user_id
$$;

-- Allow authenticated users to execute
revoke all on function public.get_user_orgs(uuid) from public;
grant execute on function public.get_user_orgs(uuid) to authenticated;

