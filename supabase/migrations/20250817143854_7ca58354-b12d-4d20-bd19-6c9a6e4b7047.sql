-- Fix the create_organization_admin_role function
DROP FUNCTION IF EXISTS create_organization_admin_role CASCADE;

CREATE OR REPLACE FUNCTION public.create_organization_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin'::app_role)
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_organization_admin_role_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_admin_role();

-- Now create test organization for first user
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
) VALUES (
    'Test Organization',
    'volunteer',
    'Test User',
    'test@example.com',
    'Test organization for existing user',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    1,
    false,
    (SELECT id FROM auth.users WHERE deleted_at IS NULL LIMIT 1)
);