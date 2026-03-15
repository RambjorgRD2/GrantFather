-- Backfill profiles for existing users missing rows
-- Safe idempotent migration

begin;

-- Create missing profiles with basic placeholders
insert into public.profiles (user_id, full_name, email, phone, created_at, updated_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  null,
  now(),
  now()
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- Optional: normalize null full_name to a readable fallback
update public.profiles p
set full_name = coalesce(p.full_name, 'Team Member ' || substr(p.user_id::text, 1, 8))
where p.full_name is null;

commit;


