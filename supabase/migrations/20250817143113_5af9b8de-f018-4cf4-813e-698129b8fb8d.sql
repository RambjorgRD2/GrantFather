-- Fix the trigger function to handle the constraint properly
DROP FUNCTION IF EXISTS ensure_organization_admin_role CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_organization_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert admin role for organization creator
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin'::app_role)
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS ensure_organization_admin_role_trigger ON organizations;
CREATE TRIGGER ensure_organization_admin_role_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_organization_admin_role();

-- Now create organizations for existing authenticated users
INSERT INTO organizations (
    name,
    org_type,
    contact_name,
    contact_email,
    mission,
    event_types,
    funding_needs,
    preferred_languages,
    members_count,
    onboarding_completed,
    created_by
) 
SELECT 
    COALESCE(au.raw_user_meta_data->>'organization_name', au.email || '''s Organization') as name,
    'volunteer' as org_type,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as contact_name,
    au.email as contact_email,
    'Default organization created for existing user' as mission,
    ARRAY[]::text[] as event_types,
    ARRAY[]::text[] as funding_needs,
    ARRAY[]::text[] as preferred_languages,
    1 as members_count,
    false as onboarding_completed,
    au.id as created_by
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE au.deleted_at IS NULL 
AND ur.user_id IS NULL;