-- Create organizations for existing authenticated users
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