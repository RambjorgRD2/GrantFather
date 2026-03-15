
-- Table to store onboarding data for organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  -- Step 1: Organization details
  name text not null,
  org_type text not null,
  members_count integer not null default 0 check (members_count >= 0),
  mission text,
  -- Step 2: Primary contact
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  -- Step 3: Grant needs/interests
  event_types text[] not null default '{}',
  funding_needs text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  -- Status
  onboarding_completed boolean not null default false,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful index
create index if not exists organizations_created_by_idx on public.organizations (created_by);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

-- Secure the table
alter table public.organizations enable row level security;

-- RLS: authenticated users can only access their own rows
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'organizations' and policyname = 'Org: users can view their own organizations'
  ) then
    create policy "Org: users can view their own organizations"
      on public.organizations
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'organizations' and policyname = 'Org: users can insert their own organizations'
  ) then
    create policy "Org: users can insert their own organizations"
      on public.organizations
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'organizations' and policyname = 'Org: users can update their own organizations'
  ) then
    create policy "Org: users can update their own organizations"
      on public.organizations
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'organizations' and policyname = 'Org: users can delete their own organizations'
  ) then
    create policy "Org: users can delete their own organizations"
      on public.organizations
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;
