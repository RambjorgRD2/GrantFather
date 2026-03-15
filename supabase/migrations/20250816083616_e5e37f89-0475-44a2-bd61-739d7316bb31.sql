-- Complete data flush - Clear all user data for clean slate
-- Phase 1: Clear public schema tables
DELETE FROM public.grant_applications;
DELETE FROM public.system_prompts;
DELETE FROM public.organization_invitations;
DELETE FROM public.user_roles;
DELETE FROM public.organizations;

-- Phase 2: Clear auth users (this will cascade to remove auth-related data)
DELETE FROM auth.users;

-- Phase 3: Clear scrape cache if needed
DELETE FROM public.scrape_cache;

-- Verify clean state
SELECT 
  'grant_applications' as table_name,
  COUNT(*) as remaining_records
FROM public.grant_applications
UNION ALL
SELECT 
  'system_prompts' as table_name,
  COUNT(*) as remaining_records
FROM public.system_prompts
UNION ALL
SELECT 
  'organization_invitations' as table_name,
  COUNT(*) as remaining_records
FROM public.organization_invitations
UNION ALL
SELECT 
  'user_roles' as table_name,
  COUNT(*) as remaining_records
FROM public.user_roles
UNION ALL
SELECT 
  'organizations' as table_name,
  COUNT(*) as remaining_records
FROM public.organizations
UNION ALL
SELECT 
  'auth.users' as table_name,
  COUNT(*) as remaining_records
FROM auth.users;