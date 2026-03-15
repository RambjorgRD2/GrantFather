-- Create organizations manually one by one
WITH user_data AS (
  SELECT id, email, raw_user_meta_data
  FROM auth.users 
  WHERE deleted_at IS NULL
  LIMIT 1
)
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
    COALESCE(ud.raw_user_meta_data->>'organization_name', ud.email || '''s Organization'),
    'volunteer',
    COALESCE(ud.raw_user_meta_data->>'full_name', ud.email),
    ud.email,
    'Default organization created for existing user',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    1,
    false,
    ud.id
FROM user_data ud;