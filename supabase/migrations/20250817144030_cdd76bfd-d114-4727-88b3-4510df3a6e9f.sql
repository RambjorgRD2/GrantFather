-- Remove all conflicting triggers and functions
DROP TRIGGER IF EXISTS create_organization_admin_role_trigger ON organizations;
DROP TRIGGER IF EXISTS ensure_organization_admin_role_trigger ON organizations;
DROP FUNCTION IF EXISTS create_organization_admin_role CASCADE;
DROP FUNCTION IF EXISTS ensure_organization_admin_role CASCADE;

-- Create organizations and roles directly without triggers
WITH first_user AS (
  SELECT id, email FROM auth.users WHERE deleted_at IS NULL LIMIT 1
),
new_org AS (
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
      email || '''s Organization',
      'volunteer',
      email,
      email,
      'Default organization created for existing user',
      ARRAY[]::text[],
      ARRAY[]::text[],
      ARRAY[]::text[],
      1,
      false,
      id
  FROM first_user
  RETURNING id, created_by
)
INSERT INTO user_roles (user_id, organization_id, role)
SELECT created_by, id, 'admin'::app_role FROM new_org;