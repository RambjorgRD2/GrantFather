-- Create organization for second user
WITH second_user AS (
  SELECT id, email FROM auth.users WHERE deleted_at IS NULL 
  AND id NOT IN (SELECT user_id FROM user_roles)
  LIMIT 1
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
  FROM second_user
  WHERE id IS NOT NULL
  RETURNING id, created_by
)
INSERT INTO user_roles (user_id, organization_id, role)
SELECT created_by, id, 'admin'::app_role FROM new_org
WHERE created_by IS NOT NULL;